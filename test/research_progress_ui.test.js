import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/research-progress.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){const calls=[],timers=new Map(),events={},documentEvents={};let next=0;
 const node=()=>({children:[],listeners:{},textContent:'',disabled:false,setAttribute(){},append(...items){this.children.push(...items);},prepend(item){this.children.unshift(item);},addEventListener(name,fn){this.listeners[name]=fn;}});const root=node(),home=node(),location={hash:'#agent-dashboard'};
 const document={visibilityState:'visible',createElement:node,getElementById:id=>id==='home-backend-research-progress'?home:root,addEventListener:(name,fn)=>documentEvents[name]=fn};
 vm.runInNewContext(source,{document,window:{addEventListener:(name,fn)=>events[name]=fn},location,AbortController,Intl,Date,setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),candidateRequest:(url,success,options)=>new Promise((resolve,reject)=>calls.push({url,options,resolve,reject}))});
 const [panel,retry]=root.children[0].children;return {calls,timers,events,documentEvents,panel,retry,document,home,location};}
test('research view ignores replaced requests and identifies actual work time',async()=>{const h=setup();assert.equal(h.retry.disabled,true);assert(h.calls[0].options.signal);h.events.hashchange();assert.equal(h.calls[0].options.signal.aborted,true);
 h.calls[1].resolve({status:'EVIDENCE_RECORDED',workAt:'2026-10-20T00:00:00Z',sourceCollection:'NOT_RUN',newOfficialDocuments:0});await tick();assert.match(h.panel.textContent,/실제 작업/);assert.match(h.panel.textContent,/신규 공식 자료 0건/);const text=h.panel.textContent;
 h.calls[0].resolve({status:'RUNNING',newOfficialDocuments:99});await tick();assert.equal(h.panel.textContent,text);assert.equal(h.retry.disabled,false);
 h.retry.listeners.click();h.calls[2].resolve({status:'UNVERIFIED',reason:'RESEARCH_WORK_STALE',newOfficialDocuments:null});await tick();assert.match(h.panel.textContent,/다시 게시해도/);assert.match(h.panel.textContent,/신규 공식 자료 미확인/);
});
test('report timeouts and authentication errors recover the retry button',async()=>{const h=setup();const request=h.calls[0];request.options.signal.addEventListener('abort',()=>request.reject(Object.assign(new Error('timeout'),{name:'AbortError'})));[...h.timers.values()][0]();await tick();assert.match(h.panel.textContent,/시간이 초과/);assert.equal(h.retry.disabled,false);
 h.retry.listeners.click();h.calls[1].reject(new Error('AUTH'));await tick();assert.match(h.panel.textContent,/인증 설정/);assert.equal(h.retry.disabled,false);
 h.retry.listeners.click();h.events.pagehide();assert.equal(h.calls[2].options.signal.aborted,true);assert.equal(h.retry.disabled,false);h.calls[2].resolve({status:'RUNNING'});await tick();assert.doesNotMatch(h.panel.textContent,/에이전트 작업 실행 중/);
});

test('home displays report freshness and refreshes on return without claiming collection',async()=>{
 const h=setup();h.calls[0].resolve({status:'UNVERIFIED',reason:'RESEARCH_WORK_STALE',sourceCollection:'NOT_RUN',newOfficialDocuments:0});await tick();
 assert.equal(h.home.textContent,h.panel.textContent);assert.match(h.home.textContent,/오래되었습니다/);assert.match(h.home.textContent,/공식 원천 수집 미실행/);
 h.location.hash='#overview';h.events.hashchange();assert.equal(h.calls.length,2);assert.match(h.home.textContent,/확인 중/);
 h.calls[1].reject(new Error('AUTH'));await tick();assert.equal(h.home.textContent,h.panel.textContent);assert.match(h.home.textContent,/인증 설정/);
 h.location.hash='#paper-portfolio';h.events.hashchange();assert.equal(h.calls.length,2);
 h.location.hash='';h.documentEvents.visibilitychange();assert.equal(h.calls.length,3);
 h.calls[2].resolve({status:'RUNNING',sourceCollection:'NOT_RUN'});await tick();assert.match(h.home.textContent,/에이전트 작업 실행 중/);assert.match(h.home.textContent,/신규 공식 자료 미확인/);
});
