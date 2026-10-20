import { createHash } from 'node:crypto';
import { createOpenDartRequest } from '../services/opendart_request.js';
import { assertSafeKStockV2Environment } from './scoring.js';

function number(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid ownership number');
  const text = String(value).replaceAll(',', '').trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) throw new Error('Invalid ownership number');
  const result = Number(text);
  if (!Number.isFinite(result)) throw new Error('Invalid ownership number');
  return result;
}

export function normalizeOwnership(row, { ticker, corpCode, operation }) {
  if (!row || !/^\d{14}$/.test(row.rcept_no || '') || !/^(\d{8}|\d{4}-\d{2}-\d{2})$/.test(row.rcept_dt || '')
      || row.corp_code !== corpCode || typeof row.repror !== 'string' || !row.repror.trim()) {
    throw new Error('Invalid ownership record');
  }
  const compactDate = row.rcept_dt.replaceAll('-', '');
  const date = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
  const publishedAt = `${date}T23:59:59+09:00`;
  if (!Number.isFinite(Date.parse(publishedAt)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid filing date');
  }
  const shares = number(operation === 'majorstock' ? row.stkqy : row.sp_stock_lmp_cnt);
  const change = number(operation === 'majorstock' ? row.stkqy_irds : row.sp_stock_lmp_irds_cnt);
  if (shares < 0) throw new Error('Invalid share count');
  return {
    id: `dart:${operation}:${row.rcept_no}`, sourceType: 'filing', sourceName: 'OpenDART 지분공시',
    sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${row.rcept_no}`,
    actorId: `dart:${createHash('sha256').update(row.repror.trim()).digest('hex')}`,
    actorType: operation === 'elestock' ? 'insider' : 'shareholder',
    companyId: corpCode, ticker, market: 'KR', signalType: 'capital_action',
    actionType: change > 0 ? 'increase' : change < 0 ? 'reduce' : 'hold',
    confidence: 1, observedAt: publishedAt, publishedAt, transactionAt: null,
    shares, shareChange: change,
    factSummary: `공시상 보유 ${shares}주, 증감 ${change}주. 접수일 ${date}.`,
    inferenceSummary: '보유 증감은 시장 매수·매도와 동일하지 않으며 실제 거래일과 사유는 원문 확인이 필요합니다.',
  };
}

export function createOwnershipCollector({ request = createOpenDartRequest(), resolver, env = process.env } = {}) {
  return {
    async collect(company) {
      assertSafeKStockV2Environment(env);
      if (env.KSTOCK_DART_ENABLED !== 'true') throw new Error('OpenDART integration is disabled');
      if (!/^\d{6}$/.test(company.ticker || '') || company.market !== 'KR') throw new Error('Invalid KR company');
      const corpCode = company.corpCode || await resolver.resolve(company.ticker);
      if (!/^\d{8}$/.test(corpCode || '')) throw new Error('Invalid corp code');
      const evidence = [];
      const ids = new Set();
      for (const operation of ['majorstock', 'elestock']) {
        const response = await request({ service: 'opendart', operation, params: { corpCode } });
        if (response?.status === '013') continue;
        if (response?.status !== '000' || !Array.isArray(response.list)) throw new Error('Ownership response unavailable');
        for (const row of response.list) {
          const item = normalizeOwnership(row, { ticker: company.ticker, corpCode, operation });
          if (!ids.has(item.id)) { ids.add(item.id); evidence.push(item); }
        }
      }
      return evidence;
    },
  };
}
