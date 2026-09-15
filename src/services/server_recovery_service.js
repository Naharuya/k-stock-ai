export function createRecoverySupervisor({health,start,record=()=>{},now=()=>Date.now(),baseDelayMs=30000,maxDelayMs=300000}){
  let child=null,failures=0,restarts=0,nextStartAt=0,busy=false,stopping=false;
  async function tick(){
    if(busy||stopping)return;busy=true;
    try{
      let healthy=false;try{healthy=await health();}catch{}
      failures=healthy?0:failures+1;
      await record({healthy,managedPid:child?.pid||0,consecutiveFailures:failures});
      if(healthy){restarts=0;return;}
      if(child){if(failures>=3)child.kill();return;}
      if(now()<nextStartAt)return;
      const delayMs=Math.min(maxDelayMs,baseDelayMs*2**Math.min(restarts,10));
      restarts++;nextStartAt=now()+delayMs;
      try{
        const spawned=await start();child=spawned;
        const clear=()=>{if(child===spawned)child=null;};spawned.once('exit',clear);spawned.once('error',clear);
      }catch{await record({healthy:false,status:'START_FAILED',attempt:restarts,delayMs});}
    }finally{busy=false;}
  }
  return {tick,stop(){stopping=true;child?.kill();},status:()=>({managedPid:child?.pid||null,failures,nextStartAt,restarts})};
}
