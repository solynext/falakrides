import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";
function load(path,require=()=>{throw Error("Unexpected import");}) {
  const context={exports:{},require,Date};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return context.exports;
}
const {modules}=load("../../src/features/admin/data/modules.ts");
const permissions=load("../../src/features/auth/permissions.ts");
const routes=load("../../src/features/admin/routes.ts");
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fixture(role="Administrator") {
  let records=[];let audits=[];let catalogVersion=0;
  const db={serviceCatalog:{updateMany:async()=>{catalogVersion++;return {count:1};},findUnique:async()=>({version:catalogVersion,services:[{id:"airport-transfers",title:"Airport Transfers"},{id:"ziyarat",title:"Ziyarat"}]})},location:{
    findUnique:async({where})=>structuredClone(records.find(row=>row.id===where.id)||null),
    create:async({data})=>{const row={...data,id:"location1",version:1,createdAt:new Date()};records.push(row);return {...row};},
    update:async({where,data})=>{const index=records.findIndex(row=>row.id===where.id && row.version===where.version);assert.notEqual(index,-1);records[index]={...records[index],...data,version:records[index].version+1};return {...records[index]};},
    delete:async({where})=>{records=records.filter(row=>row.id!==where.id);},
  },siteContent:{findUniqueOrThrow:async()=>({id:"main",version:1,draft:{},published:{}}),update:async()=>({})},auditLog:{create:async({data})=>audits.push(data)},$transaction:async action=>{const before=structuredClone({records,audits,catalogVersion});try{return await action(db);}catch(error){({records,audits,catalogVersion}=before);throw error;}}};
  const service=load("../../src/features/admin/server.ts",name=>{
    if(name==="@/features/content/website-model")return {isSafePublicImage:value=>/^\/images\/[a-z0-9-]+\.jpg$/.test(value)};
    if(name==="node:crypto")return crypto;
    if(name==="zod")return zod;
    if(name==="@/lib/db")return {db};
    if(name==="@/lib/auth")return permissions;
    if(name==="@/lib/security/http")return {HttpError};
    if (name === "./record-links") return load("../../src/features/admin/record-links.ts");
    if(name==="./data/modules")return {modules};
    if(name==="./booking-itinerary")return {};
    if(name==="@/features/bookings/confirmation")return {};
    if(name==="./notifications")return {};
    throw Error(name);
  });
  const user={id:"admin",role};
  return {state:()=>({records,audits,catalogVersion}),save:(row,id)=>service.writeRecord("locations",row,user,id),remove:(id,version)=>service.deleteRecord("locations",id,version,user)};
}
const valid={name:"Makkah Hotel",serviceIds:JSON.stringify(["airport-transfers"]),description:"Hotel pickup entrance",image:"/images/makkah.jpg",status:"Active"};
test("locations save all details with an optional ZIP code and support edits and deletion",async()=>{
  const f=fixture();const {row}=await f.save(valid);
  const slug=f.state().records[0].slug;
  assert.match(slug,/^makkah-hotel-[a-f0-9]{5}$/);
  assert.equal(row.name,valid.name);assert.equal(row.zipCode,"");assert.equal(row.description,valid.description);assert.equal(row.image,valid.image);assert.equal(row.serviceIds,JSON.stringify(["airport-transfers"]));
  const updated=await f.save({...row,name:"Madinah Hotel",zipCode:"42311"},row.id);
  assert.equal(updated.row.zipCode,"42311");assert.equal(updated.row._version,"2");
  assert.equal(f.state().records[0].slug,slug);
  await f.remove(row.id,2);assert.equal(f.state().records.length,0);
  assert.equal(f.state().audits.map(row=>row.action).join(","),"create,update,delete");
});
test("locations require a service category and reject categories outside Our Services",async()=>{
  for(const serviceIds of [undefined,"","not-json","[]",JSON.stringify(["unknown-service"]),JSON.stringify(["airport-transfers","airport-transfers"])]) {
    const f=fixture();await assert.rejects(f.save({...valid,serviceIds}));assert.equal(f.state().records.length,0);
  }
  const f=fixture();const {row}=await f.save(valid);
  const updated=await f.save({...row,serviceIds:JSON.stringify(["airport-transfers","ziyarat"])},row.id);
  assert.equal(updated.row.serviceIds,JSON.stringify(["airport-transfers","ziyarat"]));
  const reduced=await f.save({...updated.row,serviceIds:JSON.stringify(["ziyarat"])},row.id);
  assert.equal(reduced.row.serviceIds,JSON.stringify(["ziyarat"]));;
});
test("location creation, edits and deletion invalidate stale service snapshots",async()=>{
  const f=fixture();assert.equal(f.state().catalogVersion,0);
  const {row}=await f.save(valid);assert.equal(f.state().catalogVersion,1);
  const edited=await f.save({...row,serviceIds:JSON.stringify(["ziyarat"])},row.id);
  assert.equal(f.state().catalogVersion,2);
  await assert.rejects(f.save({...row,serviceIds:JSON.stringify(["airport-transfers"])},row.id),{status:409});
  assert.equal(f.state().catalogVersion,2);
  await f.remove(row.id,Number(edited.row._version));assert.equal(f.state().catalogVersion,3);
});
test("location name, image and description are required while ZIP is optional",async()=>{
  for(const field of ["name","description","image"]) {
    const f=fixture();await assert.rejects(f.save({...valid,[field]:""}));assert.equal(f.state().records.length,0);
  }
  await assert.rejects(fixture().save({...valid,image:"javascript:alert(1)"}));
  await assert.rejects(fixture().save({...valid,zipCode:"<invalid>"}));
});
test("only administrators can add, edit or delete locations",async()=>{
  for(const role of ["Dispatcher","Viewer","Finance"]) {
    const f=fixture(role);await assert.rejects(f.save(valid),{status:403});await assert.rejects(f.remove("location1",1),{status:403});assert.equal(f.state().audits.length,0);
  }
  assert.equal(permissions.canAccess("Dispatcher","locations"),true);
});
test("stale location edits and deletes are rejected",async()=>{
  const f=fixture();const {row}=await f.save(valid);await f.save({...row,name:"Updated"},row.id);
  await assert.rejects(f.save({...row,name:"Stale"},row.id),{status:409});await assert.rejects(f.remove(row.id,1),{status:409});
  assert.equal(f.state().records[0].name,"Updated");
});
test("Locations replaces Service areas in admin navigation and module definitions",()=>{
  assert.equal(routes.adminSectionFromPath("/admin/locations"),"locations");
  assert.equal(routes.adminSectionFromPath("/admin/service-areas"),undefined);
  assert.equal(modules.areas,undefined);
  assert.ok(modules.locations.fields.some(field=>field.key === "destinations"));
});
test("public booking choices use active records from Locations",async()=>{
  const catalog=load("../../src/features/content/database-catalog.ts",name=>{
    if(name !== "@/lib/db")throw Error(name);
    const empty={findMany:async()=>[]};
    return {db:{vehicle:empty,fare:empty,offer:empty,feedback:empty,location:{findMany:async({where})=>{assert.equal(where.status,"Active");return [{name:"Makkah"},{name:"Madinah"}];}}}};
  });
  const result=await catalog.databaseCatalog();
  assert.equal(result.locations.join(","),"Makkah,Madinah");
});
