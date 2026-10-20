import test from 'node:test';import assert from 'node:assert/strict';
import {parseExecutedTestResult} from '../src/v2/qa_test_result.js';
const output='ℹ tests 3\nℹ pass 3\nℹ fail 0\nℹ skipped 0\nℹ cancelled 0';
test('QA records observed complete totals and does not imply real data or device validation',()=>{const r=parseExecutedTestResult({status:0,output});assert.equal(r.status,'TESTED_PASS');assert.equal(r.totals.pass,3);assert.equal(r.realOrderCalls,undefined);});
test('exit zero without actual totals or inconsistent totals cannot become PASS',()=>{assert.equal(parseExecutedTestResult({status:0,output:''}).status,'TESTED_FAIL');assert.equal(parseExecutedTestResult({status:0,output:output.replace('pass 3','pass 2')}).status,'TESTED_FAIL');});
test('failed or terminated execution remains failed even with previous successful totals',()=>{assert.equal(parseExecutedTestResult({status:1,output}).status,'TESTED_FAIL');assert.equal(parseExecutedTestResult({status:null,signal:'SIGTERM',output}).status,'TESTED_FAIL');});

test('skipped tests are NOT RUN and cannot turn an incomplete suite into TESTED_PASS',()=>{const r=parseExecutedTestResult({status:0,output:output.replace('tests 3','tests 4').replace('skipped 0','skipped 1')});assert.equal(r.status,'TESTED_PARTIAL');assert.equal(r.reason,'SKIPPED_TESTS_NOT_RUN');});
