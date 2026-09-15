import {dataPath,profileId} from './profile_service.js';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
export function installAccess(app,{root=dataPath('access'),now=()=>Date.now()}={}){
  fs.mkdirSync(root,{recursive:true});
  const file=path.join(root,'sessions.json');
  let sessions;
  try{sessions=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(sessions))throw Error();}catch(e){if(e.code!=='ENOENT')throw new Error('ACCESS_STORE_INVALID');sessions=[];}
  let pairing=null;
  const attempts=new Map();
  const local=req=>req.headers['sec-fetch-site']!=='cross-site'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||'');
  const originOK=req=>!req.headers.origin?local(req):req.headers.origin===(req.socket.encrypted?'https://':'http://')+req.headers.host;
  const token=req=>String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kstock_session='))?.slice(15)||'';
  const authenticated=req=>local(req)||sessions.some(s=>s.hash===hash(token(req))&&s.expires>now());
  function save(){sessions=sessions.filter(s=>s.expires>now()).slice(-50);const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(sessions),{mode:0o600});fs.renameSync(tmp,file);}
  app.get('/api/access/session',(req,res)=>res.set('Cache-Control','no-store').json({success:true,result:{authenticated:authenticated(req),local:local(req),tls:Boolean(req.socket.encrypted),owner:profileId()}}));
  app.post('/api/access/code',(req,res)=>{
    if(!local(req)||!originOK(req))return res.status(403).json({success:false,error:'LOCAL_OWNER_REQUIRED'});
    pairing={code:randomBytes(16).toString('hex'),expires:now()+600000};
    res.set('Cache-Control','no-store').json({success:true,result:{code:pairing.code,expiresAt:new Date(pairing.expires).toISOString()}});
  });
  app.post('/api/access/pair',(req,res)=>{
    const peer=req.socket.remoteAddress?.replace(/^::ffff:/,'')||'';
    if(!req.socket.encrypted&&!/^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(peer)&&peer!=='::1')return res.status(426).json({success:false,error:'HTTPS_REQUIRED'});
    if(!originOK(req))return res.status(403).json({success:false,error:'ORIGIN_REJECTED'});
    const ip=req.socket.remoteAddress,a=attempts.get(ip)||{count:0,until:now()+600000};
    if(a.until<now()){a.count=0;a.until=now()+600000;}a.count++;attempts.set(ip,a);
    if(attempts.size>1000)for(const [k,v] of attempts)if(v.until<now())attempts.delete(k);
    if(a.count>10)return res.status(429).json({success:false,error:'PAIRING_RATE_LIMIT'});
    const supplied=String(req.body?.code||'');
    if(!pairing||pairing.expires<now()||Buffer.byteLength(supplied)!==Buffer.byteLength(pairing.code)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(pairing.code)))return res.status(401).json({success:false,error:'INVALID_PAIRING_CODE'});
    const session=randomBytes(32).toString('hex');sessions.push({hash:hash(session),expires:now()+7*86400000});save();pairing=null;
    res.set('Set-Cookie','kstock_session='+session+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800'+(req.socket.encrypted?'; Secure':''));
    res.json({success:true,result:{paired:true}});
  });
  app.post('/api/access/revoke',(req,res)=>{if(!local(req)||!originOK(req))return res.sendStatus(403);sessions=[];save();res.json({success:true});});
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!authenticated(req))return res.status(401).json({success:false,error:'DEVICE_PAIRING_REQUIRED'});
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!originOK(req))return res.status(403).json({success:false,error:'ORIGIN_REJECTED'});
    next();
  });
}
