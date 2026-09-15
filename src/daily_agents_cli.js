import 'dotenv/config';
const command=process.argv[2]||'status';
if(!['run','status'].includes(command))throw new Error('Use run or status');
const base=(process.env.KSTOCK_TLS_CERT?'https':'http')+'://localhost:'+Number(process.env.PORT||3000);
const response=await fetch(base+(command==='run'?'/api/daily/run':'/api/daily/agents/status'),command==='run'?{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({force:process.argv.includes('--force')})
}:{});
const result=await response.json();
if(command==='status'){const r=result.result||{};console.log(JSON.stringify({success:result.success,active:r.active,lastJob:r.lastJob,scheduler:r.scheduler,agentStatus:r.agentStatus,lastReport:r.lastRun?{date:r.lastRun.date,status:r.lastRun.status,completedAt:r.lastRun.completedAt}:null},null,2));}
else console.log(JSON.stringify(result,null,2));
if(!response.ok)process.exitCode=1;
