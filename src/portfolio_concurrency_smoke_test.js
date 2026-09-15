import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function evaluatePosition(index)');
const end=source.indexOf("if($('saveEntry'))",start);
assert.ok(start>=0 && end>start);
const copy=value=>structuredClone(value);
const initial=[{entry:{stockCode:'005930',corpName:'A',registeredAt:'first'}},{entry:{stockCode:'000660',corpName:'B',registeredAt:'second'}}];

async function scenario(change){
  let stored=copy(initial);
  let complete;
  const response=new Promise(resolve=>{complete=resolve;});
  const context=vm.createContext({
    loadPositions:()=>copy(stored),savePositions:rows=>{stored=copy(rows);},
    document:{querySelector:()=>null},$:()=>({value:'2026'}),
    fetch:()=>response,renderPortfolio:()=>{},showStatus:()=>{},pct:String
  });
  vm.runInContext(source.slice(start,end),context);
  const pending=context.evaluatePosition(0);
  stored=change(copy(stored));
  complete({ok:true,json:async()=>({success:true,result:{evaluation:{labelKo:'done',exitPressure:0,pnlPct:null},currentAnalysis:{analyzedAt:'now'}}})});
  await pending;
  return stored;
}

const deleted=await scenario(rows=>rows.slice(1));
assert.deepEqual(deleted,[initial[1]],'Deleted position must not be restored');
const replaced=await scenario(rows=>{rows[0].entry.registeredAt='replacement';return rows;});
assert.equal(replaced[0].lastEvaluation,undefined,'New entry must not receive old evaluation');
const concurrent=await scenario(rows=>{rows[1].lastEvaluation={labelKo:'other result'};rows.unshift({entry:{stockCode:'035420'}});return rows;});
assert.equal(concurrent.length,3,'New position must survive');
assert.equal(concurrent[1].lastEvaluation.labelKo,'done','Moved position must receive its own result');
assert.equal(concurrent[2].lastEvaluation.labelKo,'other result','Other evaluation must survive');
console.log('Portfolio concurrency: 3 scenarios passed');
