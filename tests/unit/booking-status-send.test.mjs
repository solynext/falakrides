import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";
const compile=path=>ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const statusCode=compile("../../src/features/bookings/status-message.ts");
const httpCode=compile("../../src/lib/security/http.ts");
const routeCode=compile("../../src/app/api/admin/bookings/[id]/notify/route.ts");
const status={exports:{}};vm.runInNewContext(statusCode,status);
const initial={id:"booking1",reference:"FR-123",customerName:"Jane",customerEmail:"jane@example.com",phone:"+966501234567",pickup:"Jeddah",destination:"Makkah",date:"2026-11-01",time:"10:00",dropoffDate:"2026-11-01",dropoffTime:"12:00",vehicleName:"Sedan",passengers:2,fare:10000,status:"Pending",version:1};
function fixture({allowed=true,email=true,whatsapp=false,failed=false,stale=false,bookingEmail=initial.customerEmail,bookingId=initial.id,bookingReference=initial.reference,emailOnReload}={}) {
  let booking={...initial,id:bookingId,reference:bookingReference,customerEmail:bookingEmail};const saved=[],sent=[],queued=[],audits=[];
  const db={booking:{findUnique:async()=>({...booking}),findUniqueOrThrow:async()=>({...booking,...(emailOnReload ? {customerEmail:emailOnReload} : {})})},notification:{create:async({data})=>{const record={id:"notification1",...data};queued.push(record);return record;}},auditLog:{create:async({data})=>audits.push(data)}};
  const http={exports:{},Response,Buffer,console:{error(){}},require:name=>{
    if(name==="node:crypto")return crypto;
    if(name==="@/lib/db")return {db};
    if(name==="zod")return zod;
    if(name==="./origins")return {trustedOrigins:()=>["https://falak.test"]};
    throw Error(name);
  }};vm.runInNewContext(httpCode,http);
  const context={exports:{},Error,require:name=>{
    if(name==="@/lib/auth")return {requireAdmin:async()=>{if(!allowed)throw new http.exports.HttpError(403,"Forbidden");return {id:"admin",role:"Administrator"};}};
    if(name==="@/lib/db")return {db};
    if(name==="@/lib/security/http")return {...http.exports,rateLimit:async()=>{}};
    if(name==="@/features/admin/server")return {writeRecord:async(module,row,user,id,options)=>{if(stale)throw new http.exports.HttpError(409,"Booking changed");assert.equal(options.notifyConfirmation,false);saved.push(row);booking={...booking,status:row.status,customerEmail:row.email?.trim() ?? booking.customerEmail,phone:row.phone ?? booking.phone,version:booking.version+1};return {row:{...row,id,_version:String(booking.version)}};}};
    if(name==="@/features/admin/notifications")return {notificationConfigured:channel=>channel==="Email"?email:whatsapp,deliverNotification:async id=>{if(failed)throw Error("Provider unavailable");sent.push(id);}};
    if(name==="@/features/bookings/status-message")return status.exports;
    if(name==="zod")return zod;
    throw Error(name);
  }};vm.runInNewContext(routeCode,context);
  return {saved,sent,queued,audits,call:async(channel="Email",row={status:"Cancelled"},origin="https://falak.test")=>{
    const response=await context.exports.POST(new Request("https://falak.test/api/admin/bookings/FR-123/notify",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({channel,row})}),{params:Promise.resolve({id:bookingReference})});
    return {status:response.status,data:await response.json()};
  }};
}
test("status templates use the selected status and include both schedules",()=>{
  for(const state of ["Pending","Confirmed","Cancelled","Scheduled","Rejected","Completed"]) {
    const message=status.exports.bookingStatusMessage({...initial,status:state});
    assert.match(message,new RegExp(`Status: ${state}`));
    assert.match(message,/Pickup date & time: 2026-11-01 at 10:00/);assert.match(message,/Drop-off date & time: 2026-11-01 at 12:00/);
    if(state!=="Confirmed")assert.doesNotMatch(message,/booking is confirmed/);
  }
});
test("messages use an appropriate greeting for each booking status",()=>{
  for(const [state,words] of [["Pending",/Please wait/],["Confirmed",/Congratulations!/],["Cancelled",/We are sorry/],["Rejected",/We are sorry/],["Scheduled",/Please be ready/],["Completed",/Thank you for travelling/]]) {
    assert.match(status.exports.bookingStatusMessage({...initial,status:state}),words);
  }
});
test("email saves the selected status and sends one explicit notification",async()=>{
  const f=fixture();const result=await f.call();assert.equal(result.status,200);assert.equal(result.data.sent,true);
  assert.equal(f.saved[0].status,"Cancelled");assert.equal(f.sent.length,1);assert.match(f.queued[0].message,/ride has been cancelled/);
  assert.equal(f.queued[0].recipient,initial.customerEmail);
  assert.equal(result.data.sentTo,initial.customerEmail);
});
test("each booking emails its own customer rather than another booking's recipient",async()=>{
  const jane=fixture({bookingEmail:"jane@example.com"}),ali=fixture({bookingEmail:"ali@example.com",bookingId:"booking2",bookingReference:"FR-456"});
  await jane.call();await ali.call();
  assert.equal(jane.queued[0].recipient,"jane@example.com");assert.equal(ali.queued[0].recipient,"ali@example.com");
  assert.equal(jane.queued[0].bookingId,initial.id);assert.equal(ali.queued[0].bookingId,"booking2");
});
test("email corrections are saved before sending and use the saved address",async()=>{
  const f=fixture();const result=await f.call("Email",{id:initial.reference,status:"Confirmed",email:" corrected@example.com "});
  assert.equal(result.status,200);assert.equal(result.data.sentTo,"corrected@example.com");assert.equal(f.queued[0].recipient,"corrected@example.com");
});
test("mismatched bookings and changed contact details cannot send",async()=>{
  const wrong=fixture();assert.equal((await wrong.call("Email",{id:"FR-OTHER",status:"Confirmed"})).status,400);assert.equal(wrong.saved.length,0);assert.equal(wrong.sent.length,0);
  const changed=fixture({emailOnReload:"changed@example.com"});const result=await changed.call();
  assert.match(result.data.deliveryError,/contact details changed/);assert.equal(changed.sent.length,0);assert.equal(changed.queued.length,0);
});
test("WhatsApp fallback returns a customer link without claiming delivery",async()=>{
  const f=fixture();const {data}=await f.call("WhatsApp",{status:"Scheduled"});
  assert.match(data.whatsappUrl,/^https:\/\/wa.me\/966501234567\?text=/);assert.match(decodeURIComponent(data.whatsappUrl),/ride is scheduled/);
  assert.equal(f.sent.length,0);assert.equal(f.queued.length,0);assert.equal(data.sent,undefined);
});
test("configured WhatsApp sends through the messaging provider",async()=>{
  const f=fixture({whatsapp:true});const result=await f.call("WhatsApp");assert.equal(result.data.sent,true);assert.equal(f.queued[0].channel,"WhatsApp");assert.equal(f.sent.length,1);
});
test("delivery failures retain saved booking details and report failure",async()=>{
  const f=fixture({failed:true});const {data}=await f.call();assert.match(data.deliveryError,/Provider unavailable/);assert.equal(data.row.status,"Cancelled");assert.equal(data.sent,undefined);
});
test("permission, origin, recipient and stale-write failures cannot send",async()=>{
  const forbidden=fixture({allowed:false});assert.equal((await forbidden.call()).status,403);assert.equal(forbidden.saved.length,0);
  const cross=fixture();assert.equal((await cross.call("Email",{status:"Confirmed"},"https://untrusted.test")).status,403);assert.equal(cross.sent.length,0);
  const invalid=fixture();assert.equal((await invalid.call("Email",{email:"invalid"})).status,400);assert.equal((await invalid.call("WhatsApp",{phone:"123"})).status,400);assert.equal(invalid.saved.length,0);
  const stale=fixture({stale:true});assert.equal((await stale.call()).status,409);assert.equal(stale.sent.length,0);
  const unconfigured=fixture({email:false});assert.equal((await unconfigured.call()).status,503);assert.equal(unconfigured.saved.length,0);
});
