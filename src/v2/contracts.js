export const SIGNAL_TYPES = Object.freeze([
  'capital_action','public_mention','fundamental','valuation','market_flow',
  'macro','sentiment','risk','bear','consensus'
]);

export function normalizeEvidence(item = {}) {
  const required = ['id','sourceType','observedAt','actorId','companyId','ticker','market','signalType'];
  for (const key of required) if (!item[key]) throw new Error(`Missing evidence field: ${key}`);
  if (!SIGNAL_TYPES.includes(item.signalType)) throw new Error('Unsupported signal type');
  const confidence = Math.max(0, Math.min(1, Number(item.confidence ?? 0)));
  return {
    ...item,
    confidence,
    factSummary: String(item.factSummary || ''),
    inferenceSummary: String(item.inferenceSummary || ''),
  };
}

export function agentResult(agent, ticker, payload = {}) {
  if (!agent || !ticker) throw new Error('agent and ticker are required');
  return { agent, ticker, generatedAt: new Date().toISOString(), ...payload };
}
