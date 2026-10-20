import { createOwnershipCollector } from './opendart_ownership.js';
import { createOpenDartCorpCodeResolver } from '../services/opendart_corp_code_resolver.js';
import { assertSafeKStockV2Environment } from './scoring.js';

export function createOwnershipRefresh({ env = process.env, collector, now = () => Date.now(), ttlMs = 600_000 } = {}) {
  const source = collector || createOwnershipCollector({ env, resolver: createOpenDartCorpCodeResolver() });
  let cache;
  let pending;
  return async function refresh(input) {
    assertSafeKStockV2Environment(env);
    if (env.KSTOCK_V2_OWNERSHIP_ENABLED !== 'true') return input;
    if (env.KSTOCK_DART_ENABLED !== 'true') throw new Error('OpenDART integration is disabled');
    const companies = input.companies.filter(x => x.market === 'KR');
    if (companies.length > 10) throw new Error('Ownership collection is limited to 10 KR companies');
    const key = JSON.stringify(companies.map(x => [x.ticker, x.corpCode]));
    async function collect() {
      const evidence = [];
      for (const company of companies) evidence.push(...await source.collect(company));
      if (evidence.length > 5000) throw new Error('Ownership evidence limit exceeded');
      cache = { key, evidence, collectedAt: new Date(now()).toISOString(), expiresAt: now() + ttlMs };
      return cache;
    }
    let result;
    if (cache?.key === key && cache.expiresAt > now()) result = cache;
    else {
      while (pending) await pending;
      if (cache?.key === key && cache.expiresAt > now()) result = cache;
      else {
        pending = collect();
        try { result = await pending; } finally { pending = undefined; }
      }
    }
    return { ...input, evidence: [...input.evidence.filter(x => x.market !== 'KR'), ...result.evidence],
      collection: { source: 'OpenDART ownership', collectedAt: result.collectedAt, count: result.evidence.length } };
  };
}
