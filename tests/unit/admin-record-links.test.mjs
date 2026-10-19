import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
import * as zod from 'zod';
function load(path,require=()=>{throw Error('Unexpected import');}) {
  const context={exports:{},require,Date};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return context.exports;
}
const links=load('../../src/features/admin/record-links.ts');
const {modules}=load('../../src/features/admin/data/modules.ts');
test('selecting saved rides and customers fills the corresponding booking fields',()=>{
  const ride=links.applySavedRide({id:'new',notes:'Keep notes'},{id:'fare1',route:'Makkah → Madinah',fare:'250'});
  assert.equal(ride.pickup,'Makkah');assert.equal(ride.destination,'Madinah');assert.equal(ride.fare,'250');assert.equal(ride.fareId,'fare1');assert.equal(ride.notes,'Keep notes');
  const customer=links.applySavedCustomer(ride,{id:'customer1',name:'Customer',email:'customer@example.com',phone:'+966500000000'});
  assert.equal(customer.customerId,'customer1');assert.equal(customer.email,'customer@example.com');assert.equal(customer.phone,'+966500000000');
  const fresh=links.applySavedCustomer(customer);assert.equal(fresh.customerId,'');assert.equal(fresh.customer,'');assert.equal(fresh.email,'');
});
test('booking selection supplies payment details and the correct notification channel recipient',()=>{
  const booking={id:'FR-ONE',customer:'Customer',email:'one@example.com',phone:'+966500000000',fare:'250'};
  const payment=links.applyBookingLink({},booking,'payments');assert.equal(payment.booking,'FR-ONE');assert.equal(payment.customer,'Customer');assert.equal(payment.amount,'250');
  assert.equal(links.applyBookingLink({channel:'Email'},booking,'notifications').recipient,booking.email);
  assert.equal(links.applyBookingLink({channel:'WhatsApp'},booking,'notifications').recipient,booking.phone);
  assert.equal(links.applyBookingLink(payment,undefined,'payments').customer,'');
});
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function fixture() {
  let written;
  const booking={id:'booking1',reference:'FR-ONE',customerName:'Customer',customerEmail:'one@example.com',phone:'+966500000000'};
  const delegate={findUnique:async()=>null,create:async({data})=>{written=data;return {...data,id:'saved',version:1,booking};}};
  const db={driver:delegate,fare:delegate,notification:delegate,payment:delegate,
    vehicle:{findFirst:async({where})=>where.OR.some(item=>item.id==='vehicle1'||item.name==='Saved car')?{id:'vehicle1'}:null},
    location:{findFirst:async({where})=>['Makkah','Madinah'].includes(where.name)?{name:where.name}:null},
    booking:{findUnique:async({where})=>where.reference==='FR-ONE'?booking:null},
    auditLog:{create:async()=>{}},siteContent:{findUniqueOrThrow:async()=>({draft:{},published:{}}),update:async()=>{}},$transaction:async action=>action(db)};
  const service=load('../../src/features/admin/server.ts',name=>{
    if(name==='./record-links')return links;
    if(name==='./data/modules')return {modules};
    if(name==='node:crypto')return crypto;
    if(name==='zod')return zod;
    if(name==='@/lib/db')return {db};
    if(name==='@/lib/auth')return {canAccess:()=>true};
    if(name==='@/lib/security/http')return {HttpError};
    if(name==='@/features/content/website-model')return {isSafePublicImage:()=>true};
    if(['./booking-itinerary','./notifications','@/features/bookings/confirmation'].includes(name))return {};
    throw Error(name);
  });
  return {save:(module,row)=>service.writeRecord(module,row,{id:'admin',role:'Administrator'}),written:()=>written};
}
test('driver vehicles resolve to saved IDs and reject unknown vehicles or locations',async()=>{
  const row={name:'Driver',phone:'',city:'Makkah',vehicle:'Saved car',status:'Available'};
  const f=fixture();await f.save('drivers',row);assert.equal(f.written().vehicle,'vehicle1');
  await assert.rejects(fixture().save('drivers',{...row,vehicle:'Missing'}),{status:400});
  await assert.rejects(fixture().save('drivers',{...row,city:'Missing'}),{status:400});
});
test('fares derive routes from saved locations and reject unavailable stops',async()=>{
  const row={pickup:'Makkah',destination:'Madinah',fare:'250',hourly:'0',waiting:'0',status:'Active'};
  const f=fixture();await f.save('fares',row);assert.equal(f.written().route,'Makkah → Madinah');assert.equal(f.written().fare,25000);assert.equal('pickup' in f.written(),false);
  await assert.rejects(fixture().save('fares',{...row,pickup:'Missing'}),{status:400});
  await assert.rejects(fixture().save('fares',{...row,destination:'Makkah'}),{status:400});
});
test('linked notifications use the booking recipient even if a different address is submitted',async()=>{
  const row={booking:'FR-ONE',recipient:'wrong@example.com',channel:'Email',message:'Update',status:'Draft'};
  const f=fixture();await f.save('notifications',row);assert.equal(f.written().recipient,'one@example.com');assert.equal(f.written().bookingId,'booking1');
  await assert.rejects(fixture().save('notifications',{...row,booking:'MISSING'}),{status:400});
  const phone=fixture();await phone.save('notifications',{...row,channel:'WhatsApp'});assert.equal(phone.written().recipient,'+966500000000');
});
test('payments require an existing booking and display its actual customer',async()=>{
  const row={booking:'FR-ONE',customer:'Wrong customer',amount:'250',method:'Cash',status:'Pending',notes:''};
  const f=fixture();const saved=await f.save('payments',row);assert.equal(saved.row.customer,'Customer');assert.equal(f.written().bookingId,'booking1');assert.equal('customer' in f.written(),false);
  await assert.rejects(fixture().save('payments',{...row,booking:'MISSING'}),{status:400});
});
