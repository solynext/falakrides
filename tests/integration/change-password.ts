// Uses its own temporary PostgreSQL schema; leaves live credentials unchanged.
// Run: node --conditions=react-server --import tsx tests/integration/change-password.ts
import {spawn} from "node:child_process";
import {randomBytes, randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {config} from "dotenv";
import {neon} from "@neondatabase/serverless";
import {hashPassword, verifyPassword} from "better-auth/crypto";

async function main() {
config({path: [".env.local", ".env"], quiet: true});
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the isolated password-change test.");
const sql = neon(process.env.DATABASE_URL);
const schema = `falak_password_${randomBytes(6).toString("hex")}`;
if (!/^falak_password_[a-f0-9]{12}$/.test(schema)) throw new Error("Invalid test schema");
const scoped = (value: string) => {const url = new URL(value); url.searchParams.set("schema", schema); return url.toString();};
const direct = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
if (direct.hostname.endsWith(".neon.tech")) direct.hostname = direct.hostname.replace("-pooler.", ".");
process.env.DATABASE_URL = scoped(process.env.DATABASE_URL);
process.env.DIRECT_URL = scoped(direct.toString());
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString("hex");
process.env.TRUST_PROXY = "false";
let disconnect: (() => Promise<void>) | undefined;
try {
  await sql.query(`CREATE SCHEMA "${schema}"`);
  await new Promise<void>((resolve, reject) => {
    const migrationEnv = {...process.env};
    // The parent condition is needed for server-only imports, not Prisma's CLI.
    delete migrationEnv.NODE_OPTIONS;
    const child = spawn(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {env: migrationEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]});
    child.stdout.resume(); child.stderr.resume();
    child.on("error", reject);
    child.on("exit", code => code ? reject(new Error(`Isolated schema migration failed (exit ${code}).`)) : resolve());
  });
  const {db} = await import("../../src/lib/db/index");
  disconnect = () => db.$disconnect();
  const userId = randomUUID();
  const email = `password-${userId}@example.com`;
  const oldPassword = `old-password-${randomBytes(12).toString("hex")}`;
  await db.user.create({data: {id: userId, name: "Isolated password-change test", email, role: "Administrator"}});
  await db.account.create({data: {id: randomUUID(), userId, providerId: "credential", accountId: userId, password: await hashPassword(oldPassword)}});
  const request = new Request("http://localhost/api/admin/password");
  const {changePasswordForSession} = await import("../../src/features/auth/change-password");
  const currentSessionId = randomUUID(), otherSessionId = randomUUID();
  for (const id of [currentSessionId, otherSessionId]) await db.session.create({data: {id, userId, token: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 3600000)}});
  const changedPassword = `changed-password-${randomBytes(12).toString("hex")}`;
  await assert.rejects(changePasswordForSession(request, userId, currentSessionId, "incorrect-current-password", changedPassword));
  const changes = await Promise.allSettled([changePasswordForSession(request, userId, currentSessionId, oldPassword, changedPassword), changePasswordForSession(request, userId, currentSessionId, oldPassword, changedPassword)]);
  assert.equal(changes.filter(result => result.status === "fulfilled").length, 1);
  const changedAccount = await db.account.findFirstOrThrow({where: {userId, providerId: "credential"}});
  assert.ok(await verifyPassword({hash: changedAccount.password!, password: changedPassword}));
  assert.equal(await verifyPassword({hash: changedAccount.password!, password: oldPassword}), false);
  assert.ok(await db.session.findUnique({where: {id: currentSessionId}}));
  assert.equal(await db.session.findUnique({where: {id: otherSessionId}}), null);
  assert.equal(await db.auditLog.count({where: {userId, action: "password-change"}}), 1);
  console.log("PASS: settings password change checks the current password, rejects concurrent stale writes, keeps the current session and invalidates other sessions.");
} finally {
  await disconnect?.();
  await sql.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  console.log("Removed the temporary password-change test schema.");
}
}

main().catch(error => {console.error(error instanceof Error ? error.message : "Password change integration test failed."); process.exitCode = 1;});
