import { XMLParser } from 'fast-xml-parser';
import { createSecRequest } from '../services/leader_disclosures.js';
import { assertSafeKStockV2Environment, isD2Eligible } from './scoring.js';
import { loadSubmissionHistory } from './sec_submission_history.js';
const parser = new XMLParser({ parseTagValue: false, removeNSPrefix: true, ignoreAttributes: false, trimValues: true });
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const value = node => typeof node === 'object' && node !== null ? node.value : node;
function date(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '') || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) throw new Error('Invalid Form 4 date');
  return text;
}
function cik(text) {
  if (!/^\d{1,10}$/.test(text || '')) throw new Error('Invalid SEC CIK');
  return text.padStart(10, '0');
}
export function normalizeForm4(xml, company, filing) {
  const doc = parser.parse(xml)?.ownershipDocument;
  if (!doc || doc.documentType !== '4' || cik(doc.issuer?.issuerCik) !== cik(company.cik)
      || doc.issuer?.issuerTradingSymbol !== company.ticker) throw new Error('Form 4 issuer or document mismatch');
  const owners = array(doc.reportingOwner).map(owner => cik(owner.reportingOwnerId?.rptOwnerCik));
  if (!owners.length) throw new Error('Form 4 owner missing');
  const publishedAt = `${date(filing.filingDate)}T23:59:59-05:00`;
  const evidence = [];
  let excludedCount = array(doc.derivativeTable?.derivativeTransaction).length;
  const rows = array(doc.nonDerivativeTable?.nonDerivativeTransaction);
  rows.forEach((row, index) => {
    const code = row.transactionCoding?.transactionCode;
    if (!['P', 'S'].includes(code) || value(row.securityTitle) !== company.form4SecurityTitle) { excludedCount++; return; }
    const direction = value(row.transactionAmounts?.transactionAcquiredDisposedCode);
    if (direction !== (code === 'P' ? 'A' : 'D')) throw new Error('Form 4 transaction direction mismatch');
    const transactionAt = date(value(row.transactionDate));
    if (transactionAt > filing.filingDate) throw new Error('Form 4 future transaction');
    const shareText = value(row.transactionAmounts?.transactionShares);
    if (!/^\d+(\.\d+)?$/.test(shareText || '')) throw new Error('Invalid Form 4 share count');
    const shares = Number(shareText);
    if (!Number.isFinite(shares) || shares <= 0) throw new Error('Invalid Form 4 share count');
    const planned = ['1', 'true'].includes(String(doc.aff10b5One));
    evidence.push({ id: `sec:form4:${filing.accessionNumber}:${index}`, sourceType: 'filing',
      sourceName: 'SEC EDGAR · Form 4', sourceUrl: filing.url, actorId: `sec:joint:${[...new Set(owners)].sort().join(',')}`,
      actorType: 'insider', companyId: cik(company.cik), ticker: company.ticker, market: 'GLOBAL',
      signalType: 'capital_action', actionType: code === 'P' ? 'increase' : 'reduce', confidence: 1,
      observedAt: publishedAt, publishedAt, transactionAt, transactionCode: code, shares, planned10b51: planned,
      factSummary: `신고 거래일 ${transactionAt}: ${code === 'P' ? '매수' : '매도'} ${shares}주 (코드 ${code}).`,
      inferenceSummary: `${planned ? '10b5-1 계획 거래로 표시되었습니다. ' : ''}시장 또는 사적 거래를 포함하는 신고이며 원문 각주를 확인해야 합니다. 내부자 거래만으로 수익이나 매수 타당성을 보장하지 않습니다.`,
    });
  });
  return { evidence, excludedCount };
}

export function createForm4Refresh({ env = process.env, request, now = () => Date.now() } = {}) {
  const sec = request || createSecRequest({ userAgent: env.KSTOCK_SEC_USER_AGENT });
  let cache, pending;
  return async input => {
    assertSafeKStockV2Environment(env);
    if (env.KSTOCK_V2_FORM4_ENABLED !== 'true') return input;
    if (!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT || '')) throw new Error('SEC User-Agent required');
    const companies = input.companies.filter(x => x.market === 'GLOBAL');
    if (!companies.length) return input;
    if (companies.length > 5) throw new Error('Form 4 limited to 5 companies');
    const maxFilings = Number(env.KSTOCK_V2_FORM4_MAX_FILINGS || 5);
    if (!Number.isInteger(maxFilings) || maxFilings < 1 || maxFilings > 20) throw new Error('Invalid Form 4 filing limit');
    for (const company of companies) {
      cik(company.cik);
      if (!company.form4SecurityTitle || typeof company.form4SecurityTitle !== 'string') throw new Error('Form 4 security title required');
    }
    const key = JSON.stringify([input.analysisDate, companies, maxFilings]);
    const windowStart = new Date(Date.parse(input.analysisDate) - 30 * 86400000).toISOString().slice(0, 10);
    async function collect() {
      const evidence = [];
      let excludedCount = 0;
      let historyFilesRead = 0;
      const reviews = [];
      for (const company of companies) {
        const companyCik = cik(company.cik);
        const history = await loadSubmissionHistory({ request: sec, cik: companyCik, windowStart,
          windowEnd: new Date(Date.parse(input.analysisDate) + 9 * 3600000 - 2 * 86400000).toISOString().slice(0, 10) });
        historyFilesRead += history.historyFilesRead;
        const filings = history.filings
          .filter(f => ['4', '4/A'].includes(f.form))
          .filter(f => date(f.filingDate) >= windowStart)
          .filter(f => isD2Eligible(`${date(f.filingDate)}T23:59:59-05:00`, input.analysisDate));
        if (filings.length > maxFilings) throw new Error('Form 4 history exceeds collection limit; narrow scope before ranking');
        const amendments = filings.filter(f => f.form === '4/A');
        if (amendments.length) {
          for (const filing of amendments) {
            reviews.push({ ticker: company.ticker, market: 'GLOBAL', reason: 'SEC_FORM4_AMENDMENT',
              accessionNumber: filing.accessionNumber, publishedAt: `${date(filing.filingDate)}T23:59:59-05:00`,
              sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(companyCik)}/${filing.accessionNumber.replaceAll('-', '')}/${filing.accessionNumber}-index.html` });
          }
          continue;
        }
        const seen = new Set();
        for (const filing of filings) {
          if (!/^\d{10}-\d{2}-\d{6}$/.test(filing.accessionNumber) || !/^(?:xsl[A-Za-z0-9]+\/)?[\w.-]+\.xml$/.test(filing.primaryDocument)) throw new Error('Invalid Form 4 document path');
          if (seen.has(filing.accessionNumber)) continue;
          seen.add(filing.accessionNumber);
          const rawName = filing.primaryDocument.split('/').at(-1);
          filing.url = `https://www.sec.gov/Archives/edgar/data/${Number(companyCik)}/${filing.accessionNumber.replaceAll('-', '')}/${rawName}`;
          const xml = await (await sec(filing.url, 'application/xml')).text();
          const result = normalizeForm4(xml, company, filing);
          evidence.push(...result.evidence);
          excludedCount += result.excludedCount;
        }
      }
      cache = { key, evidence, reviews, excludedCount, historyFilesRead, expiresAt: now() + 600_000, collectedAt: new Date(now()).toISOString() };
      return cache;
    }
    while (pending) await pending;
    let result;
    if (cache?.key === key && cache.expiresAt > now()) result = cache;
    else { pending = collect(); try { result = await pending; } finally { pending = undefined; } }
    return { ...input, evidence: [...input.evidence.filter(x => !x.id?.startsWith('sec:form4:')), ...result.evidence],
      reviewRequired: [...(input.reviewRequired || []), ...result.reviews],
      form4Collection: { source: 'SEC Form 4', count: result.evidence.length, excludedCount: result.excludedCount, collectedAt: result.collectedAt,
        windowStart, historyFilesRead: result.historyFilesRead, coverage: 'SUBMISSION_DATE_WINDOW' } };
  };
}
