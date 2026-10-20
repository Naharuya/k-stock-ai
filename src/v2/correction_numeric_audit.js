// Numeric reconciliation uses observed original cells, never a guessed scale factor.
export function summarizeCorrectionNumericAudit(audit) {
  const tables = audit?.tables || [];
  const hashes = audit?.sourceArchiveHashes || {};
  const valid = audit?.verificationStatus === 'VERIFIED' &&
    [audit.originalReceipt, audit.correctionReceipt].every(r => /^\d{14}$/.test(r || '') && /^[a-f0-9]{64}$/.test(hashes[r] || '')) &&
    audit.originalReceipt !== audit.correctionReceipt && tables.length === 8 &&
    new Set(tables.map(t => `${t.statementBasis}:${t.year}:${t.field}`)).size === 8 &&
    audit.primaryFinancialChecks?.length === 4 && new Set(audit.primaryFinancialChecks.map(c=>c.label)).size===4 && ['CFS_BALANCE','CFS_INCOME','OFS_BALANCE','OFS_INCOME'].every(label=>audit.primaryFinancialChecks.some(c=>c.label===label)) && audit.primaryFinancialChecks.every(c => c.unchanged === true && /^[a-f0-9]{64}$/.test(c.sha256 || '')) &&
    tables.every(t => t.rows?.length > 0 && new Set(t.rows.map(r=>`${r.account}:${r.currency}:${r.measure}`)).size===t.rows.length && t.rows.every(r=>t.rows.some(pair=>pair.account===r.account&&pair.currency===r.currency&&pair.measure!==r.measure)) && t.rows.every(r => r.account && ['USD', 'JPY', 'EUR'].includes(r.currency) &&
      ['FOREIGN_CURRENCY', 'KRW_TRANSLATED'].includes(r.measure) && Number.isSafeInteger(r.beforeValue) && Number.isSafeInteger(r.afterValue) &&
      r.beforeUnit && r.afterUnit && r.beforeCell?.value === r.beforeValue && r.afterCell?.value === r.afterValue &&
      ['beforeCell', 'afterCell'].every(k => Number.isSafeInteger(r[k].row) && r[k].row >= 0 && Number.isSafeInteger(r[k].column) && r[k].column >= 0)));
  if (!valid) return { status: 'CORRECTION_UNVERIFIED', reason: 'NUMERIC_OR_CELL_EVIDENCE_INCOMPLETE' };
  const rows = tables.flatMap(t => t.rows);
  const krwUnchanged = rows.filter(r => r.measure === 'KRW_TRANSLATED').every(r => r.beforeValue === r.afterValue && r.beforeUnit === '백만원' && r.afterUnit === '백만원');
  const totalDifferences=[];let totalsChecked=0;
  for(const table of tables)for(const currency of ['USD','JPY','EUR'])for(const measure of ['FOREIGN_CURRENCY','KRW_TRANSLATED']){
    const group=table.rows.filter(r=>r.currency===currency&&r.measure===measure),totals=group.filter(r=>r.account.endsWith('계')),parts=group.filter(r=>!r.account.endsWith('계'));
    if(totals.length!==1||!parts.length)continue;
    for(const stage of ['before','after']){
      const unit=totals[0][stage+'Unit'];if(unit==='원문 단위 미명시'||group.some(r=>r[stage+'Unit']!==unit))continue;
      totalsChecked++;const sum=parts.reduce((n,r)=>n+BigInt(r[stage+'Value']),0n),difference=BigInt(totals[0][stage+'Value'])-sum;
      if(difference!==0n)totalDifferences.push({statementBasis:table.statementBasis,year:table.year,field:table.field,currency,measure,stage,unit,total:totals[0][stage+'Value'],componentSum:sum.toString(),difference:difference.toString(),status:'CAUSE_UNVERIFIED_NO_ROUNDING_OR_SCALE_ASSUMPTION'});
    }
  }
  return { status: krwUnchanged ? 'VERIFIED' : 'REVIEW_REQUIRED', tableCount: tables.length, rowCount: rows.length,
    numericChanges: rows.filter(r => r.beforeValue !== r.afterValue).length,
    unitChanges: rows.filter(r => r.beforeUnit !== r.afterUnit).length,
    krwUnchanged, primaryFinancialStatementsUnchanged: true, totalsChecked,totalDifferences,arithmeticStatus:totalDifferences.length?'REVIEW_REQUIRED':totalsChecked?'NO_OBSERVED_DIFFERENCE':'NOT_ASSESSED',valuationInputEligible:false,
    unresolvedUnits: rows.filter(r => r.beforeUnit === '원문 단위 미명시').length,
    policy: 'DIRECT_CELL_COMPARISON_NO_SCALE_INFERENCE', tables };
}
