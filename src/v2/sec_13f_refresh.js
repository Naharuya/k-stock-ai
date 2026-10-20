import { createLeaderDisclosureService } from '../services/leader_disclosures.js';
import { assertSafeKStockV2Environment, isD2Eligible } from './scoring.js';

function publicationDate(filing) {
  const date = filing.filingDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid SEC filing date');
  }
  // Filing dates lack a time: use end of Eastern standard-time day conservatively, also during DST.
  return `${date}T23:59:59-05:00`;
}

export function buildSecEvidence(portfolio, companies, filing) {
  const publishedAt = publicationDate(filing);
  if (portfolio.form !== '13F-HR' || portfolio.quarterEnd !== filing.reportDate
      || !/^\d{4}-\d{2}-\d{2}$/.test(portfolio.quarterEnd || '') || !Array.isArray(portfolio.holdings)) {
    throw new Error('Invalid SEC portfolio');
  }
  const evidence = [];
  let unmappedCount = 0;
  const byCusip = new Map();
  for (const company of companies) {
    if (!/^[A-Z0-9]{9}$/.test(company.cusip || '') || typeof company.securityClass !== 'string'
        || !company.securityClass.trim() || !company.cusipSource) throw new Error('SEC companies require sourced CUSIP and share class mappings');
    const source = new URL(company.cusipSource);
    if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Invalid CUSIP mapping source');
    const key = `${company.cusip}:${company.securityClass}`;
    if (byCusip.has(key)) throw new Error('Ambiguous CUSIP mapping');
    byCusip.set(key, company);
  }
  const grouped = new Map();
  for (const holding of portfolio.holdings) {
    if (holding.putCall || holding.shareType !== 'SH') continue;
    const key = `${holding.cusip}:${holding.securityClass}`;
    const company = byCusip.get(key);
    if (!company) { unmappedCount++; continue; }
    if (!Number.isFinite(holding.shares) || holding.shares < 0) throw new Error('Invalid SEC share count');
    grouped.set(key, (grouped.get(key) || 0) + holding.shares);
  }
  for (const [key, shares] of grouped) {
    const company = byCusip.get(key);
    evidence.push({
      id: `sec:13f:${filing.accessionNumber}:${company.cusip}:${company.ticker}`,
      sourceType: 'filing', sourceName: 'SEC EDGAR · Berkshire Hathaway 13F', sourceUrl: filing.url,
      actorId: 'sec:0001067983', actorType: 'institution', companyId: company.cusip,
      ticker: company.ticker, market: 'GLOBAL', signalType: 'capital_action', actionType: 'hold', confidence: 1,
      observedAt: publishedAt, publishedAt, transactionAt: null, periodEnd: portfolio.quarterEnd,
      shares, cusip: company.cusip, mappingSource: company.cusipSource,
      factSummary: `${portfolio.quarterEnd} 분기 말 공시상 ${shares}주 보유. SEC 제출일 ${filing.filingDate}.`,
      inferenceSummary: '분기 보유 현황이며 최근 매수나 버핏 개인의 거래를 뜻하지 않습니다. 전분기 비교·정정 공시·주식 분할 검증 전에는 증감을 추정하지 않습니다.',
    });
  }
  return { evidence, unmappedCount };
}

export function createSec13fRefresh({ env = process.env, service, now = () => Date.now(), ttlMs = 600_000 } = {}) {
  const sec = service || createLeaderDisclosureService({ userAgent: env.KSTOCK_SEC_USER_AGENT });
  let cache, pending;
  return async function refresh(input) {
    assertSafeKStockV2Environment(env);
    if (env.KSTOCK_V2_SEC_ENABLED !== 'true') return input;
    if (!/^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KSTOCK_SEC_USER_AGENT || '')) {
      throw new Error('SEC User-Agent requires application identity and contact email');
    }
    const companies = input.companies.filter(item => item.market === 'GLOBAL');
    if (!companies.length) return input;
    if (companies.length > 20) throw new Error('SEC mapping is limited to 20 companies');
    const key = JSON.stringify([input.analysisDate, companies]);
    async function collect() {
      const data = await sec.getBerkshireFilings();
      const eligible = data.filings.filter(f => isD2Eligible(publicationDate(f), input.analysisDate))
        .sort((a, b) => b.filingDate.localeCompare(a.filingDate) || b.accessionNumber.localeCompare(a.accessionNumber));
      const filing = eligible[0];
      if (!filing) throw new Error('No D-2 eligible SEC filing in available history');
      if (filing.form !== '13F-HR') {
        if (filing.form !== '13F-HR/A' || !/^\d{10}-\d{2}-\d{6}$/.test(filing.accessionNumber)) throw new Error('Invalid SEC amendment');
        cache = { key, evidence: [], unmappedCount: 0, filing,
          reviews: companies.map(company => ({ ticker: company.ticker, market: 'GLOBAL', reason: 'SEC_13F_AMENDMENT',
            accessionNumber: filing.accessionNumber, publishedAt: publicationDate(filing),
            sourceUrl: `https://www.sec.gov/Archives/edgar/data/1067983/${filing.accessionNumber.replaceAll('-', '')}/${filing.accessionNumber}-index.html` })),
          collectedAt: new Date(now()).toISOString(), expiresAt: now() + ttlMs };
        return cache;
      }
      const portfolio = await sec.getBerkshirePortfolio({ filing });
      const result = buildSecEvidence(portfolio, companies, filing);
      cache = { key, ...result, filing, collectedAt: new Date(now()).toISOString(), expiresAt: now() + ttlMs };
      return cache;
    }
    let result;
    while (pending) await pending;
    if (cache?.key === key && cache.expiresAt > now()) result = cache;
    else {
      pending = collect();
      try { result = await pending; } finally { pending = undefined; }
    }
    return {
      ...input,
      evidence: [...input.evidence.filter(item => item.market !== 'GLOBAL'), ...result.evidence],
      reviewRequired: [...(input.reviewRequired || []), ...(result.reviews || [])],
      secCollection: { source: 'SEC Berkshire 13F', collectedAt: result.collectedAt, count: result.evidence.length,
        unmappedCount: result.unmappedCount, accessionNumber: result.filing.accessionNumber, periodEnd: result.filing.reportDate },
    };
  };
}
