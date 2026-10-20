import test from 'node:test';
import assert from 'node:assert/strict';
import {parseInstitutionHolding,parseCapitalCover} from '../src/v2/sec_capital_evidence.js';
const row=(quantity,extra='')=>`<infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>037833100</cusip><value>1000</value><shrsOrPrnAmt><sshPrnamt>${quantity}</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>${extra}</infoTable>`;
test('institution holdings aggregate actual manager rows, exclude options and preserve missing issuer as null',()=>{
 const x=parseInstitutionHolding(`<informationTable>${row('10','<otherManager>1</otherManager>')}${row('20','<otherManager>2</otherManager>')}${row('90','<putCall>CALL</putCall>')}</informationTable>`);assert.equal(x.quantity,30);assert.equal(x.rowCount,2);assert.equal(x.reportedValueUsd,2000);
 assert.equal(parseInstitutionHolding(`<informationTable>${row('10').replace('037833100','UNRELATED')}</informationTable>`).quantity,null);
});
test('duplicate, empty and fractional share rows cannot create verified totals',()=>{
 assert.throws(()=>parseInstitutionHolding(`<informationTable>${row('10')}${row('10')}</informationTable>`),/DUPLICATE/);
 for(const q of ['', '-1','1.5','9007199254740992'])assert.throws(()=>parseInstitutionHolding(`<informationTable>${row(q)}</informationTable>`),/AMOUNT/);
});
test('SEC covers validate institution, actual reporting period and amendment type independently',()=>{
 const xml='<edgarSubmission><headerData><submissionType>13F-HR/A</submissionType><filerInfo><filer><credentials><cik>1067983</cik></credentials></filer></filerInfo></headerData><formData><coverPage><reportCalendarOrQuarter>03-31-2025</reportCalendarOrQuarter><filingManager><name>BERKSHIRE HATHAWAY INC</name></filingManager><isAmendment>true</isAmendment><amendmentInfo><amendmentType>NEW HOLDINGS</amendmentType><amendmentNo>1</amendmentNo></amendmentInfo></coverPage></formData></edgarSubmission>';
 const x=parseCapitalCover(xml);assert.equal(x.reportingPeriod,'2025-03-31');assert.equal(x.isAmendment,true);assert.equal(x.amendmentType,'NEW HOLDINGS');assert.throws(()=>parseCapitalCover(xml.replace('1067983','9999999')),/MISMATCH/);assert.throws(()=>parseCapitalCover(xml.replace('03-31-2025','02-31-2025')),/PERIOD/);
});
