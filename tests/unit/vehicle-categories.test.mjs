import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";

const compile = path => ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const httpCode=compile("../../src/lib/security/http.ts");
const routeCode=compile("../../src/app/api/admin/vehicle-categories/route.ts");
function fixture(role="Administrator") {
  let categories=[{id:"sedan",name:"Sedan"},{id:"suv",name:"SUV"}];
  let vehicles=[{id:"car",category:"Sedan",version:3}];
  let audits=[];
  const db={
    $queryRaw:async()=>[],
    vehicleCategory:{
      findMany:async()=>categories.slice(),
      findUnique:async({where})=>structuredClone(categories.find(row=>row.id===where.id)||null),
      findFirst:async({where})=>categories.find(row=>row.id!==where.id?.not && row.name.toLowerCase()===where.name.equals.toLowerCase())||null,
      create:async({data})=>{const row={id:`category-${categories.length}`,name:data.name};categories.push(row);return row;},
      update:async({where,data})=>{const row=categories.find(row=>row.id===where.id);Object.assign(row,data);return row;},
      delete:async({where})=>{categories=categories.filter(row=>row.id!==where.id);},
    },
    vehicle:{
      updateMany:async({where,data})=>{vehicles=vehicles.map(row=>row.category===where.category?{...row,category:data.category,version:row.version+data.version.increment}:row);},
      findMany:async({where})=>vehicles.filter(row=>row.category===where.category).map(({id,version})=>({id,version})),
      count:async({where})=>vehicles.filter(row=>row.category===where.category).length,
    },
    auditLog:{create:async({data})=>audits.push(data)},
    $transaction:async action=>{const before=structuredClone({categories,vehicles,audits});try{return await action(db);}catch(error){({categories,vehicles,audits}=before);throw error;}},
  };
  const http={exports:{},Response,Buffer,console:{error(){}},require:name=>{
    if(name==="node:crypto")return crypto;
    if(name==="@/lib/db")return {db};
    if(name==="zod")return zod;
    if(name==="./origins")return {trustedOrigins:()=>["https://falak.test"]};
    throw Error(name);
  }};
  vm.runInNewContext(httpCode,http);
  const context={exports:{},require:name=>{
    if(name==="@/lib/auth")return {requireAdmin:async(resource,write)=>{assert.equal(resource,"vehicles");if(!role)throw new http.exports.HttpError(401,"Sign in");if(write&&role==="Viewer")throw new http.exports.HttpError(403,"Read only");return {id:"admin",role};}};
    if(name==="@/lib/db")return {db};
    if(name==="@/lib/security/http")return http.exports;
    if(name==="zod")return zod;
    throw Error(name);
  }};
  vm.runInNewContext(routeCode,context);
  return {state:()=>({categories,vehicles,audits}),call:async(method,payload,origin="https://falak.test")=>{
    const request=new Request("https://falak.test/api/admin/vehicle-categories",{method,headers:{Origin:origin,"Content-Type":"application/json"},...(payload?{body:JSON.stringify(payload)}:{})});
    const response=await context.exports[method](request);
    return {status:response.status,data:await response.json()};
  }};
}
test("administrators add categories and dropdown reads return saved names",async()=>{
  const f=fixture();const created=await f.call("POST",{name:"  Minibus  "});
  assert.equal(created.status,201);assert.equal(created.data.category.name,"Minibus");
  assert.ok((await f.call("GET")).data.categories.some(row=>row.name==="Minibus"));
  assert.equal(f.state().audits.at(-1).action,"create");
});
test("renaming a category updates assigned vehicles and their edit versions",async()=>{
  const f=fixture();const result=await f.call("PATCH",{id:"sedan",previousName:"Sedan",name:"Executive"});
  assert.equal(result.status,200);assert.equal(result.data.category.name,"Executive");
  assert.deepEqual(result.data.vehicles,[{id:"car",version:4}]);
  assert.equal(f.state().vehicles[0].category,"Executive");assert.equal(f.state().audits.at(-1).action,"rename");
});
test("blank, duplicate and stale category changes leave assignments unchanged",async()=>{
  const f=fixture();
  assert.equal((await f.call("POST",{name:"sedan"})).status,409);
  assert.equal((await f.call("POST",{name:"  "})).status,400);
  assert.equal((await f.call("PATCH",{id:"sedan",previousName:"Sedan",name:"suv"})).status,409);
  assert.equal((await f.call("PATCH",{id:"sedan",previousName:"Old name",name:"Executive"})).status,409);
  assert.equal(f.state().vehicles[0].category,"Sedan");assert.equal(f.state().audits.length,0);
});
test("assigned categories cannot be deleted and unused categories can",async()=>{
  const f=fixture();const blocked=await f.call("DELETE",{id:"sedan",previousName:"Sedan"});
  assert.equal(blocked.status,409);assert.match(blocked.data.error,/Reassign/);
  assert.equal((await f.call("DELETE",{id:"suv",previousName:"SUV"})).status,200);
  assert.equal(f.state().categories.length,1);assert.equal(f.state().audits.at(-1).action,"delete");
});
test("only administrators can mutate categories while permitted staff can read",async()=>{
  for(const role of [null,"Dispatcher","Viewer"]) {
    const f=fixture(role);
    assert.equal((await f.call("GET")).status,role?200:401);
    for(const method of ["POST","PATCH","DELETE"])assert.equal((await f.call(method,{id:"suv",previousName:"SUV",name:"Minibus"})).status,role?403:401);
    assert.equal(f.state().audits.length,0);
  }
});
test("cross-origin mutations are rejected",async()=>{
  const f=fixture();
  for(const method of ["POST","PATCH","DELETE"])assert.equal((await f.call(method,{id:"suv",previousName:"SUV",name:"Minibus"},"https://untrusted.test")).status,403);
  assert.equal(f.state().audits.length,0);
});
