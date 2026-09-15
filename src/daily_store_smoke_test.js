import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {DailyCandidateStore} from './services/daily_candidate_store.js';
import {temporaryStoreDirectory,recordFixture} from './daily_test_helpers.js';
const temp=await temporaryStoreDirectory();
try {
  const store=new DailyCandidateStore(temp.root);
  const record=recordFixture();
  assert.equal(await store.read('after-market',record.sourceTradingDate),null);
  await store.write('after-market',record.sourceTradingDate,record);
  assert.deepEqual(await new DailyCandidateStore(temp.root).read('after-market',record.sourceTradingDate),record);
  await Promise.all(Array.from({length:6},(_,i)=>store.write('after-market',record.sourceTradingDate,{...record,diagnostics:{writer:i}})));
  assert.ok(Number.isInteger((await store.read('after-market',record.sourceTradingDate)).diagnostics.writer));
  const directory=path.join(temp.root,'after-market');
  // Simulate a process that died before rename: readers must retain the complete prior file.
  await fs.writeFile(path.join(directory,'2026-09-11.json.interrupted.tmp'),'{');
  assert.ok((await store.latest('after-market')).candidates.length===1);
  assert.throws(()=>store.file('after-market','../../escape'));
  assert.throws(()=>store.file('../escape','2026-09-11'));
  assert.throws(()=>store.file('after-market','2026-02-30'));
  const old=process.env.DAILY_TEST_API_KEY;
  process.env.DAILY_TEST_API_KEY='test-private-value-12345';
  try {
    const sanitized=await store.write('pre-market',record.targetTradingDate,{...record,
      apiKey:'never-store',diagnostics:{authorization:'hidden',note:'test-private-value-12345',url:'https://example.invalid/?crtfc_key=unknown-secret'}});
    const serialized=JSON.stringify(sanitized);
    for(const forbidden of ['never-store','hidden','test-private-value-12345','unknown-secret'])assert.ok(!serialized.includes(forbidden));
  } finally {if(old===undefined)delete process.env.DAILY_TEST_API_KEY;else process.env.DAILY_TEST_API_KEY=old;}
  await fs.writeFile(store.file('after-market','2026-09-10'),'{');
  await assert.rejects(()=>store.read('after-market','2026-09-10'),/DAILY_STORE_READ_FAILED/);
  console.log('Daily store: atomic replacement, restart read, interrupted write, concurrent writes, date validation, secret filtering, corruption checks passed');
} finally {await temp.cleanup();}
