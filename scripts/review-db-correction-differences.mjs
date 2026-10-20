import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { reviewCorrectionDifferences } from '../src/v2/correction_difference_review.js';
const root=process.cwd();
if(root!=='/Users/ari/ARI/projects/k-stock-ai')throw new Error('PROJECT_PATH_MISMATCH');
const folder=path.join(root,'data/v2/verification/db-correction-1791783200385');
const audit=JSON.parse(fs.readFileSync(path.join(folder,'numeric-audit.json'),'utf8'));
for(const receipt of [audit.originalReceipt,audit.correctionReceipt]){
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,receipt+'.zip'))).digest('hex');
 if(hash!==audit.sourceArchiveHashes[receipt])throw new Error('SOURCE_ARCHIVE_HASH_MISMATCH');
}
const report={checkedAt:new Date().toISOString(),...reviewCorrectionDifferences(audit,{valuationDate:'2026-10-08'})};
const out=path.join(folder,'difference-review-'+Date.now()+'.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({file:path.relative(root,out),resolved:report.resolved,unresolved:report.unresolved,externalReads:0,status:report.status}));
