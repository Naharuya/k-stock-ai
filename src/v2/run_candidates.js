import { createKrRefresh } from './kr_collect.js';
import { saveCandidateSnapshot } from './performance_tracking.js';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createCandidateService } from './candidate_service.js';
import { createOwnershipRefresh } from './ownership_refresh.js';
import { createSec13fRefresh } from './sec_13f_refresh.js';
import { createForm4Refresh } from './sec_form4_refresh.js';
import { assertSafeKStockV2Environment } from './scoring.js';
import { createFinancialRefresh } from './sec_financials.js';
import { createUsPriceRefresh } from './us_prices.js';

export async function runCandidateJob({ inputPath, outputPath, collect = false, env = process.env, now = () => new Date(), refresh } = {}) {
  assertSafeKStockV2Environment(env);
  if (!inputPath) throw new Error('INPUT_REQUIRED');
  if (outputPath && path.resolve(outputPath) === path.resolve(inputPath)) throw new Error('INPUT_OUTPUT_CONFLICT');
  let apply = async input => input;
  if (collect) {
    if (![env.KSTOCK_V2_OWNERSHIP_ENABLED, env.KSTOCK_V2_SEC_ENABLED, env.KSTOCK_V2_FORM4_ENABLED, env.KSTOCK_V2_FINANCIALS_ENABLED, env.KSTOCK_V2_US_PRICE_ENABLED, env.KSTOCK_V2_KR_ENABLED].includes('true')) throw new Error('COLLECTOR_NOT_ENABLED');
    const dart = createOwnershipRefresh({ env }), sec = createSec13fRefresh({ env }), form4 = createForm4Refresh({ env });
    const financial = createFinancialRefresh({ env });
    const kr = createKrRefresh({ env });
    const prices = createUsPriceRefresh({ env });
    apply = refresh || (async input => prices(await financial(await form4(await sec(await dart(await kr(input)))))));
  }
  // Offline validation never invokes refresh, even if provider flags are enabled.
  const read = async filename => {
    const input = JSON.parse(await readFile(filename, 'utf8'));
    if (collect) input.analysisDate = now().toISOString();
    return JSON.stringify(input);
  };
  const report = await createCandidateService({ inputPath, env, read, refresh: apply, requireVerifiedRecommendations: true }).load();
  if (report.status === 'NO_DATA') throw new Error('INPUT_MISSING');
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    await saveCandidateSnapshot(report, path.join(path.dirname(outputPath), 'snapshots'));
    const temporary = `${outputPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify({ ...report, schemaVersion: 1, runMode: collect ? 'COLLECT' : 'OFFLINE' }) + '\n', { flag: 'wx', mode: 0o600 });
      await rename(temporary, outputPath);
    } finally { await unlink(temporary).catch(() => {}); }
  }
  return { mode: collect ? 'COLLECT' : 'OFFLINE', status: report.status, analysisDate: report.analysisDate,
    evaluatedCount: report.candidates.length, KR: report.KR.length, GLOBAL: report.GLOBAL.length,
    reviewCount: report.candidates.filter(item => item.reviewRequired?.length).length };
}

export function candidateJobErrorCode(error) {
  const message = error?.message || '';
  if (message === 'SEC network request failed') return 'SEC_NETWORK_UNAVAILABLE';
  if (message === 'SEC request failed: 403') return 'SEC_ACCESS_DENIED';
  if (message === 'SEC request failed: 429') return 'SEC_RATE_LIMIT';
  if (message.startsWith('Form 4 history exceeds') || message.startsWith('SEC history file limit')) return 'SEC_COLLECTION_LIMIT';
  if (/^(PRICE|SPLITS)_(API_KEY_REQUIRED|NETWORK_UNAVAILABLE|HTTP_UNAVAILABLE|RESPONSE_INVALID|PROVIDER_UNAVAILABLE|PROVIDER_COOLDOWN|LOCAL_REQUEST_LIMIT|COLLECTION_BUSY|STATE_INVALID)$/.test(message)) return message;
  if (message === 'INPUT_MISSING') return 'INPUT_MISSING';
  return 'CANDIDATE_JOB_FAILED';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--check', '--collect'].includes(arg)) || args.length !== 1) throw new Error('USAGE');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    console.log(JSON.stringify(await runCandidateJob({
      inputPath: path.resolve(process.env.KSTOCK_V2_INPUT_PATH || path.join(root, 'data/v2-input.json')),
      collect: args[0] === '--collect',
      outputPath: args[0] === '--collect' ? path.resolve(process.env.KSTOCK_V2_OUTPUT_PATH || path.join(root, 'data/v2/latest.json')) : undefined,
    })));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: candidateJobErrorCode(error) }));
    process.exitCode = 1;
  }
}
