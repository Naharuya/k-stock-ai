import fs from 'node:fs/promises';
import path from 'node:path';
export async function temporaryStoreDirectory() {
  const base=path.resolve('.cache');
  await fs.mkdir(base,{recursive:true});
  const root=await fs.mkdtemp(path.join(base,'daily-test-'));
  return {root,async cleanup(){
    const relative=path.relative(base,root);
    if(relative.startsWith('..')||path.isAbsolute(relative)||!relative.startsWith('daily-test-'))throw new Error('UNSAFE_TEST_CLEANUP');
    await fs.rm(root,{recursive:true,force:true});
  }};
}
export const sourceDate='2026-09-11';
export const marketFixture={score:{status:'READY',regime:'NEUTRAL_MIXED'},kospi:{latestDate:'20260911'},kosdaq:{latestDate:'20260911'}};
export function recordFixture() {
  return {engineVersion:'2.6.0',generatedAt:'2026-09-11T07:00:00Z',sourceTradingDate:sourceDate,targetTradingDate:'2026-09-14',
    scanned:3989,eligible:3000,market:marketFixture,diagnostics:{status:'COMPLETE'},errors:[],
    candidates:[{code:'005930',name:'테스트전자',rankingScore:84.2,validationGrade:'A',committeeStatus:'INTEREST',committeeScore:80,
      price:100000,per:10,pbr:1,roe:18,styleTags:['VALUE'],reasons:[],risks:[],qualityFlags:[],riskLevel:'LOW',status:'READY',
      analysisTimestamp:'2026-09-11T07:00:00Z'}]};
}
