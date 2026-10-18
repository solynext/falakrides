import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";

const compile = path => ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const serviceCode = compile("../../src/features/auth/change-password.ts");
const routeCode = compile("../../src/app/api/admin/password/route.ts");
const httpCode = compile("../../src/lib/security/http.ts");
class HttpError extends Error {constructor(status, message) {super(message); this.status = status;}}
const request = new Request("https://falak.test/api/admin/password");

function fixture() {
  let account = {id: "credential-1", userId: "admin-1", password: "hashed:old-password"};
  let user = {id: "admin-1", role: "Administrator", status: "Active", email: "admin@example.com", version: 1};
  let sessions = [{id: "current", userId: user.id, expiresAt: new Date(Date.now() + 60000)}, {id: "other", userId: user.id, expiresAt: new Date(Date.now() + 60000)}];
  let audits = [];
  const notifications = [];
  const limits = new Map(), failures = {audit: false};
  const db = {
    account: {findFirst: async () => structuredClone(account), updateMany: async ({where, data}) => {if (where.password !== account.password || where.userId !== account.userId) return {count: 0}; account = {...account, ...data}; return {count: 1};}},
    user: {updateMany: async ({where}) => {if (user.id !== where.id || user.role !== where.role || user.status !== where.status) return {count: 0}; user.version++; return {count: 1};}, findUniqueOrThrow: async () => user},
    session: {findFirst: async ({where}) => sessions.find(row => row.id === where.id && row.userId === where.userId && row.expiresAt > where.expiresAt.gt) || null, deleteMany: async ({where}) => {sessions = sessions.filter(row => row.userId !== where.userId || (where.id && row.id === where.id.not));}},
    auditLog: {create: async ({data}) => {if (failures.audit) throw new Error("Audit failed"); audits.push(data);}},
    $transaction: async callback => {const snapshot = structuredClone({account, user, sessions, audits}); try {return await callback(db);} catch (error) {({account, user, sessions, audits} = snapshot); throw error;}},
  };
  const context = {exports: {}, Date, require: name => {
    if (name === "server-only") return {};
    if (name === "better-auth/crypto") return {hashPassword: async password => `hashed:${password}`, verifyPassword: async ({hash, password}) => hash === `hashed:${password}`};
    if (name === "@/lib/db") return {db};
    if (name === "./password-change-notification") return {notifyPasswordChanged: async id => {assert.equal(account.password.startsWith("hashed:"), true); notifications.push(id);}};
    if (name === "@/lib/security/http") return {HttpError, rateLimit: async (_request, key, max) => {const count = (limits.get(key) || 0) + 1; limits.set(key, count); if (count > max) throw new HttpError(429, "Too many requests");}};
    throw new Error(name);
  }};
  vm.runInNewContext(serviceCode, context);
  return {state: () => ({account, user, sessions, audits}), failures, notifications,
    change: (current = "old-password", next = "new secure password", session = "current") => context.exports.changePasswordForSession(request, user.id, session, current, next)};
}

test("password change updates the hash and revokes all sessions", async () => {
  const f = fixture(); await f.change();
  assert.equal(f.state().account.password, "hashed:new secure password");
  assert.equal(f.state().sessions.length, 0);
  assert.equal(f.state().audits[0].action, "password-change");
  assert.deepEqual(f.notifications, ["admin-1"]);
});

test("incorrect current password and password reuse cannot change credentials", async () => {
  const f = fixture();
  await assert.rejects(f.change("wrong-password"), {status: 400});
  await assert.rejects(f.change("old-password", "old-password"), {status: 400});
  assert.equal(f.state().account.password, "hashed:old-password");
  assert.equal(f.state().sessions.length, 2);
  assert.equal(f.notifications.length, 0);
});

test("revoked, expired, disabled and non-administrator sessions cannot change a password", async () => {
  const missing = fixture(); await assert.rejects(missing.change("old-password", "new secure password", "missing"), {status: 401});
  const expired = fixture(); expired.state().sessions[0].expiresAt = new Date(0); await assert.rejects(expired.change(), {status: 401});
  const disabled = fixture(); disabled.state().user.status = "Suspended"; await assert.rejects(disabled.change(), {status: 403});
  const viewer = fixture(); viewer.state().user.role = "Viewer"; await assert.rejects(viewer.change(), {status: 403});
});

test("password guesses are limited per account", async () => {
  const f = fixture(); for (let i = 0; i < 5; i++) await assert.rejects(f.change("wrong-password"), {status: 400});
  await assert.rejects(f.change(), {status: 429});
});

test("failed transaction preserves the old password and sessions", async () => {
  const f = fixture(); f.failures.audit = true;
  await assert.rejects(f.change());
  assert.equal(f.state().account.password, "hashed:old-password");
  assert.equal(f.state().sessions.length, 2);
  assert.equal(f.notifications.length, 0);
});

function routeFixture({authenticated = true, allowed = true, sessionUser = "admin-1"} = {}) {
  const calls = [];
  const http = {exports: {}, Response, Buffer, console, require: name => {
    if (name === "node:crypto") return crypto;
    if (name === "@/lib/db") return {db: {}};
    if (name === "zod") return zod;
    if (name === "./origins") return {trustedOrigins: () => ["https://falak.test"]};
    throw new Error(name);
  }};
  vm.runInNewContext(httpCode, http);
  const context = {exports: {}, require: name => {
    if (name === "zod") return zod;
    if (name === "@/lib/security/http") return http.exports;
    if (name === "@/lib/auth") return {
      requireAdmin: async (resource, write) => {assert.equal(resource, "settings"); assert.equal(write, true); if (!authenticated) throw new http.exports.HttpError(401, "Sign in"); if (!allowed) throw new http.exports.HttpError(403, "Denied"); return {id: "admin-1"};},
      auth: {api: {getSession: async () => ({user: {id: sessionUser}, session: {id: "session-1"}})}},
    };
    if (name === "@/features/auth/change-password") return {changePasswordForSession: async (...args) => {calls.push(args);}};
    throw new Error(name);
  }};
  vm.runInNewContext(routeCode, context);
  return {calls, post: (payload, headers = {}) => context.exports.POST(new Request(request.url, {method: "POST", headers: {Origin: "https://falak.test", "Content-Type": "application/json", ...headers}, body: JSON.stringify(payload)}))};
}
const validInput = {currentPassword: "12345", newPassword: "new long passphrase"};

test("password change accepts a four-character new password", async () => {
  const f = routeFixture();
  assert.equal((await f.post({...validInput, newPassword: "1234", confirmPassword: "1234"})).status, 200);
});

test("route requires active administrator authorization and matching authenticated session", async () => {
  assert.equal((await routeFixture({authenticated: false}).post(validInput)).status, 401);
  assert.equal((await routeFixture({allowed: false}).post(validInput)).status, 403);
  assert.equal((await routeFixture({sessionUser: "someone-else"}).post(validInput)).status, 401);
});

test("route enforces same-origin requests and password length", async () => {
  const f = routeFixture();
  assert.equal((await f.post(validInput, {Origin: "https://attacker.test"})).status, 403);
  assert.equal((await f.post({...validInput, newPassword: "abc", confirmPassword: "abc"})).status, 400);
  assert.equal((await f.post({...validInput, newPassword: "x".repeat(129), confirmPassword: "x".repeat(129)})).status, 400);
  assert.equal(f.calls.length, 0);
});

test("route targets the authenticated account, accepts the existing short password, and returns no credentials", async () => {
  const f = routeFixture(); const response = await f.post({...validInput, userId: "someone-else"});
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), {ok: true});
  assert.equal(f.calls[0][1], "admin-1"); assert.equal(f.calls[0][2], "session-1");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
