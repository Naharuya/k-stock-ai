import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedPath,privateIPv4,previewDuration} from './validation-relay.mjs';
test('preview allows public research GETs only',()=>{
 for(const p of ['/','/app.js','/paper-backup.js','/styles.css','/health','/api/v2/research/dashboard','/api/v2/candidates/005930','/api/v2/stock-performance/005930'])assert.equal(allowedPath('GET',p),true);
});
test('preview rejects writes, account data, arbitrary paths and source code',()=>{
 for(const verb of ['POST','PUT','PATCH','DELETE','CONNECT']){assert.equal(allowedPath(verb,'/api/v2/candidates'),false);assert.equal(allowedPath(verb,'/paper-backup.js'),false);}
 for(const p of ['/.env','/../.env','/api/watchlist','/api/analyze','/api/orders','/api/account','http://evil.invalid','/src/server.js'])assert.equal(allowedPath('GET',p),false);
});
test('preview refuses public and malformed bind addresses',()=>{
 for(const host of ['0.0.0.0','127.0.0.1','8.8.8.8','192.168.999.1','10.0.1','example.com'])assert.equal(privateIPv4(host),false);
 for(const host of ['192.168.0.16','10.0.0.2','172.16.0.2','172.31.255.2'])assert.equal(privateIPv4(host),true);
});

test('preview duration can shorten but never exceed the approved 15 minutes',()=>{
 assert.equal(previewDuration(),900);assert.equal(previewDuration('660'),660);
 for(const value of [0,-1,901,1.5,'invalid',Infinity])assert.throws(()=>previewDuration(value),/OUT_OF_RANGE/);
});
