import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import * as zod from 'zod';

const compile = path => ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const serviceCode = compile('../../src/features/auth/password-reset.ts');
class HttpError extends Error {constructor(status, message) {super(message); this.status = status;}}
function fixture() {
  let now = Date.now();
  class Clock extends Date {constructor(...args) {super(...(args.length ? args : [now]));} static now() {return now;}}
  let user = {id: 'admin', email: 'admin@example.com', status: 'Active', role: 'Administrator', version: 1};
  let account = {id: 'account', userId: 'admin', providerId: 'credential', password: 'hashed:old-password'};
  let records = new Map(), sessions = [{id: 'session', userId: 'admin'}], audits = [];
  const limits = new Map(), emails = [], notifications = [], faults = {smtp: false, audit: false};
  const matches = (row, where) => Object.entries(where).every(([key, value]) => typeof value === 'object' && value !== null ? key === 'email' ? row.email.toLowerCase() === value.equals : row[key] !== value.not : row[key] === value);
  let queue = Promise.resolve();
  const db = {
    $executeRaw: async () => 0,
    rateLimit: {upsert: async ({where}) => {const count = (limits.get(where.key) || 0) + 1; limits.set(where.key, count); return {count};}},
    verification: {
      findUnique: async ({where}) => records.get(where.id) ? structuredClone(records.get(where.id)) : null,
      upsert: async ({where, create, update}) => {const result = records.has(where.id) ? {...records.get(where.id), ...update} : create; records.set(where.id, result); return result;},
      update: async ({where, data}) => {const result = {...records.get(where.id), ...data}; records.set(where.id, result); return result;},
      delete: async ({where}) => {records.delete(where.id);},
      deleteMany: async ({where}) => {const record = records.get(where.id); if (record && record.value === where.value) records.delete(where.id);},
    },
    user: {findFirst: async ({where}) => matches(user, where) ? {...user} : null, updateMany: async ({where}) => {if (!matches(user, where)) return {count: 0}; user.version++; return {count: 1};}},
    account: {findFirst: async ({where}) => matches(account, where) ? {...account} : null, updateMany: async ({where, data}) => {if (!matches(account, where)) return {count: 0}; account = {...account, ...data}; return {count: 1};}},
    session: {deleteMany: async () => {sessions = [];}},
    auditLog: {create: async ({data}) => {if (faults.audit) throw new Error('audit failed'); audits.push(data);}},
    $transaction(callback) {
      const run = queue.then(async () => {const snapshot = structuredClone({user, account, records, sessions, audits}); try {return await callback(db);} catch (error) {({user, account, records, sessions, audits} = snapshot); throw error;}});
      queue = run.catch(() => {}); return run;
    },
  };
  const context = {exports: {}, Buffer, Date: Clock, process: {env: {BETTER_AUTH_SECRET: 'a-test-secret-long-enough'}}, console: {error() {}}, require(name) {
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return crypto;
    if (name === 'better-auth/crypto') return {hashPassword: async value => `hashed:${value}`};
    if (name === '@/lib/db') return {db};
    if (name === './password-change-notification') return {notifyPasswordChanged: async id => notifications.push(id)};
    if (name === '@/lib/security/http') return {HttpError, digest: value => crypto.createHash('sha256').update(value).digest('hex')};
    if (name === './password-reset-email') return {passwordResetEmailConfig() {}, sendPasswordResetOtp: async (email, otp) => {if (faults.smtp) throw new Error('smtp'); emails.push({email, otp});}};
    throw new Error(name);
  }};
  vm.runInNewContext(serviceCode, context);
  const api = context.exports;
  return {api, emails, notifications, faults, advance: ms => {now += ms;}, state: () => ({user, account, records, sessions, audits}),
    request: (email = user.email) => api.requestPasswordReset(email), verify: code => api.verifyPasswordResetOtp(user.email, code ?? emails.at(-1).otp), reset: token => api.completePasswordReset(user.email, token, 'a new strong password')};
}

test('backend generates a five-digit OTP, stores only its hash, and sends to active administrators', async () => {
  const f = fixture(); await f.request(' ADMIN@example.com ');
  assert.equal(f.emails.length, 1); assert.match(f.emails[0].otp, /^\d{5}$/);
  assert.equal(f.emails[0].email, 'admin@example.com');
  const record = [...f.state().records.values()][0], state = JSON.parse(record.value);
  assert.match(state.otpHash, /^[a-f0-9]{64}$/); assert.notEqual(state.otpHash, f.emails[0].otp);
  assert.equal(record.expiresAt.getTime() - record.createdAt.getTime(), 300000);
  const unknown = fixture(); await unknown.request('unknown@example.com'); assert.equal(unknown.emails.length, 0);
  for (const patch of [{role: 'Viewer'}, {status: 'Disabled'}]) {const disabled = fixture(); Object.assign(disabled.state().user, patch); await disabled.request(); assert.equal(disabled.emails.length, 0);}
});
test('resends honor cooldown and invalidate previous codes; account requests are limited', async () => {
  const f = fixture(); await f.request(); const old = f.emails[0].otp;
  await f.request(); assert.equal(f.emails.length, 1);
  f.advance(61000); await f.request(); assert.equal(f.emails.length, 2);
  const state = JSON.parse([...f.state().records.values()][0].value); assert.equal(state.attempts, 0);
  if (old !== f.emails[1].otp) await assert.rejects(f.verify(old), {status: 400});
  await assert.rejects(f.request(), {status: 429});
});
test('five wrong guesses permanently block that code and expiration is enforced', async () => {
  const f = fixture(); await f.request(); const wrong = f.emails[0].otp === '00000' ? '11111' : '00000';
  for (let i = 0; i < 5; i++) await assert.rejects(f.verify(wrong), {status: 400});
  assert.equal(JSON.parse([...f.state().records.values()][0].value).attempts, 5);
  await assert.rejects(f.verify(), {status: 400});
  const expired = fixture(); await expired.request(); expired.advance(300001); await assert.rejects(expired.verify(), {status: 400});
});
test('verification issues one single-use token; reset hashes password and revokes all sessions', async () => {
  const f = fixture(); await f.request(); const token = await f.verify(); assert.match(token, /^[a-f0-9]{64}$/);
  const state = JSON.parse([...f.state().records.values()][0].value); assert.equal(state.otpHash, ''); assert.notEqual(state.tokenHash, token);
  await assert.rejects(f.verify(), {status: 400});
  await f.reset(token); assert.equal(f.state().account.password, 'hashed:a new strong password');
  assert.equal(f.state().sessions.length, 0); assert.equal(f.state().records.size, 0);
  assert.equal(f.state().audits[0].action, 'password-reset'); await assert.rejects(f.reset(token), {status: 400});
  assert.deepEqual(f.notifications, ['admin']);
});
test('concurrent verification and reset cannot consume a challenge twice', async () => {
  const f = fixture(); await f.request(); const verification = await Promise.allSettled([f.verify(), f.verify()]);
  assert.equal(verification.filter(row => row.status === 'fulfilled').length, 1);
  const token = verification.find(row => row.status === 'fulfilled').value;
  const resets = await Promise.allSettled([f.reset(token), f.reset(token)]);
  assert.equal(resets.filter(row => row.status === 'fulfilled').length, 1); assert.equal(f.state().audits.length, 1);
});
test('invalid, expired, stale or unauthorized tokens cannot update passwords', async () => {
  for (const mode of ['wrong', 'expired', 'version', 'role', 'status']) {
    const f = fixture(); await f.request(); const token = await f.verify();
    if (mode === 'expired') f.advance(300001);
    if (mode === 'version') f.state().user.version++;
    if (mode === 'role') f.state().user.role = 'Viewer';
    if (mode === 'status') f.state().user.status = 'Disabled';
    await assert.rejects(f.reset(mode === 'wrong' ? '0'.repeat(64) : token), {status: 400});
    assert.equal(f.state().account.password, 'hashed:old-password'); assert.equal(f.state().sessions.length, 1);
  }
});
test('transaction failures preserve password, sessions and reset token', async () => {
  const f = fixture(); await f.request(); const token = await f.verify(); f.faults.audit = true;
  await assert.rejects(f.reset(token), /audit failed/); assert.equal(f.state().account.password, 'hashed:old-password');
  assert.equal(f.state().sessions.length, 1); assert.equal(f.state().records.size, 1);
  assert.equal(f.notifications.length, 0);
  f.faults.audit = false; await f.reset(token);
});
test('SMTP failures remove the challenge without exposing account existence', async () => {
  const f = fixture(); f.faults.smtp = true; assert.equal(await f.request(), undefined); assert.equal(f.state().records.size, 0);
});

const schemaContext = {exports: {}, require: () => zod};
vm.runInNewContext(compile('../../src/features/auth/password-reset-schemas.ts'), schemaContext);
test('reset payload validation enforces OTP format, email and matching strong passwords', () => {
  const s = schemaContext.exports;
  assert.equal(s.resetCompleteSchema.parse({email: 'admin@example.com', newPassword: '1234', confirmPassword: '1234'}).newPassword, '1234');
  assert.equal(s.resetRequestSchema.parse({email: ' ADMIN@example.com '}).email, 'admin@example.com');
  assert.throws(() => s.resetVerifySchema.parse({email: 'admin@example.com', otp: '123'}));
  assert.throws(() => s.resetVerifySchema.parse({email: 'admin@example.com', otp: '123456'}));
  assert.throws(() => s.resetCompleteSchema.parse({email: 'admin@example.com', newPassword: 'abc', confirmPassword: 'abc'}));
  assert.throws(() => s.resetCompleteSchema.parse({email: 'admin@example.com', newPassword: 'a long password', confirmPassword: 'a different password'}));
});

function routeFixture(action) {
  const calls = [], cookieCalls = [];
  const http = {exports: {}, Response, Buffer, console, require(name) {
    if (name === 'node:crypto') return crypto;
    if (name === '@/lib/db') return {db: {}};
    if (name === 'zod') return zod;
    if (name === './origins') return {trustedOrigins: () => ['https://falak.test']};
    throw new Error(name);
  }};
  vm.runInNewContext(compile('../../src/lib/security/http.ts'), http);
  const context = {exports: {}, process: {env: {NODE_ENV: 'production'}}, require(name) {
    if (name === 'next/headers') return {cookies: async () => ({get: () => ({value: 'a'.repeat(64)}), set: (...args) => cookieCalls.push(args)})};
    if (name === '@/lib/security/http') return {...http.exports, rateLimit: async () => {}};
    if (name === '@/features/auth/password-reset-schemas') return schemaContext.exports;
    if (name === '@/features/auth/password-reset') return {RESET_COOKIE: 'reset', RESET_LIFETIME_SECONDS: 300, requestPasswordReset: async (...args) => calls.push(args), verifyPasswordResetOtp: async (...args) => {calls.push(args); return 'b'.repeat(64);}, completePasswordReset: async (...args) => calls.push(args)};
    throw new Error(name);
  }};
  vm.runInNewContext(compile(`../../src/app/api/password-reset/${action}/route.ts`), context);
  return {calls, cookieCalls, post: (payload, origin = 'https://falak.test') => context.exports.POST(new Request(`https://falak.test/api/password-reset/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin}, body: JSON.stringify(payload)}))};
}
test('reset routes reject cross-origin requests before calling services', async () => {
  for (const action of ['request', 'verify', 'complete']) {const f = routeFixture(action); assert.equal((await f.post({}, 'https://evil.test')).status, 403); assert.equal(f.calls.length, 0);}
});
test('verify keeps reset token out of JSON and sets a secure HttpOnly cookie', async () => {
  const f = routeFixture('verify'); const response = await f.post({email: 'admin@example.com', otp: '12345'});
  assert.deepEqual(await response.json(), {ok: true});
  const options = f.cookieCalls[0][2]; assert.equal(options.httpOnly, true); assert.equal(options.secure, true); assert.equal(options.sameSite, 'strict'); assert.equal(options.maxAge, 300);
});
test('complete uses the cookie token and clears it after success', async () => {
  const f = routeFixture('complete'); const response = await f.post({email: 'admin@example.com', newPassword: 'a long new password', confirmPassword: 'a long new password'});
  assert.equal(response.status, 200); assert.equal(f.calls[0][1], 'a'.repeat(64)); assert.equal(f.cookieCalls[0][2].maxAge, 0);
});

test('request returns a generic message without OTP or reset token', async () => {
  const f = routeFixture('request'); const response = await f.post({email: 'unknown@example.com'});
  assert.equal(response.status, 200); const body = await response.json();
  assert.match(body.message, /If this email belongs to an active administrator/);
  assert.equal(body.otp, undefined); assert.equal(body.token, undefined);
});

test('Gmail sender uses TLS and server credentials; missing configuration fails closed', async () => {
  const sent = [], options = [], env = {BETTER_AUTH_SECRET: 'secret', GMAIL_SMTP_USER: 'sender@gmail.com', GMAIL_SMTP_APP_PASSWORD: 'abcd efgh ijkl mnop'};
  let closed = false;
  const context = {exports: {}, process: {env}, require(name) {
    if (name === 'server-only') return {};
    if (name === '@/lib/security/http') return {HttpError};
    if (name === 'nodemailer') return {default: {createTransport: config => {options.push(config); return {sendMail: async mail => sent.push(mail), close: () => {closed = true;}};}}};
    throw new Error(name);
  }};
  vm.runInNewContext(compile('../../src/features/auth/password-reset-email.ts'), context);
  await context.exports.sendPasswordResetOtp('admin@example.com', '12345');
  assert.equal(options[0].host, 'smtp.gmail.com'); assert.equal(options[0].port, 465); assert.equal(options[0].secure, true);
  assert.equal(options[0].auth.pass, 'abcdefghijklmnop'); assert.equal(sent[0].to, 'admin@example.com');
  assert.match(sent[0].text, /12345/); assert.equal(closed, true);
  await context.exports.sendPasswordChangedEmail('admin@example.com');
  assert.equal(sent[1].to, 'admin@example.com'); assert.match(sent[1].subject, /password has changed/);
  assert.match(sent[1].text, /changed successfully/); assert.doesNotMatch(sent[1].text, /12345|abcdefghijklmnop/);
  delete env.GMAIL_SMTP_APP_PASSWORD; assert.throws(() => context.exports.passwordResetEmailConfig(), {status: 503});
  delete env.GMAIL_SMTP_USER;
  env.GMAIL_USER = 'alias@gmail.com'; env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop';
  const config = context.exports.passwordResetEmailConfig();
  assert.equal(config.user, 'alias@gmail.com'); assert.equal(config.pass, 'abcdefghijklmnop');
});

test('change notifications use the stored account email and tolerate delivery failure', async () => {
  const recipients = [], logs = [];
  let fail = false;
  const context = {exports: {}, console: {error: message => logs.push(message)}, require(name) {
    if (name === 'server-only') return {};
    if (name === '@/lib/db') return {db: {user: {findUniqueOrThrow: async ({where}) => {assert.equal(where.id, 'admin'); return {email: 'registered@example.com'};}}}};
    if (name === './password-reset-email') return {sendPasswordChangedEmail: async email => {if (fail) throw new Error('private SMTP details'); recipients.push(email);}};
    throw new Error(name);
  }};
  vm.runInNewContext(compile('../../src/features/auth/password-change-notification.ts'), context);
  await context.exports.notifyPasswordChanged('admin');
  assert.deepEqual(recipients, ['registered@example.com']);
  fail = true; await assert.doesNotReject(context.exports.notifyPasswordChanged('admin'));
  assert.equal(logs.length, 1); assert.doesNotMatch(logs[0], /private SMTP details|registered@example.com/);
});
