export function registerDailyRoutes(app,service,scheduler) {
  function fail(res,error) {
    const codes={DAILY_BUSY:409,INVALID_DAILY_PHASE:400,DAILY_STORE_READ_FAILED:500};
    const code=Object.hasOwn(codes,error.message)?error.message:'DAILY_REQUEST_FAILED';
    res.status(codes[code]||500).json({success:false,error:code,message:'Daily 처리 실패 · 상태를 확인해 주세요.'});
  }
  for(const route of ['after-market','pre-market','revalidate']) {
    app.post('/api/daily/'+route,(req,res)=>{
      try {
        if(req.body && (typeof req.body!=='object'||Array.isArray(req.body)))return res.status(400).json({success:false,error:'INVALID_DAILY_OPTIONS'});
        // HTTP uses bounded defaults. CLI/service callers can supply validated limits.
        const {job}=service.start(route==='revalidate'?'pre-market':route);
        res.status(202).json({success:true,job,statusUrl:'/api/daily/status'});
      } catch(error) {fail(res,error);}
    });
  }
  for(const name of ['today','tomorrow','status']) {
    app.get('/api/daily/'+name,async(req,res)=>{
      try {
        const result=await service[name]();
        res.set('Cache-Control','no-store');
        res.json({success:true,result:name==='status'?{...result,scheduler:scheduler.status()}:result});
      } catch(error) {fail(res,error);}
    });
  }
  app.use('/api/daily',(error,req,res,next)=>{
    if(res.headersSent)return next(error);
    res.status(error.type==='entity.too.large'?413:400).json({success:false,error:'INVALID_DAILY_REQUEST',message:'요청 형식을 확인해 주세요.'});
  });
}
