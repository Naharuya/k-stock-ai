import {createLogger,errorCode} from './log_service.js';
export function healthSnapshot({version,scheduler,uptime=process.uptime(),env=process.env}){
  const status=scheduler.status();
  return {ok:true,service:'k-stock-ai',version,uptime:Math.floor(uptime),dailyAgentEnabled:status.enabled,schedulerStatus:status,
    mode:['mock','ollama','live','hybrid'].includes(env.KSTOCK_AI_MODE)?env.KSTOCK_AI_MODE:'mock',
    dartEnabled:env.KSTOCK_DART_ENABLED==='true',liveTrading:env.KSTOCK_LIVE_TRADING_ENABLED==='true'};
}
export function installErrorHandler(app,logger){
  app.use((error,req,res,next)=>{
    logger.error('HTTP_REQUEST_FAILED',{code:errorCode(error),method:req.method,route:req.route?.path||'unmatched'});
    if(res.headersSent)return next(error);
    const status=error.type==='entity.parse.failed'?400:error.type==='entity.too.large'?413:500;
    res.status(status).json({success:false,error:status===400?'INVALID_JSON':status===413?'PAYLOAD_TOO_LARGE':'REQUEST_FAILED'});
  });
}
export function installServerRuntime(server,{logger=createLogger(),stop=()=>{},drained=()=>true,deadlineMs=10000}={}){
  let stopping=false;
  async function shutdown(code,event){
    if(stopping)return;stopping=true;
    logger.info(event,{pid:process.pid});
    const deadline=Date.now()+deadlineMs;
    const timeout=setTimeout(()=>{server.closeAllConnections?.();process.exit(code);},deadlineMs);timeout.unref();
    try{
      await stop();
      await new Promise(resolve=>{server.close(()=>resolve());server.closeIdleConnections?.();});
      while(!drained()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
    }catch{logger.error('SERVER_SHUTDOWN_FAILED');}
    finally{clearTimeout(timeout);process.exit(code);}
  }
  server.requestTimeout=30000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
  server.on('error',error=>{logger.error('SERVER_LISTEN_FAILED',{code:errorCode(error)});void shutdown(1,'SERVER_STOPPING');});
  process.on('SIGTERM',()=>{void shutdown(0,'SERVER_STOPPING');});
  process.on('SIGINT',()=>{void shutdown(0,'SERVER_STOPPING');});
  // Do not continue in an unknown state after a fatal programming error; the supervisor recovers the process.
  process.on('uncaughtException',error=>{logger.error('UNCAUGHT_EXCEPTION',{code:errorCode(error)});void shutdown(1,'SERVER_STOPPING');});
  process.on('unhandledRejection',()=>{logger.error('UNHANDLED_REJECTION');void shutdown(1,'SERVER_STOPPING');});
  return {shutdown};
}
