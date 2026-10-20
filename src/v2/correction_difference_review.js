import { summarizeCorrectionNumericAudit } from './correction_numeric_audit.js';
export const CORRECTION_CAUSES = Object.freeze(['CORRECTION','UNIT_DIFFERENCE','PERIOD_DIFFERENCE','SCOPE_DIFFERENCE','ROUNDING','SUMMATION_ERROR','SOURCE_CONFLICT','UNRESOLVED']);
// A nonzero sum proves an observed discrepancy, not its causal explanation.
// Never infer rounding, a typographical error, or a missing factor from magnitude.
export function reviewCorrectionDifferences(audit, { valuationDate } = {}) {
  const numeric = summarizeCorrectionNumericAudit(audit);
  if (!numeric.tables) return { status:'CORRECTION_UNVERIFIED', resolved:0, unresolved:0, differences:[], valuationInputEligible:false };
  const originalPublishedDate = audit.originalReceipt.slice(0,4)+'-'+audit.originalReceipt.slice(4,6)+'-'+audit.originalReceipt.slice(6,8);
  const correctionPublishedDate = audit.correctionReceipt.slice(0,4)+'-'+audit.correctionReceipt.slice(4,6)+'-'+audit.correctionReceipt.slice(6,8);
  const cutoffTimestamp=valuationDate===undefined?null:Date.parse(valuationDate+'T00:00:00Z');
  const cutoffValid = valuationDate === undefined || (/^\d{4}-\d{2}-\d{2}$/.test(valuationDate) && Number.isFinite(cutoffTimestamp) && new Date(cutoffTimestamp).toISOString().slice(0,10)===valuationDate);
  const available = cutoffValid && (!valuationDate || correctionPublishedDate<=valuationDate);
  const differences = numeric.totalDifferences.map((d,i)=> {
    const table = numeric.tables.find(t=>t.statementBasis===d.statementBasis && t.year===d.year && t.field===d.field);
    const group = table.rows.filter(r=>r.currency===d.currency && r.measure===d.measure);
    const total = group.find(r=>r.account.endsWith('계'));
    const unitChanged = group.some(r=>r.beforeUnit!==r.afterUnit);
    const numericChanged = group.some(r=>r.beforeValue!==r.afterValue);
    const causeAssessments = [
      { cause:'CORRECTION', status:'NOT_ESTABLISHED', observation:numericChanged?'NUMERIC_CHANGE_OBSERVED':'NO_NUMERIC_CHANGE_IN_GROUP', reason:'CHANGED_VALUES_DO_NOT_EXPLAIN_TOTAL_COMPONENT_RESIDUAL' },
      { cause:'UNIT_DIFFERENCE', status:'NOT_ESTABLISHED', observation:unitChanged?'UNIT_CHANGE_OBSERVED':'SAME_REPORTED_UNIT', reason:'RESIDUAL_IS_WITHIN_ONE_DOCUMENT_STAGE_AND_REPORTED_UNIT' },
      { cause:'PERIOD_DIFFERENCE', status:'NOT_ESTABLISHED', observation:'SAME_YEAR_TABLE_PAIR', reason:'NO_OFFICIAL_PERIOD_MISMATCH_EXPLANATION' },
      { cause:'SCOPE_DIFFERENCE', status:'NOT_ESTABLISHED', observation:'SAME_STATEMENT_BASIS_TABLE_PAIR', reason:'NO_OFFICIAL_COMPONENT_SCOPE_EXPLANATION' },
      { cause:'ROUNDING', status:'NOT_ESTABLISHED', observation:'NONZERO_REPORTED_TOTAL_RESIDUAL', reason:'MAGNITUDE_ALONE_IS_NOT_A_ROUNDING_POLICY' },
      { cause:'SUMMATION_ERROR', status:'NOT_ESTABLISHED', observation:'NONZERO_REPORTED_TOTAL_RESIDUAL', reason:'ARITHMETIC_RESIDUAL_DOES_NOT_ESTABLISH_SOURCE_ERROR' },
      { cause:'SOURCE_CONFLICT', status:'NOT_ESTABLISHED', observation:'ORIGINAL_AND_CORRECTION_PROVENANCE_RETAINED', reason:'NO_INDEPENDENT_CONFLICTING_OFFICIAL_CAUSAL_SOURCE' }
    ];
    return { id:'DB-FX-'+String(i+1).padStart(2,'0'), ...d,
      cause:'UNRESOLVED', resolved:false, causeAssessments,
      arithmeticScope:{stage:d.stage, currency:d.currency, measure:d.measure, periodYear:table.year, statementBasis:table.statementBasis, units:[...new Set(group.map(r=>d.stage==='before'?r.beforeUnit:r.afterUnit))]},
      reason:'OFFICIAL_CAUSAL_EXPLANATION_NOT_ESTABLISHED',
      originalReceipt:audit.originalReceipt, correctionReceipt:audit.correctionReceipt,
      originalPublishedDate, correctionPublishedDate,
      originalTableIndex:table.originalTableIndex, correctionTableIndex:table.correctionTableIndex,
      item:total.account, beforeValue:total.beforeValue, afterValue:total.afterValue,
      beforeUnit:total.beforeUnit, afterUnit:total.afterUnit,
      periodStart:table.year+'-01-01', periodEnd:table.year+'-12-31',
      beforeCell:total.beforeCell, afterCell:total.afterCell,
      components:group.filter(r=>r!==total).map(r=>({item:r.account,beforeValue:r.beforeValue,afterValue:r.afterValue,beforeUnit:r.beforeUnit,afterUnit:r.afterUnit,beforeCell:r.beforeCell,afterCell:r.afterCell})),
      observedChanges:group.filter(r=>r.beforeValue!==r.afterValue||r.beforeUnit!==r.afterUnit).map(r=>({item:r.account,numericChanged:r.beforeValue!==r.afterValue,unitChanged:r.beforeUnit!==r.afterUnit})),
      sources:[`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${audit.originalReceipt}`,`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${audit.correctionReceipt}`],
      sourceArchiveHashes:audit.sourceArchiveHashes,
      sourceAvailableAtValuationDate:available,
      valuationInputEligible:false
    };
  });
  return { status:available?'REVIEW_REQUIRED':'FUTURE_INFORMATION_BLOCKED', resolved:0, unresolved:differences.length, differences, originalPublishedDate, correctionPublishedDate,
    valuationDate:valuationDate||null, sourceAvailableAtValuationDate:available, externalReads:0, valuationInputEligible:false,
    policy:'OBSERVED_ARITHMETIC_DIFFERENCE_IS_NOT_A_CAUSAL_FINDING' };
}
