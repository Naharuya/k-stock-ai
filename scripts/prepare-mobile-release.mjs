// Creates a review bundle, never deploys, signs, migrates or changes services.
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {assessMobileRelease} from '../src/v2/mobile_release_readiness.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [masterPath,apkPath]=process.argv.slice(2);if(!masterPath||!apkPath)throw Error('USAGE: node scripts/prepare-mobile-release.mjs MASTER_QA_JSON UNSIGNED_APK');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const base=path.join(root,'data/v2/verification');
const receipts={galaxy:await read(path.join(base,'galaxy-paper-full-integration-20261020.json')),iphone:await read(path.join(base,'ios-paper-full-integration-physical-20261020.json')),simulator:await read(path.join(base,'ios-paper-full-integration-simulator-20261020.json'))};
const master=await read(masterPath),backend=await read(path.join(base,'mobile-release-backend-review-20261020.json'));
const regressionPassed=master.overall==='TESTED_PASS'&&Object.values(master.results||{}).length===2&&Object.values(master.results).every(r=>r.status==='TESTED_PASS'&&r.totals.tests>0&&r.totals.pass===r.totals.tests&&r.totals.fail===0&&r.totals.skipped===0&&r.totals.cancelled===0);
await fs.access(apkPath);await fs.access(path.join(root,'ios/build/device/KStockLocal.app/KStockLocal'));
const assessment=assessMobileRelease({receipts,backend,regressionPassed,androidBuilt:true,iosBuilt:true,production:{androidSignedUpdateVerified:false,iosProductionTargetVerified:false,privacyFinalVerified:false}});
if(!assessment.reviewReady)throw Error('CURRENT_BUILD_OR_MOBILE_RECEIPTS_INCOMPLETE');
const stamp=new Date().toISOString().replace(/[^0-9]/g,''),output=path.join(root,'artifacts/release-prep',stamp),stage=path.join(output,'review');await fs.mkdir(stage,{recursive:true});
const manifest={...assessment,checkedAt:new Date().toISOString(),artifacts:[],verification:{master:master.cycleId,regression:master.results.regression.totals,androidContract:master.results.androidContract.totals,mobile:receipts,backend},excluded:['.env','data','node_modules','keystores','provisioning profiles','signed iOS validation artifacts'],distributionNotice:'REVIEW ONLY. Unsigned Android, local-development iOS, synthetic financial fixtures. No deployment performed.'};
async function copy(source,relative){const bytes=await fs.readFile(source);if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}/.test(bytes.toString('utf8')))throw Error('SECRET_PATTERN_BLOCKED:'+relative);const target=path.join(stage,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);manifest.artifacts.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
async function tree(relative){for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){const file=path.join(relative,entry.name);if(entry.isSymbolicLink())throw Error('SYMLINK_EXCLUDED');if(entry.isDirectory())await tree(file);else if(/\.(?:js|html|css|svg)$/.test(file))await copy(path.join(root,file),file);}}
await tree('public');await tree('src');for(const relative of ['package.json','package-lock.json','docs/ARI_COMPLIANCE_STANDARD.md','docs/KSTOCK_RELEASE_DATA_INVENTORY.md'])await copy(path.join(root,relative),relative);
await copy(apkPath,'android/k-stock-ai-2.6.5-unsigned.apk');
await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(stage,'README.txt'),'K-STOCK REVIEW BUNDLE\nNot a public release. Android APK is unsigned. iOS validation builds and profiles are intentionally excluded.\nInstall requirements are locked; no secrets or user data are included.\nSee manifest.json blockers before any production distribution.\n');
const archive=path.join(output,'kstock-mobile-review.zip'),zip=spawnSync('zip',['-q','-r',archive,'.'],{cwd:stage,encoding:'utf8'});if(zip.status!==0)throw Error('REVIEW_ARCHIVE_FAILED');
const bytes=await fs.readFile(archive),receipt={status:assessment.status,productionDistribution:assessment.productionDistribution,blockers:assessment.blockers,archive,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
