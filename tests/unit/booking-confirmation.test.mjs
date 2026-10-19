import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import * as zod from 'zod';
import ts from 'typescript';
const compile = path => ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
function load(path, require = () => {throw Error('Unexpected import');}, globals = {}) {const context = {exports: {}, require, ...globals}; vm.runInNewContext(compile(path), context); return context.exports;}
const confirmation = load('../../src/features/bookings/confirmation.ts');
const itinerary = load('../../src/features/admin/booking-itinerary.ts',undefined,{Date});
const {modules} = load('../../src/features/admin/data/modules.ts');
class HttpError extends Error {constructor(status, message) {super(message); this.status = status;}}
const initial = {id: 'booking1', reference: 'FR-123', customerId: 'customer1', customerName: 'Jane', customerEmail: 'booking@example.com', phone: '+966501234567', pickup: 'Makkah', destination: 'Jeddah', date: '2026-12-20', time: '10:00', status: 'Pending', version: 1, passengers: 2, fare: 10000, vehicleId: 'vehicle1', vehicleName: 'Sedan', driverId: 'driver1', notes: '', createdAt: new Date()};
function fixture() {
  let booking = {...initial}; const queued = [], delivered = [], faults = {audit: false, delivery: false}; let committed = false;
  const db = {
    booking: {findUnique: async () => ({...booking}), update: async ({where, data}) => {if (where.version !== booking.version) throw Error('stale'); booking = {...booking, ...data, version: booking.version + 1}; return {...booking};}},
    driver: {findUnique: async () => ({id: 'driver1', status: 'Available'})}, vehicle: {findUnique: async () => ({id: 'vehicle1', name: 'Sedan', passengers: 4, status: 'Available'})},
    auditLog: {create: async () => {if (faults.audit) throw Error('audit failure');}},
    notification: {create: async ({data}) => {queued.push(data); return data;}},
    $transaction: async callback => {const before = {...booking}, length = queued.length; try {const result = await callback(db); committed = true; return result;} catch (error) {booking = before; queued.length = length; throw error;}},
  };
  const service = load('../../src/features/admin/server.ts', name => {
    if (name === '@/features/content/website-model') return {isSafePublicImage: () => true};
    if (name === 'node:crypto') return crypto;
    if (name === 'zod') return zod;
    if (name === '@/lib/db') return {db};
    if (name === '@/lib/auth') return {canAccess: () => true};
    if (name === '@/lib/security/http') return {HttpError, digest: value => crypto.createHash('sha256').update(value).digest('hex')};
    if (name === "./record-links") return load("../../src/features/admin/record-links.ts");
    if (name === './data/modules') return {modules};
    if (name === './booking-itinerary') return itinerary;
    if (name === '@/features/bookings/confirmation') return confirmation;
    if (name === './notifications') return {deliverNotification: async id => {assert.equal(committed, true); delivered.push(id); if (faults.delivery) throw Error('SMTP failed');}};
    throw Error(name);
  }, {Date});
  return {queued, delivered, faults, state: () => booking, save: (status = 'Confirmed', email) => service.writeRecord('bookings', {
    customer: 'Jane', phone: initial.phone, ...(email === undefined ? {} : {email}), pickup:initial.pickup, destination:initial.destination, date: initial.date, time: initial.time,
    passengers: '2', fare: '100', status, driver: 'driver1', vehicle: 'vehicle1', notes: '', _version: String(booking.version),
  }, {id: 'admin', role: 'Administrator'}, initial.reference)};
}
test('admin confirmation emails the booking address after commit and does not resend on ordinary edits', async () => {
  const f = fixture(); const result = await f.save();
  assert.equal(result.row.status, 'Confirmed'); assert.equal(f.queued.length, 1); assert.equal(f.delivered.length, 1);
  assert.equal(f.queued[0].recipient, 'booking@example.com'); assert.equal(f.queued[0].status, 'Queued');
  assert.match(f.queued[0].message, /FR-123/); assert.match(f.queued[0].message, /SAR 100.00/); assert.match(f.queued[0].message, /Saudi Arabia time/);
  await f.save(); assert.equal(f.queued.length, 1); assert.equal(f.delivered.length, 1);
});
test('pending bookings and failed booking transactions send no confirmation', async () => {
  const f = fixture(); await f.save('Pending'); assert.equal(f.delivered.length, 0);
  f.faults.audit = true; await assert.rejects(f.save(), /audit failure/); assert.equal(f.state().status, 'Pending'); assert.equal(f.queued.length, 0);
});
test('email delivery failure leaves the ride confirmed with a retry warning', async () => {
  const f = fixture(); f.faults.delivery = true; const result = await f.save();
  assert.equal(f.state().status, 'Confirmed'); assert.match(result.warning, /could not be sent/);
});
test('booking email is retained when omitted from an admin edit, and invalid emails are rejected', async () => {
  const f = fixture(); await f.save('Pending'); assert.equal(f.state().customerEmail, 'booking@example.com');
  await assert.rejects(f.save('Confirmed', 'invalid'));
});
test('confirmation includes round-trip details and safely skips legacy bookings without email', async () => {
  const message = confirmation.bookingConfirmationMessage({...initial, journey: 'round-trip', returnDate: '2026-12-21', returnTime: '16:00'});
  assert.match(message, /Return: 2026-12-21 at 16:00/);
  const id = await confirmation.queueBookingConfirmation({notification: {create: () => {throw Error('should not queue');}}}, {...initial, status: 'Confirmed', customerEmail: ''}, 'Pending');
  assert.equal(id, null);
});

function notificationFixture(configured = true) {
  let record = {id: 'booking-confirmed:1:2', status: 'Queued', channel: 'Email', recipient: 'booking@example.com', message: 'Hello <Jane>\nYour booking is confirmed.'};
  const sent = [], faults = {delivery: false};
  const service = load('../../src/features/admin/notifications.ts', name => {
    if (name === '@/lib/db') return {db: {notification: {
      findUniqueOrThrow: async () => ({...record}),
      updateMany: async ({where, data}) => {if (!where.status.in.includes(record.status)) return {count: 0}; record = {...record, ...data}; return {count: 1};},
      update: async ({data}) => {record = {...record, ...data}; return record;},
    }}};
    if (name === '@/lib/security/http') return {HttpError};
    if (name === '@/features/auth/password-reset-email') return {sendAccountEmail: async (...args) => {if (faults.delivery) throw Error('SMTP delivery failed'); sent.push(args);}};
    throw Error(name);
  }, {process: {env: configured ? {GMAIL_USER: 'sender@example.com', GMAIL_APP_PASSWORD: 'app-password'} : {}}});
  return {sent, faults, state: () => record, send: () => service.deliverNotification(record.id)};
}
test('Gmail confirmation delivery escapes HTML, records success and skips a second send', async () => {
  const f = notificationFixture(); await f.send(); await f.send();
  assert.equal(f.sent.length, 1); assert.equal(f.sent[0][0], 'booking@example.com'); assert.match(f.sent[0][1], /booking is confirmed/);
  assert.match(f.sent[0][3], /&lt;Jane&gt;/); assert.equal(f.state().status, 'Sent');
});
test('SMTP failures and missing configuration are marked Failed and can be retried', async () => {
  const f = notificationFixture(); f.faults.delivery = true; await assert.rejects(f.send(), {status: 502}); assert.equal(f.state().status, 'Failed');
  f.faults.delivery = false; await f.send(); assert.equal(f.state().status, 'Sent');
  const missing = notificationFixture(false); await assert.rejects(missing.send(), {status: 502}); assert.equal(missing.state().status, 'Failed');
});

test('booking submission saves its own email and retries reuse the existing booking', async () => {
  let saved = null, customer = {id: 'customer1', email: 'old@example.com'};
  let creates = 0;
  const db = {
    booking: {findUnique: async () => saved, create: async ({data}) => {creates++; saved = {...data, id: 'booking1', version: 1}; return saved;}},
    customer: {update: async ({data}) => {customer = {...customer, ...data}; return customer;}},
    vehicle: {findFirst: async () => ({id: 'vehicle1', name: 'Sedan', passengers: 4, luggage: 3})},
    siteContent: {findUniqueOrThrow: async () => ({published: {}})}, fare: {findFirst: async () => ({fare: 10000})},
    $transaction: async callback => callback(db),
  };
  const service = load('../../src/features/bookings/server.ts', name => {
    if (name === 'node:crypto') return crypto;
    if (name === 'zod') return zod;
    if (name === '@/lib/db') return {db};
    if (name === '@/lib/security/http') return {HttpError};
    throw Error(name);
  }, {Date, Intl});
  const payload = {name: 'Jane', email: ' BOOKING@example.com ', phone: '+966501234567', pickup: 'Makkah', destination: 'Jeddah', date: '2099-12-20', time: '10:00', passengers: 2, luggage: 1, vehicle: 'Sedan', idempotencyKey: crypto.randomUUID()};
  const input = service.bookingSchema.parse(payload);
  const result = await service.createBooking(input, 'customer1');
  assert.equal(result.email, 'booking@example.com'); assert.equal(saved.customerEmail, 'booking@example.com'); assert.equal(customer.email, 'booking@example.com');
  customer.email = 'different@example.com';
  await service.createBooking(input, 'customer1'); assert.equal(creates, 1); assert.equal(saved.customerEmail, 'booking@example.com');
  assert.throws(() => service.bookingSchema.parse({...payload, email: 'invalid'}));
});
