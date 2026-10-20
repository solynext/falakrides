import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path,require) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require});
  return exports;
}
const design=load("../../src/config/public-design.ts",()=>{throw Error("Unexpected import");});
const model=load("../../src/features/content/website-model.ts",name=>name.includes("public-design")?design:{isCloudinaryImage:()=>false});
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fixture() {
  let record=null;const audits=[];
  let locations=[{id:"makkah",name:"Makkah",serviceIds:[],version:1},{id:"madinah",name:"Madinah",serviceIds:["unrelated-service"],version:1}];
  const db={location:{findMany:async()=>structuredClone(locations),updateMany:async({where,data})=>{const location=locations.find(item=>item.id===where.id&&item.version===where.version);if(!location)return {count:0};location.serviceIds=data.serviceIds;location.version++;return {count:1};}},serviceCatalog:{
    findUnique:async()=>record,
    upsert:async({create})=>record??={...create,version:0},
    updateMany:async({where,data})=>{if(record?.version!==where.version)return {count:0};record={...record,services:data.services,version:record.version+1};return {count:1};},
  },siteContent:{findUnique:async()=>({published:{}})},auditLog:{create:async({data})=>audits.push(data)},$transaction:async action=>{const before=structuredClone({record,locations,audits});try{return await action(db);}catch(error){record=before.record;locations=before.locations;audits.splice(0,audits.length,...before.audits);throw error;}}};
  db.serviceCatalog.findUniqueOrThrow=async()=>record;
  const service=load("../../src/features/services/server.ts",name=>name==="@/lib/db"?{db}:name==="@/lib/security/http"?{HttpError}:model);
  return {...service,audits,locations:()=>locations};
}
test("services initialize once and save independently with optimistic concurrency",async()=>{
  const f=fixture();const initial=await f.readServices();assert.ok(initial.services.length);
  const services=structuredClone(initial.services);services[0].title="Independent service";
  const saved=await f.saveServices(0,services,"admin");assert.equal(saved.version,1);assert.equal(saved.services[0].title,"Independent service");
  await assert.rejects(f.saveServices(0,initial.services,"admin"),{status:409});
  assert.equal((await f.readServices()).services[0].title,"Independent service");
  assert.equal(f.audits.length,1);assert.equal(f.audits[0].resource,"services");
});
test("services reject duplicate slugs, unsafe images and malformed sections",async()=>{
  for(const change of [items=>items[1].slug=items[0].slug,items=>items[0].image="javascript:alert(1)",items=>items[0].sections=[{title:"Bad",text:"",items:"invalid"}]]) {
    const f=fixture();const initial=await f.readServices();const services=structuredClone(initial.services);change(services);
    await assert.rejects(f.saveServices(0,services,"admin"),{status:400});assert.equal(f.audits.length,0);
  }
});
test("removing every service persists an empty catalog",async()=>{
  const f=fixture();await f.readServices();await f.saveServices(0,[],"admin");assert.equal((await f.readServices()).services.length,0);
});

test("services select multiple locations and preserve their other service assignments",async()=>{
  const f=fixture();const initial=await f.readServices();const serviceId=initial.services[0].id;
  await f.saveServices(0,initial.services,"admin",{[serviceId]:["makkah","madinah"]});
  assert.ok(f.locations().every(location=>location.serviceIds.includes(serviceId)));
  assert.ok(f.locations()[1].serviceIds.includes("unrelated-service"));
  await f.saveServices(1,initial.services,"admin",{[serviceId]:["madinah"]});
  assert.equal(f.locations()[0].serviceIds.includes(serviceId),false);
  assert.ok(f.locations()[1].serviceIds.includes(serviceId));
});

test("invalid or duplicate location selections roll back the service save",async()=>{
  for(const locationIds of [["missing"],["makkah","makkah"]]) {
    const f=fixture();const initial=await f.readServices();
    await assert.rejects(f.saveServices(0,initial.services,"admin",{[initial.services[0].id]:locationIds}),{status:400});
    assert.equal((await f.readServices()).version,0);
    assert.equal(f.audits.length,0);
  }
});

test("deleting a service removes its location links and retains other links",async()=>{
  const f=fixture();const initial=await f.readServices();const id=initial.services[0].id;
  await f.saveServices(0,initial.services,"admin",{[id]:["makkah","madinah"]});
  await f.saveServices(1,initial.services.filter(service=>service.id!==id),"admin");
  assert.ok(f.locations().every(location=>!location.serviceIds.includes(id)));
  assert.ok(f.locations()[1].serviceIds.includes("unrelated-service"));
});

test("admin service reads reflect the same location assignments saved by services",async()=>{
  const f=fixture();const initial=await f.readServices();const id=initial.services[0].id;
  await f.saveServices(0,initial.services,"admin",{[id]:["makkah"]});
  const snapshot=await f.readServicesForAdmin();
  assert.ok(snapshot.locations.find(location=>location.id==="makkah").serviceIds.includes(id));
  assert.equal(snapshot.version,1);
});

test("service URLs follow names and avoid existing URLs",()=>{
  const {serviceSlug}=load("../../src/features/services/slug.ts",()=>{throw Error("Unexpected import");});
  assert.equal(serviceSlug("  Airport & Hotel Transfers!  "),"airport-hotel-transfers");
  assert.equal(serviceSlug("Café Transfers"),"cafe-transfers");
  assert.equal(serviceSlug("Airport Transfers",["airport-transfers","airport-transfers-2"]),"airport-transfers-3");
  assert.equal(serviceSlug(""),"");
});

test("drafts can save before their introduction is complete but publishing requires it",async()=>{
  const f=fixture();const initial=await f.readServices();
  const draft={id:"draft-service",title:"Private Draft Transfers",slug:"private-draft-transfers",heading:"Private Draft Transfers",intro:"",image:"",visible:false,sections:[]};
  const saved=await f.saveServices(0,[...initial.services,draft],"admin");
  assert.equal(saved.services.at(-1).visible,false);
  await assert.rejects(f.saveServices(1,[...initial.services,{...draft,visible:true}],"admin"),{status:400});
});
