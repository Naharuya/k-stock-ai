/** Research input readiness only. This module has no execution/order capability. */
const validTime = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x.slice(0,10)).toISOString().slice(0,10) === x.slice(0,10);
const reference = x => typeof x === 'string' && x.trim().length > 0;
const stages = ['training', 'validation', 'finalEvaluation'];
export function validateBacktestInputs({asOf, policy, partitions, costs, events = []} = {}) {
  const reasons = new Set();
  if (!Array.isArray(events)) { events=[]; reasons.add('EVENT_COLLECTION_INVALID'); }
  const block = x => reasons.add(x);
  if (!validTime(asOf)) block('RESEARCH_CUTOFF_INVALID');
  const policyValid = reference(policy?.id) && reference(policy?.sourceReference)
    && validTime(policy?.fixedAt) && Date.parse(policy.fixedAt) <= Date.parse(asOf)
    && Number.isSafeInteger(policy?.minimumIndependentEvents) && policy.minimumIndependentEvents > 0;
  if (!policyValid) block('PREREGISTERED_SAMPLE_POLICY_REQUIRED');
  const ranges = stages.map(name => ({name, ...partitions?.[name]}));
  if (ranges.some(r => !validTime(r.startAt) || !validTime(r.endAt)
    || Date.parse(r.startAt) >= Date.parse(r.endAt) || Date.parse(r.endAt) > Date.parse(asOf))) {
    block('INDEPENDENT_PARTITIONS_REQUIRED');
  } else if (Date.parse(ranges[0].endAt) >= Date.parse(ranges[1].startAt)
    || Date.parse(ranges[1].endAt) >= Date.parse(ranges[2].startAt)) block('PARTITIONS_OVERLAP');
  if (!costs || costs.unit !== 'BASIS_POINTS' || !reference(costs.sourceReference)
    || !validTime(costs.availableAt) || Date.parse(costs.availableAt) > Date.parse(asOf)
    || !['commissionBps', 'taxBps', 'slippageBps'].every(k => Number.isFinite(costs[k]) && costs[k] >= 0)) {
    block('COST_AND_SLIPPAGE_EVIDENCE_REQUIRED');
  }
  const identities = new Set(), counts = Object.fromEntries(stages.map(n => [n, 0]));
  const positions = [], priceBases = new Map();
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) { block('EVENT_RECORD_INVALID'); continue; }
    if (!reference(event.eventId) || !reference(event.companyId) || !reference(event.documentId)
      || !reference(event.sourceHash)) block('EVENT_IDENTITY_UNVERIFIED');
    // A document reused at another horizon is still the same independent event.
    const key = `${event.companyId}:${event.documentId}`;
    if (identities.has(key)) block('DUPLICATE_INDEPENDENT_EVENT');
    if (reference(event.companyId) && reference(event.documentId)) identities.add(key);
    if (!stages.includes(event.partition)) block('EVENT_PARTITION_REQUIRED');
    const range = ranges.find(r => r.name === event.partition);
    if (!validTime(event.publicAvailableAt) || !validTime(event.tradeableFrom)
      || !validTime(event.entryAt) || !validTime(event.exitAt)) block('PUBLIC_AND_TRADE_TIME_UNVERIFIED');
    else {
      const published = Date.parse(event.publicAvailableAt), entry = Date.parse(event.entryAt), exit = Date.parse(event.exitAt);
      if (Date.parse(event.tradeableFrom) < published || entry < Date.parse(event.tradeableFrom)
        || exit <= entry || exit > Date.parse(asOf)) block('FUTURE_OR_UNTRADEABLE_PRICE');
      if (policyValid && Date.parse(policy.fixedAt) >= published) block('RETROSPECTIVE_RULE_SELECTION');
      if (range && (entry < Date.parse(range.startAt) || exit > Date.parse(range.endAt))) block('EVENT_CROSSES_PARTITION');
      if (costs && Date.parse(costs.availableAt) > entry) block('COST_FUTURE_INFORMATION');
      if (positions.some(p => p.companyId === event.companyId && entry < p.exit && exit > p.entry)) block('OVERLAPPING_POSITION');
      positions.push({companyId:event.companyId,entry,exit});
      if (range) counts[range.name]++;
    }
    if (!['EXACT_PUBLIC_TIME','CONSERVATIVE_START'].includes(event.publicationMode)) block('PUBLICATION_MODE_UNVERIFIED');
    if (event.publicationMode === 'CONSERVATIVE_START') block('CONSERVATIVE_RESEARCH_NOT_EXECUTION_BACKTEST');
    const basis=JSON.stringify([event.priceType,event.returnType,event.currency,event.benchmarkId]);
    if (priceBases.has(event.companyId) && priceBases.get(event.companyId)!==basis) block('MIXED_PRICE_OR_BENCHMARK_BASIS');
    priceBases.set(event.companyId,basis);
    if (!/^[A-Z]{3}$/.test(event.currency||'') || event.benchmarkCurrency!==event.currency || !reference(event.benchmarkId) || event.quantityUnit!=='SHARES') block('CURRENCY_OR_QUANTITY_UNIT_UNVERIFIED');
    if (event.priceValidation !== 'VERIFIED' || event.benchmarkValidation !== 'VERIFIED'
      || event.calendarValidation !== 'VERIFIED' || event.corporateActionValidation !== 'VERIFIED') block('MARKET_INPUTS_UNVERIFIED');
    if (!['RAW_CLOSE','ADJUSTED_CLOSE'].includes(event.priceType)
      || !['PRICE_RETURN','TOTAL_RETURN'].includes(event.returnType)
      || (event.returnType === 'TOTAL_RETURN' && event.dividendValidation !== 'VERIFIED')) block('RETURN_DEFINITION_UNVERIFIED');
    if (event.liquidity?.verificationStatus !== 'VERIFIED' || !reference(event.liquidity?.sourceReference)
      || !validTime(event.liquidity?.availableAt) || Date.parse(event.liquidity.availableAt) > Date.parse(event.entryAt)
      || !Number.isFinite(event.liquidity?.capacity) || event.liquidity.capacity <= 0 || !Number.isFinite(event.positionQuantity) || event.positionQuantity <= 0 || event.positionQuantity > event.liquidity.capacity) block('LIQUIDITY_UNVERIFIED');
  }
  if (!events.length) block('NO_ELIGIBLE_EVENTS');
  if (policyValid && identities.size < policy.minimumIndependentEvents) block('INSUFFICIENT_INDEPENDENT_EVENTS');
  if (stages.some(name => counts[name] === 0)) block('EMPTY_INDEPENDENT_PARTITION');
  return {status:reasons.size ? 'BACKTEST_BLOCKED' : 'INPUTS_VERIFIED_ONLY',
    reasons:[...reasons], independentEvents:identities.size, partitionCounts:counts,
    predictiveValidity:'NOT_ESTABLISHED', recommendationStatus:'HOLD', liveTradingEnabled:false};
}
