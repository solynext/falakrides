import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as zod from "zod";

const compile = path => ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const httpCode = compile("../../src/lib/security/http.ts");
const routeCode = compile("../../src/app/api/admin/email-test/route.ts");

function fixture({allowed = true, configured = true, rejected = false} = {}) {
  const messages = [];
  const http = {exports: {}, Response, Buffer, console: {error() {}}, require: name => {
    if (name === "node:crypto") return crypto;
    if (name === "@/lib/db") return {db: {}};
    if (name === "zod") return zod;
    if (name === "./origins") return {trustedOrigins: () => ["https://falak.test"]};
    throw new Error(name);
  }};
  vm.runInNewContext(httpCode, http);
  const context = {exports: {}, console: {error() {}}, process: {env: configured ? {RESEND_API_KEY: "test-secret", EMAIL_FROM: "Falak Rides <onboarding@resend.dev>"} : {}}, require: name => {
    if (name === "resend") return {Resend: class {
      constructor(key) {assert.equal(key, "test-secret");}
      emails = {send: async message => {messages.push(message); return rejected ? {error: {message: "Private provider detail"}, data: null} : {error: null, data: {id: "test-message-id"}};}};
    }};
    if (name === "@/lib/auth") return {requireAdmin: async (resource, write) => {assert.equal(resource, "settings"); assert.equal(write, true); if (!allowed) throw new http.exports.HttpError(401, "Sign in"); return {id: "admin-1", email: "falakrides56@gmail.com"};}};
    if (name === "@/lib/security/http") return {...http.exports, rateLimit: async () => {}};
    throw new Error(name);
  }};
  vm.runInNewContext(routeCode, context);
  return {messages, post: (origin = "https://falak.test") => context.exports.POST(new Request("https://falak.test/api/admin/email-test", {method: "POST", headers: {Origin: origin, "Content-Type": "application/json"}, body: JSON.stringify({to: "attacker@example.com"})}))};
}

test("test email uses Falak Rides branding and the authenticated admin email, ignoring recipient overrides", async () => {
  const f = fixture(); const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(f.messages[0].from, "Falak Rides <onboarding@resend.dev>");
  assert.equal(f.messages[0].to[0], "falakrides56@gmail.com");
  assert.match(f.messages[0].subject, /Falak Rides/); assert.match(f.messages[0].text, /Falak Rides/);
  assert.equal((await response.json()).id, "test-message-id");
});

test("unauthenticated and cross-origin requests cannot send email", async () => {
  const denied = fixture({allowed: false}); assert.equal((await denied.post()).status, 401); assert.equal(denied.messages.length, 0);
  const crossSite = fixture(); assert.equal((await crossSite.post("https://attacker.test")).status, 403); assert.equal(crossSite.messages.length, 0);
});

test("unconfigured provider fails before attempting email delivery", async () => {
  const f = fixture({configured: false}); assert.equal((await f.post()).status, 503); assert.equal(f.messages.length, 0);
});

test("provider rejection returns a failure without leaking its payload", async () => {
  const f = fixture({rejected: true}); const response = await f.post();
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes("Private provider detail"));
});
