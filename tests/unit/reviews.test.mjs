import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as crypto from 'node:crypto';

function load(path, require) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,Response,Request,Buffer,console,process:{env:{}}});
  return exports;
}
function fixture(count=1) {
  const writes=[];
  const db={feedback:{create:async ({data})=>{writes.push(data);return {id:'new-review'};}},rateLimit:{upsert:async()=>({count})}};
  const http=load('../../src/lib/security/http.ts',name=>{
    if(name==='@/lib/db')return {db};
    if(name==='node:crypto')return crypto;
    if(name==='zod')return zod;
    if(name==='./origins')return {trustedOrigins:()=>['http://localhost:3000']};
    throw Error(name);
  });
  const route=load('../../src/app/api/reviews/route.ts',name=>{
    if(name==='@/lib/db')return {db};
    if(name==='zod')return zod;
    if(name==='@/lib/security/http')return http;
    throw Error(name);
  });
  const request=(data,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/reviews',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)});
  return {writes,route,request};
}
const input={name:'  Test Traveller  ',rating:4,journey:' Jeddah to Makkah ',message:'A comfortable journey with our family.'};
test('visitor reviews save as pending and cannot self-approve or feature',async()=>{
  const f=fixture();
  const response=await f.route.POST(f.request({...input,status:'Approved',featured:true,isSample:true}));
  assert.equal(response.status,201);
  assert.equal(f.writes.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0])),{customer:'Test Traveller',rating:4,journey:'Jeddah to Makkah',message:input.message,type:'Review',status:'Pending',featured:false,isSample:false});
});
test('invalid reviews never reach the database',async()=>{
  const f=fixture();
  for(const change of [{rating:0},{rating:6},{rating:2.5},{name:' '},{message:'short'},{message:'x'.repeat(1501)}]) assert.equal((await f.route.POST(f.request({...input,...change}))).status,400);
  assert.equal(f.writes.length,0);
});
test('cross-origin submissions are rejected',async()=>{
  const f=fixture();assert.equal((await f.route.POST(f.request(input,'https://other.example'))).status,403);assert.equal(f.writes.length,0);
});
test('rate-limited submissions do not save reviews',async()=>{
  const f=fixture(6);assert.equal((await f.route.POST(f.request(input))).status,429);assert.equal(f.writes.length,0);
});
