import "server-only";
import {hashPassword, verifyPassword} from "better-auth/crypto";
import {db} from "@/lib/db";
import {HttpError, rateLimit} from "@/lib/security/http";
import {notifyPasswordChanged} from "./password-change-notification";

export async function changePasswordForSession(request: Request, userId: string, sessionId: string, currentPassword: string, newPassword: string) {
  await rateLimit(request, "password-change", 20, 900);
  await rateLimit(request, `password-change-user:${userId}`, 5, 900);
  const account = await db.account.findFirst({where: {userId, providerId: "credential"}});
  if (!account?.password || !await verifyPassword({hash: account.password, password: currentPassword})) throw new HttpError(400, "Your current password is incorrect.");
  if (currentPassword === newPassword) throw new HttpError(400, "Choose a password different from your current password.");
  const password = await hashPassword(newPassword);
  await db.$transaction(async tx => {
    const session = await tx.session.findFirst({where: {id: sessionId, userId, expiresAt: {gt: new Date()}}});
    if (!session) throw new HttpError(401, "Your session expired. Please sign in again.");
    const user = await tx.user.updateMany({where: {id: userId, status: "Active", role: "Administrator"}, data: {version: {increment: 1}}});
    if (!user.count) throw new HttpError(403, "Your account cannot change this password.");
    // Reject stale verification if another request changed the password during hashing.
    const changed = await tx.account.updateMany({where: {id: account.id, userId, password: account.password}, data: {password}});
    if (!changed.count) throw new HttpError(409, "Your password changed in another session. Please try again.");
    await tx.session.deleteMany({where: {userId}});
    await tx.auditLog.create({data: {userId, action: "password-change", resource: "users", recordId: userId}});
  });
  await notifyPasswordChanged(userId);
}
