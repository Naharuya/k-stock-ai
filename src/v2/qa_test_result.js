/** Parse actual Node test runner totals; a clean exit alone is not a PASS. */
export function parseExecutedTestResult({status,output='',signal=null}={}){
 const number=key=>{const matches=[...output.matchAll(new RegExp('(?:ℹ|#)\\s+'+key+'\\s+(\\d+)','g'))];return matches.length?Number(matches.at(-1)[1]):null;};
 const totals={tests:number('tests'),pass:number('pass'),fail:number('fail'),skipped:number('skipped'),cancelled:number('cancelled')};
 const complete=Object.values(totals).every(Number.isSafeInteger)&&totals.tests>0&&totals.tests===totals.pass+totals.fail+totals.skipped+totals.cancelled;
 return {status:status===0&&!signal&&complete&&totals.fail===0&&totals.cancelled===0?(totals.skipped===0?'TESTED_PASS':'TESTED_PARTIAL'):'TESTED_FAIL',exitCode:status??null,signal,totals,reason:!complete?'TEST_TOTALS_NOT_VERIFIED':status!==0||signal?'PROCESS_DID_NOT_COMPLETE_SUCCESSFULLY':totals.fail||totals.cancelled?'FAILED_OR_CANCELLED_TESTS':totals.skipped?'SKIPPED_TESTS_NOT_RUN':null};
}
