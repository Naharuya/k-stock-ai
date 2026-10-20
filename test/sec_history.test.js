import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSubmissionHistory } from '../src/v2/sec_submission_history.js';
const cik = '0000000123';
const row = { form: ['4'], filingDate: ['2026-09-10'], accessionNumber: ['0000000123-26-000001'], primaryDocument: ['form4.xml'] };
const file = { name: 'CIK0000000123-submissions-001.json', filingFrom: '2026-08-01', filingTo: '2026-09-15' };
const query = { cik, windowStart: '2026-09-01', windowEnd: '2026-09-27' };
function requestFor(files, historical = row) {
  const calls = [];
  return { calls, request: async url => { calls.push(url); return { json: async () => url.endsWith(`CIK${cik}.json`) ? { filings: { recent: row, files } } : historical }; } };
}
test('history reads intersecting files and deduplicates overlapping recent rows', async () => {
  const provider = requestFor([file, { ...file, name: 'CIK0000000123-submissions-002.json', filingFrom: '2020-01-01', filingTo: '2020-12-31' }]);
  const result = await loadSubmissionHistory({ ...query, request: provider.request });
  assert.equal(result.filings.length, 1);
  assert.equal(result.historyFilesRead, 1);
  assert.equal(provider.calls.length, 2);
  assert.ok(provider.calls[1].endsWith(file.name));
});
test('over-limit history and malicious paths fail before extra fetches', async () => {
  const provider = requestFor([file]);
  await assert.rejects(loadSubmissionHistory({ ...query, request: provider.request, maxFiles: 0 }), /limit/);
  assert.equal(provider.calls.length, 1);
  const bad = requestFor([{ ...file, name: '../private.json' }]);
  await assert.rejects(loadSubmissionHistory({ ...query, request: bad.request }), /filename/);
  assert.equal(bad.calls.length, 1);
});
test('history rejects conflicting duplicates and malformed historical columns', async () => {
  const conflict = requestFor([file], { ...row, primaryDocument: ['other.xml'] });
  await assert.rejects(loadSubmissionHistory({ ...query, request: conflict.request }), /Conflicting/);
  const bad = requestFor([file], { ...row, filingDate: [] });
  await assert.rejects(loadSubmissionHistory({ ...query, request: bad.request }), /Invalid SEC submissions/);
});
test('historical-only Form 4 records are returned within date window', async () => {
  const historical = { ...row, accessionNumber: ['0000000123-26-000002'] };
  const provider = requestFor([file], historical);
  const result = await loadSubmissionHistory({ ...query, request: provider.request });
  assert.equal(result.filings.length, 2);
  assert.equal(result.coverage, 'SUBMISSION_DATE_WINDOW');
});
