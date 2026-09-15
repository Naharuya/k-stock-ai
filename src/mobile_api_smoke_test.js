import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {testWorkspace,startTestServer,lanIPv4,projectRoot} from './server_test_helpers.js';
const workspace=await testWorkspace();let server;
try{
  server=await startTestServer(workspace.root);
  const address=lanIPv4()[0];
  if(!address){console.log('Mobile LAN API NOT RUN: no LAN IPv4');process.exitCode=1;}
  else{
    const base='http://'+address+':'+server.port;
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await fetch(base+'/api/daily/latest')).status,401,'Unpaired LAN clients stay protected');
    const issued=await fetch(server.base+'/api/access/code',{method:'POST'});assert.equal(issued.status,200);const code=(await issued.json()).result.code;
    const paired=await fetch(base+'/api/access/pair',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({code})});assert.equal(paired.status,200);
    const cookie=paired.headers.get('set-cookie').split(';')[0];
    for(const name of ['latest','report','candidates','portfolio','agents/status']){
      const response=await fetch(base+'/api/daily/'+name,{headers:{Cookie:cookie}});assert.equal(response.status,200);
      const body=await response.json();assert.equal(body.success,true);
      if(['latest','report'].includes(name)){
        for(const key of ['date','startedAt','completedAt','marketRegime','topCandidates','riskCandidates','portfolioExitStatus','newRiskCount','agentStatus','errors'])assert.ok(Object.hasOwn(body.result,key));
        assert.equal(body.result.topCandidates.length,5);assert.equal(body.result.automaticOrders,false);
      }
      if(name==='candidates')assert.equal(body.result.length,5);
    }
    for(const command of ['run','status']){
      // spawnSync would block this test only; the HTTP server runs in its own process.
      const result=spawnSync(process.execPath,[path.join(projectRoot,'src/daily_agents_cli.js'),command],{cwd:workspace.root,env:{...process.env,PORT:String(server.port),KSTOCK_TLS_CERT:'',DOTENV_CONFIG_PATH:path.join(workspace.root,'missing.env')},windowsHide:true,encoding:'utf8',timeout:15000});
      assert.equal(result.status,0,'Daily CLI '+command);assert.equal(JSON.parse(result.stdout).success,true);
    }
    console.log('Mobile API PASS: PC-origin LAN request, protected pairing/session, five Morning Brief APIs, 5-card payload. Physical phone NOT TESTED.');
  }
}finally{await server?.stop();await workspace.cleanup();}
