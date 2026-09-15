import {seoulClock} from './services/trading_day_service.js';
export function registerMorningRoutes(app,service,scheduler){
  const safe=handler=>async(req,res)=>{try{res.set('Cache-Control','no-store');await handler(req,res);}catch(error){
    const code=['INVALID_ENTRY','INVALID_MORNING_OPTIONS','MORNING_BUSY','PORTFOLIO_CONFLICT'].includes(error.message)?error.message:'MORNING_REQUEST_FAILED';
    res.status(['MORNING_BUSY','PORTFOLIO_CONFLICT'].includes(code)?409:code.startsWith('INVALID')?400:500).json({success:false,error:code});
  }};
  app.post('/api/daily/cancel',safe(async(req,res)=>res.json({success:true,result:service.cancel()})));
  app.post('/api/daily/run',safe(async(req,res)=>{
    const body=req.body||{};
    if(typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['force','scope'].includes(k)))throw new Error('INVALID_MORNING_OPTIONS');
    const {job}=service.start(body);res.status(202).json({success:true,job,statusUrl:'/api/daily/agents/status'});
  }));
  app.get('/api/daily/agents/status',safe(async(req,res)=>{await scheduler.refreshStatus?.();res.json({success:true,result:{...await service.status(),scheduler:scheduler.status()}})}));
  app.get('/api/daily/latest',safe(async(req,res)=>res.json({success:true,result:await service.store.latest()})));
  app.get('/api/daily/report',safe(async(req,res)=>res.json({success:true,result:await service.store.read(seoulClock(service.now()).date)})));
  app.get('/api/daily/candidates',safe(async(req,res)=>res.json({success:true,result:(await service.store.read(seoulClock(service.now()).date))?.topCandidates||[]})));
  app.get('/api/daily/portfolio',safe(async(req,res)=>res.json({success:true,result:{positions:await service.portfolio.read(),evaluations:(await service.store.read(seoulClock(service.now()).date))?.portfolioExitStatus||[]}})));
  app.post('/api/daily/portfolio',safe(async(req,res)=>{
    if(req.body?.onlyIfMissing!==undefined&&typeof req.body.onlyIfMissing!=='boolean')throw new Error('INVALID_ENTRY');
    res.json({success:true,result:await service.portfolio.upsert(req.body?.entry,{onlyIfMissing:req.body?.onlyIfMissing===true,expectedEntry:req.body?.expectedEntry})});
  }));
  app.delete('/api/daily/portfolio/:code',safe(async(req,res)=>res.json({success:true,result:await service.portfolio.remove(req.params.code,{entry:req.body?.entry})})));
}
