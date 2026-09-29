import { normalizeEvidence, agentResult } from '../contracts.js';
import { isD2Eligible } from '../scoring.js';

export function runEvidenceAgent(items = [], analysisDate = new Date().toISOString()) {
  const accepted = [], rejected = [];
  for (const raw of items) {
    try {
      const item = normalizeEvidence(raw);
      if (!isD2Eligible(item.observedAt, analysisDate)) {
        rejected.push({ id: item.id, reason: 'NOT_D2_ELIGIBLE' });
        continue;
      }
      if (!item.sourceUrl && !item.sourceName) {
        rejected.push({ id: item.id, reason: 'SOURCE_MISSING' });
        continue;
      }
      accepted.push(item);
    } catch (error) {
      rejected.push({ id: raw?.id || null, reason: error.message });
    }
  }
  return { accepted, rejected, passed: accepted.length > 0 };
}
