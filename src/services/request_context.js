import {AsyncLocalStorage} from 'node:async_hooks';
import {setTimeout as delay} from 'node:timers/promises';
const context=new AsyncLocalStorage();
export const withRequestSignal=(signal,task)=>context.run(signal,task);
export const currentRequestSignal=()=>context.getStore();
export function checkCancelled(){context.getStore()?.throwIfAborted();}
export async function requestDelay(ms){await delay(ms,undefined,{signal:context.getStore()});}
export function providerFetch(url,options={}){
  checkCancelled();
  const configured=Number(process.env.KSTOCK_PROVIDER_TIMEOUT_MS||30000);
  const timeout=Number.isFinite(configured)?Math.max(1000,Math.min(configured,120000)):30000;
  const signals=[AbortSignal.timeout(timeout),context.getStore(),options.signal].filter(Boolean);
  return fetch(url,{...options,signal:AbortSignal.any(signals)});
}
