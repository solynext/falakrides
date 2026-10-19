import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";
function load(path,require=()=>{throw Error("Unexpected import");}) {
  const context={exports:{},require,Date};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;
}
const {modules}=load("../../src/features/admin/data/modules.ts");
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fixture(existing=null) {
  let record=existing;const writes=[];
  const db={
    location:{findFirst:async({where})=>["Makkah","Madinah"].includes(where.name)?{name:where.name,status:"Active"}:null},
    vehicle:{findUnique:async({where})=>where.id==="car1"?{id:"car1",name:"Family SUV"}:null},
    offer:{findUnique:async()=>record,create:async({data})=>{writes.push(data);record={...data,id:"offer1",version:1};return record;},update:async({data})=>{writes.push(data);record={...record,...data,version:record.version+1};return record;}},
    auditLog:{create:async()=>{}},siteContent:{findUniqueOrThrow:async()=>({id:"main",version:1,draft:{},published:{}}),update:async()=>({})},$transaction:async action=>action(db),
  };
  const service=load("../../src/features/admin/server.ts",name=>{
    if(name==="@/features/content/website-model")return {isSafePublicImage:value=>value.startsWith("/images/")};
    if(name==="node:crypto")return crypto;
    if(name==="zod")return zod;
    if(name==="@/lib/db")return {db};
    if(name==="@/lib/auth")return {canAccess:()=>true};
    if(name==="@/lib/security/http")return {HttpError};
    if (name === "./record-links") return load("../../src/features/admin/record-links.ts");
    if(name==="./data/modules")return {modules};
    if(["./booking-itinerary","./notifications","@/features/bookings/confirmation"].includes(name))return {};
    throw Error(name);
  });
  return {writes,state:()=>record,save:input=>service.writeRecord("offers",input,{id:"admin",role:"Administrator"},existing?.id)};
}
const valid={vehicleId:"car1",image:"/images/vehicle.jpg",pickup:"Makkah",destination:"Madinah"};
test("offer form contains only vehicle, pickup, drop-off and image",()=>{
  assert.equal(modules.offers.fields.map(field=>field.key).sort().join(","),"destination,image,pickup,vehicleId");
  assert.equal(modules.offers.columns.includes("code"),false);
});
test("four offer fields save without discount code or eligible route inputs",async()=>{
  const f=fixture();const result=await f.save(valid);
  assert.equal(result.row.vehicleId,"car1");assert.equal(result.row.image,valid.image);
  assert.equal(f.state().route,"Makkah → Madinah");assert.equal(f.state().name,"Family SUV · Makkah → Madinah");
  assert.match(f.state().code,/^OFFER-/);assert.equal(f.state().discount,0);
});
test("invalid vehicles and identical pickup/drop-off locations cannot save",async()=>{
  await assert.rejects(fixture().save({...valid,vehicleId:"missing"}),{status:400});
  await assert.rejects(fixture().save({...valid,destination:"makkah"}),{status:400});
  await assert.rejects(fixture().save({...valid,pickup:"Unknown location"}),{status:400});
  for(const field of Object.keys(valid))await assert.rejects(fixture().save({...valid,[field]:""}));
});
test("editing an old offer preserves its stored promotion settings",async()=>{
  const f=fixture({id:"offer1",version:1,code:"LEGACY",discount:15,validUntil:"2027-01-01",terms:"Existing terms",status:"Draft"});
  await f.save({...valid,_version:"1"});
  assert.equal(f.state().code,"LEGACY");assert.equal(f.state().discount,15);assert.equal(f.state().validUntil,"2027-01-01");assert.equal(f.state().status,"Draft");
});
