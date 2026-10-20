/** Local-only public-market gateway plus an authenticated loopback-only SSH reverse. */
import 'dotenv/config';import http from 'node:http';import {spawn} from 'node:child_process';import {createKisRequest} from '../src/services/kis_request.js';import {createMarketGatewayHandler} from '../src/v2/market_gateway.js';
if(process.env.KSTOCK_BROKER_ENABLED==='true'||process.env.KSTOCK_LIVE_TRADING_ENABLED==='true')throw Error('LIVE_TRADING_MUST_REMAIN_OFF');
const server=http.createServer(createMarketGatewayHandler({request:createKisRequest()}));server.requestTimeout=15000;server.headersTimeout=5000;
let tunnel=null,stopping=false;function connect(){if(stopping||!process.argv.includes('--reverse'))return;tunnel=spawn('/usr/bin/ssh',['-i','/Users/ari/.ssh/ari-production-key.pem','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-N','-R','127.0.0.1:18880:127.0.0.1:18880','ubuntu@1.201.113.102'],{stdio:'ignore'});tunnel.on('exit',()=>{tunnel=null;if(!stopping)setTimeout(connect,10000);});tunnel.on('error',()=>{});}
server.listen(18880,'127.0.0.1',()=>{console.log('KSTOCK_PUBLIC_MARKET_GATEWAY_LOOPBACK_ONLY_READY');connect();});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;tunnel?.kill('SIGTERM');server.close(()=>process.exit(0));});
