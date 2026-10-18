import "server-only";
import {createHmac, randomBytes, randomInt, timingSafeEqual} from "node:crypto";
import {hashPassword} from "better-auth/crypto";
import {db} from "@/lib/db";
import {digest, HttpError} from "@/lib/security/http";
import {passwordResetEmailConfig, sendPasswordResetOtp} from "./password-reset-email";
import {notifyPasswordChanged} from "./password-change-notification";

export const RESET_LIFETIME_SECONDS = 300;
export const RESET_COOKIE = "falak-admin-password-reset";
const invalid = () => new HttpError(400, "The code or reset request is invalid or expired. Request a new code.");
const identifierFor = (email: string) => `admin-password-reset:${digest(email.trim().toLowerCase())}`;
type ResetState = {userId: string; version: number; nonce: string; otpHash: string; attempts: number; tokenHash?: string};
function otpHash(id: string, nonce: string, code: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new HttpError(503, "Password reset is not configured.");
  return createHmac("sha256", secret).update(`${id}:${nonce}:${code}`).digest("hex");
}
function equal(a: string, b: string) {return /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));}
function stateFrom(value: string): ResetState {return JSON.parse(value) as ResetState;}

export async function requestPasswordReset(email: string) {
  passwordResetEmailConfig();
  email = email.trim().toLowerCase();
  const id = identifierFor(email);
  // Account-wide throttling applies even across different client IP addresses.
  const key = `${id}:requests:${Math.floor(Date.now() / 900000)}`;
  const limit = await db.rateLimit.upsert({where: {key}, create: {key, count: 1, lastRequest: BigInt(Date.now())}, update: {count: {increment: 1}, lastRequest: BigInt(Date.now())}});
  if (limit.count > 3) throw new HttpError(429, "Too many reset requests. Please try again in 15 minutes.");
  const challenge = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const previous = await tx.verification.findUnique({where: {id}});
    if (previous && Date.now() - previous.createdAt.getTime() < 60000) return null;
    const user = await tx.user.findFirst({where: {email: {equals: email, mode: "insensitive"}, role: "Administrator", status: "Active"}});
    if (!user || !await tx.account.findFirst({where: {userId: user.id, providerId: "credential", password: {not: null}}})) return null;
    const otp = randomInt(0, 100000).toString().padStart(5, "0");
    const nonce = randomBytes(16).toString("hex");
    const state: ResetState = {userId: user.id, version: user.version, nonce, otpHash: otpHash(id, nonce, otp), attempts: 0};
    const value = JSON.stringify(state);
    const data = {identifier: id, value, expiresAt: new Date(Date.now() + RESET_LIFETIME_SECONDS * 1000), createdAt: new Date(), updatedAt: new Date()};
    await tx.verification.upsert({where: {id}, create: {id, ...data}, update: data});
    return {otp, value};
  });
  if (!challenge) return;
  try {await sendPasswordResetOtp(email, challenge.otp);} catch {
    await db.verification.deleteMany({where: {id, value: challenge.value}});
    // Keep the public response identical for registered and unregistered emails.
    console.error("Password reset SMTP delivery failed. Check Gmail SMTP configuration.");
  }
}

export async function verifyPasswordResetOtp(email: string, code: string): Promise<string> {
  const id = identifierFor(email);
  const token = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const record = await tx.verification.findUnique({where: {id}});
    if (!record || record.expiresAt <= new Date()) return null;
    const state = stateFrom(record.value);
    if (state.tokenHash || state.attempts >= 5) return null;
    if (!equal(state.otpHash, otpHash(id, state.nonce, code))) {
      await tx.verification.update({where: {id}, data: {value: JSON.stringify({...state, attempts: state.attempts + 1})}});
      return null; // Commit the failed attempt before returning an error.
    }
    const user = await tx.user.findFirst({where: {id: state.userId, version: state.version, status: "Active", role: "Administrator"}});
    if (!user) return null;
    const token = randomBytes(32).toString("hex");
    await tx.verification.update({where: {id}, data: {value: JSON.stringify({...state, otpHash: "", tokenHash: digest(token)}), expiresAt: new Date(Date.now() + RESET_LIFETIME_SECONDS * 1000)}});
    return token;
  });
  if (!token) throw invalid();
  return token;
}

export async function completePasswordReset(email: string, token: string, newPassword: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalid();
  const id = identifierFor(email);
  const password = await hashPassword(newPassword);
  const userId = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const record = await tx.verification.findUnique({where: {id}});
    if (!record || record.expiresAt <= new Date()) throw invalid();
    const state = stateFrom(record.value);
    if (!state.tokenHash || !equal(state.tokenHash, digest(token))) throw invalid();
    const user = await tx.user.updateMany({where: {id: state.userId, version: state.version, status: "Active", role: "Administrator"}, data: {version: {increment: 1}}});
    if (!user.count) throw invalid();
    const changed = await tx.account.updateMany({where: {userId: state.userId, providerId: "credential", password: {not: null}}, data: {password}});
    if (!changed.count) throw invalid();
    await tx.session.deleteMany({where: {userId: state.userId}});
    await tx.verification.delete({where: {id}});
    await tx.auditLog.create({data: {userId: state.userId, action: "password-reset", resource: "users", recordId: state.userId}});
    return state.userId;
  });
  await notifyPasswordChanged(userId);
}
