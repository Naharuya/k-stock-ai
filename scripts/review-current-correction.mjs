// Review already downloaded official originals. No network or source activation.
import dotenv from 'dotenv';
import {readFile} from 'node:fs/promises';
import {reviewCurrentCorrection,currentFilingUrl} from '../src/v2/current_correction.js';
import {readCurrent,saveCurrent,lockedCurrent} from '../src/v2/current_collection_io.js';
import {assertSafeKStockV2Environment} from '../src/v2/scoring.js';
assertSafeKStockV2Environment({...dotenv.parse(await readFile('.env','utf8')),...process.env});
const [ticker,metadataPath,originalId,amendmentId,originalPath,amendmentPath]=process.argv.slice(2);
const metadata=JSON.parse(await readFile(metadataPath,'utf8')),r=metadata.filings.recent;
function filing(id){const i=r.accessionNumber.indexOf(id);if(i<0)throw Error('CORRECTION_FILING_NOT_FOUND');const f={accessionNumber:id,filingDate:r.filingDate[i],primaryDocument:r.primaryDocument[i]};f.url=currentFilingUrl(ticker,f);return f;}
const review=reviewCurrentCorrection({ticker,original:filing(originalId),amendment:filing(amendmentId),originalXml:await readFile(originalPath,'utf8'),amendmentXml:await readFile(amendmentPath,'utf8'),checkedAt:new Date().toISOString()});
const file='data/v2/influence/current-corrections.json';
await lockedCurrent(file,async()=>{const old=await readCurrent(file);const existing=old?.reviews?.find(r=>r.amendmentDocumentId===review.amendmentDocumentId);if(existing&&existing.amendmentSourceHash!==review.amendmentSourceHash)throw Error('CORRECTION_SOURCE_VERSION_CONFLICT');await saveCurrent(file,{schemaVersion:1,checkedAt:review.checkedAt,reviews:existing?old.reviews:[...(old?.reviews||[]),review]});});
console.log(JSON.stringify(review));
