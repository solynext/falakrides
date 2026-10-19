import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const code=ts.transpileModule(fs.readFileSync(new URL("../../src/features/admin/booking-itinerary.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},Date};vm.runInNewContext(code,context);
const {bookingItinerary}=context.exports;
const input={pickup:" Jeddah airport ",destination:"Makkah hotel",date:"2026-11-01",time:"10:00",dropoffDate:"2026-11-01",dropoffTime:"12:00"};
test("pickup and drop-off locations and schedules are preserved in KSA time",()=>{
  const result=bookingItinerary(input);
  assert.equal(result.pickup,"Jeddah airport");assert.equal(result.destination,"Makkah hotel");
  assert.equal(result.pickupAt.toISOString(),"2026-11-01T07:00:00.000Z");
  assert.equal(result.dropoffDate,input.dropoffDate);assert.equal(result.dropoffTime,"12:00");
});
test("drop-off must be strictly after pickup, including overnight journeys",()=>{
  for(const dropoffTime of ["09:00","10:00"])assert.throws(()=>bookingItinerary({...input,dropoffTime}),/after pickup/);
  assert.equal(bookingItinerary({...input,time:"23:30",dropoffDate:"2026-11-02",dropoffTime:"01:00"}).dropoffDate,"2026-11-02");
});
test("invalid dates, times, partial schedules and missing locations are rejected",()=>{
  for(const changes of [{date:"2026-02-30"},{dropoffDate:"2026-11-31"},{time:"24:00"},{dropoffTime:"12:99"},{dropoffTime:""},{dropoffDate:""},{pickup:" "},{destination:"jeddah airport"}])assert.throws(()=>bookingItinerary({...input,...changes}));
});
test("new bookings require drop-off timing while old bookings remain editable",()=>{
  const old={...input,dropoffDate:"",dropoffTime:""};
  assert.throws(()=>bookingItinerary(old),/drop-off date and time/);
  assert.equal(bookingItinerary(old,true).dropoffDate,"");
  assert.throws(()=>bookingItinerary({...old,dropoffDate:input.date},true),/drop-off date and time/);
});
