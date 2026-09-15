import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {verifyIdentity} from './server_identity_guard.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const config=read('tmp/current-operations-validation.json');const before=read(path.join(config.root,'deployment-before.json'));
const identity=verifyIdentity(read('tmp/server-identity.json'),process.cwd(),13672);
assert.equal(read('package.json').version,'2.6.4');assert.equal(hash(fs.readFileSync('.env')),before.envHash,'ENV_CHANGED');
for(const [file,old]of Object.entries(before.files)){
 if(file.endsWith('heartbeat.json'))continue;const data=fs.readFileSync(file);
 assert.ok(hash(data)===old.hash||(file.endsWith('.jsonl')&&hash(data.subarray(0,old.size))===old.hash),'DATA_CHANGED: '+file);
}
for(const [file,expected]of Object.entries(before.sourceHashes))assert.equal(hash(fs.readFileSync(file)),expected,'VALIDATED_SOURCE_CHANGED: '+file);
for(const host of ['localhost','192.168.0.9']){const r=await fetch('http://'+host+':3000/health',{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);const h=await r.json();assert.equal(h.version,'2.6.4');assert.equal(h.liveTrading,false);}
const s=(await(await fetch('http://localhost:3000/api/daily/agents/status')).json()).result;assert.equal(s.active,null);
const result={...identity,checkedAt:new Date().toISOString(),version:'2.6.4',healthLocal:200,healthLan:200,envUnchanged:true,dataPreserved:true,validatedSourceUnchanged:true};
fs.writeFileSync('tmp/server-preflight-pass.json',JSON.stringify(result));console.log(JSON.stringify(result));
