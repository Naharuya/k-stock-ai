import assert from 'node:assert/strict';
import {runAgent} from './services/llm_service.js';
const originalFetch=globalThis.fetch;
const previous={...process.env};
const input={systemPrompt:'Return JSON only',userPrompt:'Synthetic offline fixture',mockResult:{score:0,reasons:[]}};
const ok={score:12,reasons:['fixture']};
const response=content=>new Response(JSON.stringify({done:true,message:{content}}));
try {
  process.env.KSTOCK_AI_MODE='mock';
  globalThis.fetch=()=>{throw Error('No network in mock mode');};
  assert.equal(await runAgent(input),input.mockResult);
  process.env.KSTOCK_AI_MODE='openai';
  await assert.rejects(runAgent(input),/AI_MODE_MUST_BE_MOCK_OR_OLLAMA/);
  process.env.KSTOCK_AI_MODE='ollama';
  delete process.env.KSTOCK_OLLAMA_BASE_URL;
  await assert.rejects(runAgent(input),/OLLAMA_BASE_URL_REQUIRED/);
  process.env.KSTOCK_OLLAMA_BASE_URL='https://api.openai.com/';
  await assert.rejects(runAgent(input),/OLLAMA_LOOPBACK_URL_REQUIRED/);
  process.env.KSTOCK_OLLAMA_BASE_URL='http://127.0.0.1:11435';
  process.env.KSTOCK_DEFAULT_MODEL='fixture-model';
  let calls=0,active=0,peak=0;
  globalThis.fetch=async(url,options)=>{
    calls++;active++;peak=Math.max(peak,active);
    assert.equal(String(url),'http://127.0.0.1:11435/api/chat');
    assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,undefined);
    const body=JSON.parse(options.body);assert.equal(body.model,'fixture-model');assert.equal(body.stream,false);assert.equal(body.format,'json');
    await new Promise(r=>setTimeout(r,10));active--;return response(JSON.stringify(ok));
  };
  assert.deepEqual(await Promise.all([runAgent(input),runAgent(input),runAgent(input)]),[ok,ok,ok]);
  assert.equal(peak,1);assert.equal(calls,3);
  for(const content of ['not JSON','[]','null','{"score":"12","reasons":[]}','{}']) {
    globalThis.fetch=async()=>response(content);
    await assert.rejects(runAgent(input),/OLLAMA_INVALID_(JSON|AGENT_RESULT)/);
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({done:false,message:{content:JSON.stringify(ok)}}));
  await assert.rejects(runAgent(input),/OLLAMA_RESPONSE_INCOMPLETE/);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response('PRIVATE_ERROR_FIXTURE',{status:429});};
  await assert.rejects(runAgent(input),/^Error: OLLAMA_HTTP_429$/);assert.equal(calls,1);
  globalThis.fetch=async()=>{throw Error('PRIVATE_ERROR_FIXTURE');};
  await assert.rejects(runAgent(input),/^Error: OLLAMA_REQUEST_FAILED$/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(runAgent({...input,signal:controller.signal}),/OLLAMA_REQUEST_ABORTED/);
  process.env.KSTOCK_AI_TIMEOUT_MS='1000';
  globalThis.fetch=async(url,{signal})=>new Promise((resolve,reject)=>{
    const keepAlive=setTimeout(()=>resolve(response(JSON.stringify(ok))),3000);
    signal.addEventListener('abort',()=>{clearTimeout(keepAlive);reject(signal.reason);},{once:true});
  });
  await assert.rejects(runAgent(input),/OLLAMA_REQUEST_ABORTED/);
  globalThis.fetch=async()=>response(JSON.stringify(ok));
  assert.deepEqual(await runAgent(input),ok,'Queue recovers after failed or aborted inference');
  console.log('Ollama adapter PASS: mock isolation, no cloud fallback, endpoint validation, serialized inference, JSON contract, safe errors, no retry, cancellation and timeout.');
}finally{
  globalThis.fetch=originalFetch;
  for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];
  Object.assign(process.env,previous);
}
