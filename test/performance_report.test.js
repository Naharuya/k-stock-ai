import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createPerformanceReportService, registerPerformanceRoutes } from '../src/v2/performance_report.js';
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(),'kstock-performance-read-'));
  t.after(() => rm(directory,{recursive:true,force:true}));
  return { directory, env: {}, now: () => Date.parse('2026-10-12') };
}
async function save(options, changes = {}) {
  const report = { version: 1, snapshotId: 'a'.repeat(64), snapshotAnalysisDate: '2026-09-01', analysisDate: '2026-10-01', status: 'PENDING',
    results: [{ ticker: '005930', market: 'KR', approvedAtSnapshot: false, performance: { status: 'PENDING', reason: 'private error text' } }], ...changes };
  const id = createHash('sha256').update(JSON.stringify(report)).digest('hex');
  await writeFile(path.join(options.directory,`${id}.json`),JSON.stringify(report)); return id;
}
test('performance list orders by analysis date and detail exposes only safe fields', async t => {
  const options = await fixture(t), id = await save(options), newer = await save(options,{analysisDate:'2026-10-02'});
  const service = createPerformanceReportService(options);
  assert.equal((await service.list())[0].id,newer);
  const detail = await service.get(id);
  assert.equal(detail.results[0].performance.horizons[20].status,'PENDING');
  assert.equal(JSON.stringify(detail).includes('private error text'),false);
});
test('corrupt reports, traversal, symlinks and false READY claims fail closed', async t => {
  const options = await fixture(t), service = createPerformanceReportService(options), id = await save(options);
  await assert.rejects(service.get('../x'), /INVALID_PERFORMANCE_ID/);
  await writeFile(path.join(options.directory,`${id}.json`),'{}');
  await assert.rejects(service.get(id),/INVALID_PERFORMANCE_REPORT/);
  const bad = await save(options,{status:'READY'});
  await assert.rejects(service.get(bad),/INVALID_PERFORMANCE_STATUS/);
  const link = 'b'.repeat(64); await symlink(path.join(options.directory,`${bad}.json`),path.join(options.directory,`${link}.json`));
  await assert.rejects(service.get(link),/INVALID_PERFORMANCE_FILE/);
});
test('performance routes distinguish no data, invalid IDs, missing files and failures', async () => {
  const handlers = new Map();
  registerPerformanceRoutes({get:(route,handler)=>handlers.set(route,handler)}, { list:async()=>[], get:async()=>{const e=new Error('private');e.code='ENOENT';throw e;} });
  const response = () => ({ code:200,set(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;} });
  const list=response(); await handlers.get('/api/v2/performance')({},list); assert.equal(list.body.status,'NO_DATA');
  const invalid=response(); await handlers.get('/api/v2/performance/:id')({params:{id:'bad'}},invalid);assert.equal(invalid.code,400);
  const missing=response(); await handlers.get('/api/v2/performance/:id')({params:{id:'a'.repeat(64)}},missing);assert.equal(missing.code,404);
});
test('performance cumulative API strips extra fields and rejects held, future and inconsistent series', async t => {
 const options=await fixture(t),service=createPerformanceReportService(options);
 const cumulative={benchmark:'KOSPI',basis:'TOTAL_RETURN',points:[{date:'2026-09-02',stockReturnPct:0,benchmarkReturnPct:0},{date:'2026-09-03',stockReturnPct:10,benchmarkReturnPct:2,private:'hidden'}]};
 const row={ticker:'005930',market:'KR',approvedAtSnapshot:true,performance:{status:'PENDING',cumulative}};
 const id=await save(options,{results:[row]});const data=await service.get(id);
 assert.equal(data.results[0].performance.cumulative.points.length,2);assert.equal(JSON.stringify(data).includes('hidden'),false);
 for(const bad of [{...row,approvedAtSnapshot:false},{...row,performance:{...row.performance,cumulative:{...cumulative,points:[cumulative.points[0],{date:'2026-10-01',stockReturnPct:10,benchmarkReturnPct:2}]}}},{...row,performance:{...row.performance,horizons:{1:{status:'READY',fromDate:'2026-09-02',toDate:'2026-09-03',stockReturnPct:9,benchmarkReturnPct:2,excessReturnPct:7}}}}]){
  const badId=await save(options,{results:[bad]});await assert.rejects(service.get(badId),/INVALID_PERFORMANCE_SERIES/);
 }
});
