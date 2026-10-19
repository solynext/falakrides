import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {neon} from '@neondatabase/serverless';
config({path: ['.env.local', '.env'], quiet: true});
const origin = process.env.TEST_BASE_URL || 'http://localhost:3000';
const suffix = randomUUID().slice(0, 8);
const cleanup = [];
function client() {
  const jar = new Map();
  return async (path, method = 'GET', payload) => {
    const response = await fetch(origin + path, {method, headers: {Origin: origin, 'Content-Type': 'application/json', Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ')}, body: payload === undefined ? undefined : JSON.stringify(payload), redirect: 'manual'});
    for (const cookie of response.headers.getSetCookie()) {const pair = cookie.split(';')[0]; const index = pair.indexOf('='); jar.set(pair.slice(0, index), pair.slice(index + 1));}
    const result = await response.json().catch(() => ({}));
    return {status: response.status, result, headers: response.headers};
  };
}
const admin = client(), guest = client(), stranger = client();
let vehicle, fare, booking, vehicleCategory;
after(async () => {for (const remove of cleanup.reverse()) await remove().catch(() => {}); const sql = neon(process.env.DATABASE_URL); const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public'; assert.match(schema, /^[A-Za-z_][A-Za-z0-9_]*$/); await sql.query(`DELETE FROM "${schema}"."Inquiry" WHERE message = $1`, [`Integration inquiry ${suffix}`]);});
test('unauthenticated API access is denied and initial admin signs in', async () => {
  assert.equal((await guest('/api/admin')).status, 401);
  assert.equal((await guest('/api/content?admin=1')).status, 401);
  const login = await admin('/api/auth/sign-in/email', 'POST', {email: process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD});
  assert.equal(login.status, 200, JSON.stringify(login.result));
  assert.equal((await admin('/api/admin')).status, 200);
});
test('vehicle categories persist, reject duplicates and require administrator access', async () => {
  assert.equal((await guest('/api/admin/vehicle-categories')).status, 401);
  assert.equal((await admin('/api/admin/vehicle-categories', 'POST', {name: '  '})).status, 400);
  const created = await admin('/api/admin/vehicle-categories', 'POST', {name: ` Category ${suffix} `});
  assert.equal(created.status, 201, JSON.stringify(created.result));
  vehicleCategory = created.result.category;
  cleanup.push(async () => {const sql = neon(process.env.DATABASE_URL); await sql`DELETE FROM "VehicleCategory" WHERE id = ${vehicleCategory.id}`;});
  assert.equal(vehicleCategory.name, `Category ${suffix}`);
  assert.ok((await admin('/api/admin/vehicle-categories')).result.categories.some(category => category.id === vehicleCategory.id));
  assert.equal((await admin('/api/admin/vehicle-categories', 'POST', {name: vehicleCategory.name.toUpperCase()})).status, 409);
  const invalid = await admin('/api/admin/vehicles', 'POST', {id:'NEW', name:`Invalid category ${suffix}`, plate:`INVALID-${suffix}`, passengers:'4', luggage:'2', status:'Available', category:`Missing ${suffix}`});
  assert.equal(invalid.status, 400);
});
test('database CRUD updates the public catalog and rejects stale writes', async () => {
  const create = await admin('/api/admin/vehicles', 'POST', {id: 'NEW', name: `Test vehicle ${suffix}`, plate: `TEST-${suffix}`, passengers: '6', luggage: '4', status: 'Available', category:vehicleCategory.name});
  assert.equal(create.status, 201, JSON.stringify(create.result)); vehicle = create.result.row;
  cleanup.push(async () => {const snapshot = await admin('/api/admin'); const current = snapshot.result.data.vehicles.find(row => row.id === vehicle.id); if (current) await admin(`/api/admin/vehicles/${vehicle.id}`, 'DELETE', {version: Number(current._version)});});
  const published = await guest('/api/content');
  assert.ok(published.result.catalog.vehicles.some(row => row.name === vehicle.name));
  const updated = await admin(`/api/admin/vehicles/${vehicle.id}`, 'PATCH', {...vehicle, passengers: '5'});
  assert.equal(updated.status, 200, JSON.stringify(updated.result));
  assert.equal((await admin(`/api/admin/vehicles/${vehicle.id}`, 'PATCH', {...vehicle, passengers: '2'})).status, 409);
  vehicle = updated.result.row;
  assert.equal((await guest('/api/content')).result.catalog.vehicles.find(row => row.id === vehicle.id).passengers, 5);
  const invalid = await admin('/api/admin/vehicles', 'POST', {id: 'NEW', name: 'Invalid', plate: 'INVALID', passengers: '-1', luggage: '4', status: 'Available'});
  assert.equal(invalid.status, 400);
});
test('real bookings use server pricing, idempotency, owner checks and cancellation', async () => {
  for (const name of [`Test pickup ${suffix}`,`Test destination ${suffix}`]) {
    const created=await admin('/api/admin/locations','POST',{name,description:'Integration location',image:'/images/header-background.jpg',status:'Active'});
    assert.equal(created.status,201,JSON.stringify(created.result));const row=created.result.row;
    cleanup.push(()=>admin(`/api/admin/locations/${row.id}`,'DELETE',{version:Number(row._version)}));
  }
  const route = `Test pickup ${suffix} → Test destination ${suffix}`;
  const created = await admin('/api/admin/fares', 'POST', {id: 'NEW', route, fare: '125.50', hourly: '0', waiting: '0', status: 'Active'});
  assert.equal(created.status, 201, JSON.stringify(created.result)); fare = created.result.row;
  cleanup.push(() => admin(`/api/admin/fares/${fare.id}`, 'DELETE', {version: Number(fare._version)}));
  const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const input = {pickup: `Test pickup ${suffix}`, destination: `Test destination ${suffix}`, timing: 'later', date: future, time: '12:00', passengers: 2, luggage: 1, vehicle: vehicle.id, name: `Test customer ${suffix}`, phone: '+966500000000', idempotencyKey: randomUUID(), fare: 1};
  const response = await guest('/api/bookings', 'POST', input);
  assert.equal(response.status, 201, JSON.stringify(response.result)); booking = response.result.booking;
  cleanup.push(async () => {const snapshot = await admin('/api/admin'); const current = snapshot.result.data.bookings.find(row => row.id === booking.reference); if (current) await admin(`/api/admin/bookings/${booking.reference}`, 'DELETE', {version: Number(current._version)}); const next = await admin('/api/admin'); const customer = next.result.data.customers.find(row => row.name === input.name); if (customer) await admin(`/api/admin/customers/${customer.id}`, 'DELETE', {version: Number(customer._version)});});
  assert.equal(booking.fare, 125.5);
  assert.equal(booking.status, 'Pending');
  assert.equal((await guest('/api/bookings', 'POST', input)).result.booking.reference, booking.reference);
  assert.equal((await stranger('/api/bookings')).result.bookings.length, 0);
  assert.equal((await stranger(`/api/bookings/${booking.reference}`, 'PATCH', {action: 'cancel', version: booking.version})).status, 401);
  assert.equal((await admin('/api/admin')).result.data.bookings.filter(row => row.id === booking.reference).length, 1);
  const cancelled = await guest(`/api/bookings/${booking.reference}`, 'PATCH', {action: 'cancel', version: booking.version});
  assert.equal(cancelled.status, 200); assert.equal(cancelled.result.booking.status, 'Cancelled'); booking = cancelled.result.booking;
});
test('profile and inquiry data persist without exposing other visitors', async () => {
  const before = (await guest('/api/profile')).result;
  const saved = await guest('/api/profile', 'PUT', {name: `Test customer ${suffix}`, email: `visitor-${suffix}@example.com`, phone: '+966500000000', image: '', version: before.version});
  assert.equal(saved.status, 200, JSON.stringify(saved.result));
  assert.equal((await guest('/api/profile', 'PUT', {...saved.result, name: 'Stale edit', version: before.version})).status, 409);
  assert.equal((await guest('/api/profile')).result.email, `visitor-${suffix}@example.com`);
  assert.equal((await stranger('/api/profile')).result.email, '');
  const inquiry = await guest('/api/inquiries', 'POST', {name: `Inquiry ${suffix}`, email: `inquiry-${suffix}@example.com`, message: `Integration inquiry ${suffix}`});
  assert.equal(inquiry.status, 201, JSON.stringify(inquiry.result));
  const snapshot = await admin('/api/admin'); const feedback = snapshot.result.data.feedback.find(row => row.message === `Integration inquiry ${suffix}`);
  assert.ok(feedback); cleanup.push(() => admin(`/api/admin/feedback/${feedback.id}`, 'DELETE', {version: Number(feedback._version)}));
});
test('team invitations enforce read-only authorization and can be revoked', async () => {
  const email = `viewer-${suffix}@example.com`;
  const invite = await admin('/api/admin/roles', 'POST', {id: 'NEW', name: `Test viewer ${suffix}`, email, role: 'Viewer', status: 'Invited'});
  assert.equal(invite.status, 201, JSON.stringify(invite.result));
  const row = invite.result.row; cleanup.push(() => admin(`/api/admin/roles/${row.id}`, 'DELETE', {version: 1}));
  const token = new URL(invite.result.invitation, origin).searchParams.get('token');
  const password = `Viewer-${randomUUID()}`;
  const viewer = client();
  assert.equal((await viewer('/api/team/activate', 'POST', {token, password})).status, 200);
  assert.equal((await viewer('/api/team/activate', 'POST', {token, password})).status, 400);
  assert.equal((await viewer('/api/auth/sign-in/email', 'POST', {email, password})).status, 200);
  assert.equal((await viewer('/api/admin')).status, 200);
  assert.equal((await viewer('/api/admin/vehicles', 'POST', {name: 'Forbidden'})).status, 403);
  assert.equal((await viewer('/api/admin/vehicle-categories')).status, 200);
  assert.equal((await viewer('/api/admin/vehicle-categories', 'POST', {name:'Forbidden'})).status, 403);
  assert.equal((await viewer('/api/content?admin=1')).status, 403);
  assert.deepEqual((await viewer('/api/admin')).result.data.customers, []);
  assert.equal((await admin(`/api/admin/roles/${row.id}`, 'PATCH', {...row, _version: '2', status: 'Disabled'})).status, 200);
  assert.equal((await viewer('/api/admin')).status, 401);
});
test('same-origin mutations and missing delivery providers fail safely', async () => {
  const denied = await fetch(origin + '/api/profile', {method: 'PUT', headers: {'Content-Type': 'application/json', Origin: 'https://untrusted.example'}, body: '{}'});
  assert.equal(denied.status, 403);
  if (!process.env.RESEND_API_KEY) {
    const created = await admin('/api/admin/notifications', 'POST', {id: 'NEW', recipient: `test-${suffix}@example.com`, booking: '', channel: 'Email', message: `Test ${suffix}`, status: 'Draft'});
    assert.equal(created.status, 201, JSON.stringify(created.result)); const row = created.result.row;
    cleanup.push(() => admin(`/api/admin/notifications/${row.id}`, 'DELETE', {version: 1}));
    const sent = await admin(`/api/admin/notifications/${row.id}/send`, 'POST', {});
    assert.equal(sent.status, 503); assert.equal((await admin('/api/admin')).result.data.notifications.find(item => item.id === row.id).status, 'Draft');
  }
});
test('drafts stay private, publishing is synchronized, and stale content saves fail', async () => {
  if (process.env.CONTENT_ADMIN_PIN) assert.equal((await admin('/api/content/access', 'POST', {action: 'login', pin: process.env.CONTENT_ADMIN_PIN})).status, 200);
  const loaded = await admin('/api/content?admin=1');
  assert.equal(loaded.status, 200, JSON.stringify(loaded.result));
  const original = loaded.result;
  const key = 'seo.description';
  const value = `${original.draft[key]} [integration ${suffix}]`;
  const restore = async () => {const current = (await admin('/api/content?admin=1')).result; const draft = {...current.draft, [key]: original.draft[key]}; const live = {...current.published, [key]: original.published[key]}; const publish = await admin('/api/content', 'POST', {action: 'publish', version: current.version, values: live}); assert.equal(publish.status, 200); const saved = await admin('/api/content', 'POST', {action: 'save', version: publish.result.version, values: draft}); assert.equal(saved.status, 200);};
  cleanup.push(restore);
  const saved = await admin('/api/content', 'POST', {action: 'save', version: original.version, values: {...original.draft, [key]: value}});
  assert.equal(saved.status, 200, JSON.stringify(saved.result));
  assert.equal((await guest('/api/content')).result.values[key], original.published[key]);
  assert.equal((await admin('/api/content', 'POST', {action: 'save', version: original.version, values: original.draft})).status, 409);
  const published = await admin('/api/content', 'POST', {action: 'publish', version: saved.result.version, values: {...original.published, [key]: value}});
  assert.equal(published.status, 200, JSON.stringify(published.result));
  assert.equal((await guest('/api/content')).result.values[key], value);
  assert.equal('draft' in (await guest('/api/content')).result, false);
});
test('operational modules persist, active offers publish, and payments use integer halalas', async () => {
  const records = {
    drivers: {name: `Driver ${suffix}`, phone: '+966500000001', city: 'Makkah', vehicle: vehicle.name, status: 'Available'},
    locations: {name: `Location ${suffix}`, description: 'Test location', image: '/images/header-background.jpg', destinations: 'Test destination', status: 'Active'},
    offers: {vehicleId:vehicle.id, image:'/images/header-background.jpg', pickup:`Test pickup ${suffix}`, destination:`Test destination ${suffix}`},
    feedback: {customer: `Review ${suffix}`, type: 'Review', rating: '5', message: 'Integration test only', status: 'Approved'},
    payments: {booking: booking.reference, customer: `Test customer ${suffix}`, amount: '125.50', method: 'Cash', status: 'Paid', notes: 'Integration test only'},
  };
  for (const [module, record] of Object.entries(records)) {
    const created = await admin(`/api/admin/${module}`, 'POST', {id: 'NEW', ...record});
    assert.equal(created.status, 201, `${module}: ${JSON.stringify(created.result)}`);
    const row = created.result.row;
    cleanup.push(() => admin(`/api/admin/${module}/${row.id}`, 'DELETE', {version: Number(row._version)}));
    const snapshot = await admin('/api/admin'); assert.ok(snapshot.result.data[module].some(item => item.id === row.id));
    if (module === 'payments') {assert.equal(row.amount, '125.5'); assert.ok(row._paidAt);}
  }
  const catalog = (await guest('/api/content')).result.catalog;
  assert.ok(catalog.locations.includes(`Location ${suffix}`));
  assert.ok(catalog.offers.some(offer => offer.route === fare.route));
  assert.ok(catalog.reviews.some(review => review.name === `Review ${suffix}`));
});

test('current website drafts, dynamic service/package pages and visibility publish from admin', async () => {
  if (process.env.CONTENT_ADMIN_PIN) assert.equal((await admin('/api/content/access','POST',{action:'login',pin:process.env.CONTENT_ADMIN_PIN})).status,200);
  const original=(await admin('/api/content?admin=1')).result;
  const key='public.website';
  assert.ok(original.published[key]);
  const website=JSON.parse(original.draft[key]);
  const service={...website.services[0],id:`sync-service-${suffix}`,slug:`sync-service-${suffix}`,title:`Synced service ${suffix}`,heading:`Synced service heading ${suffix}`};
  const packageVehicle={...website.vehicles[0],id:`sync-vehicle-${suffix}`,slug:`sync-vehicle-${suffix}`,name:`Synced vehicle ${suffix}`};
  website.services.push(service);website.vehicles.push(packageVehicle);website.slides[0].title=`Synced hero ${suffix}`;website.faqs[0].visible=false;
  cleanup.push(async()=>{const current=(await admin('/api/content?admin=1')).result;const published=await admin('/api/content','POST',{action:'publish',version:current.version,values:{...current.published,[key]:original.published[key]}});assert.equal(published.status,200);assert.equal((await admin('/api/content','POST',{action:'save',version:published.result.version,values:{...published.result.draft,[key]:original.draft[key]}})).status,200);});
  const saved=await admin('/api/content','POST',{action:'save',version:original.version,values:{...original.draft,[key]:JSON.stringify(website)}});
  assert.equal(saved.status,200,JSON.stringify(saved.result));
  assert.equal((await guest('/api/content')).result.values[key],original.published[key]);
  const published=await admin('/api/content','POST',{action:'publish',version:saved.result.version,values:saved.result.draft});
  assert.equal(published.status,200,JSON.stringify(published.result));
  const publicWebsite=JSON.parse((await guest('/api/content')).result.values[key]);
  assert.equal(publicWebsite.slides[0].title,website.slides[0].title);
  assert.equal(publicWebsite.faqs[0].visible,false);
  const serviceHtml=await(await fetch(`${origin}/services/${service.slug}`)).text();
  assert.match(serviceHtml,new RegExp(`<h1[^>]*>${service.title}</h1>`));
  const packageHtml=await(await fetch(`${origin}/packages/${packageVehicle.slug}`)).text();
  assert.match(packageHtml,new RegExp(`<h1[^>]*>${packageVehicle.name} Packages</h1>`));
  website.services[website.services.length-1].visible=false;
  const hidden=await admin('/api/content','POST',{action:'publish',version:published.result.version,values:{...published.result.draft,[key]:JSON.stringify(website)}});
  assert.equal(hidden.status,200,JSON.stringify(hidden.result));
  const hiddenHtml=await(await fetch(`${origin}/services/${service.slug}`)).text();
  assert.ok(hiddenHtml.includes('Page not found.'));
  const invalid=JSON.parse(JSON.stringify(website));invalid.slides[0].image='javascript:alert(1)';
  assert.equal((await admin('/api/content','POST',{action:'publish',version:hidden.result.version,values:{...hidden.result.draft,[key]:JSON.stringify(invalid)}})).status,400);
});
