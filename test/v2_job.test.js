import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runCandidateJob } from '../src/v2/run_candidates.js';
test('offline job never calls providers, writes private output and preserves input', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'kstock-job-'));
  try {
    const inputPath = path.join(directory, 'input.json'), outputPath = path.join(directory, 'latest.json');
    const raw = JSON.stringify({ analysisDate: '2026-09-29T00:00:00Z', companies: [], evidence: [] });
    await writeFile(inputPath, raw);
    const summary = await runCandidateJob({ inputPath, outputPath, env: { KSTOCK_V2_SEC_ENABLED: 'true' }, refresh: () => { throw new Error('network forbidden'); } });
    assert.equal(summary.mode, 'OFFLINE');
    assert.equal(await readFile(inputPath, 'utf8'), raw);
    assert.equal((await stat(outputPath)).mode & 0o777, 0o600);
    await assert.rejects(runCandidateJob({ inputPath, outputPath: inputPath }), /CONFLICT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('unsafe collection fails before accessing missing input', async () => {
  await assert.rejects(runCandidateJob({ inputPath: '/missing', env: { KSTOCK_LIVE_TRADING_ENABLED: 'true' } }), /live trading/);
  await assert.rejects(runCandidateJob({ inputPath: '/missing', collect: true, env: {} }), /NOT_ENABLED/);
});
