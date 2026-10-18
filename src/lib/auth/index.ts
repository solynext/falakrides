import {betterAuth} from "better-auth";
import {prismaAdapter} from "better-auth/adapters/prisma";
import {headers} from "next/headers";
import {db} from "@/lib/db";
import {HttpError} from "@/lib/security/http";
import {canAccess} from "@/features/auth/permissions";
import {authBaseURL, trustedOrigins} from "@/lib/security/origins";
export {canAccess} from "@/features/auth/permissions";

export const auth = betterAuth({
  database: prismaAdapter(db, {provider: "postgresql"}),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseURL(),
  trustedOrigins: async request => trustedOrigins(request),
  disabledPaths: ["/request-password-reset", "/reset-password"],
  emailAndPassword: {enabled: true, disableSignUp: true, minPasswordLength: 12},
  user: {additionalFields: {role: {type: "string", defaultValue: "Viewer", input: false}, status: {type: "string", defaultValue: "Active", input: false}}},
  session: {expiresIn: 60 * 60 * 8, updateAge: 60 * 30, cookieCache: {enabled: false}},
  rateLimit: {enabled: true, storage: "database", window: 60, max: 60, customRules: {"/sign-in/email": {window: 60, max: 5}}},
});

export async function currentAdmin() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session) return null;
  const user = await db.user.findUnique({where: {id: session.user.id}});
  return user?.status === "Active" ? user : null;
}
export async function requireAdmin(resource?: string, write = false) {
  const user = await currentAdmin();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  if (resource && !canAccess(user.role, resource, write)) throw new HttpError(403, "Your role does not allow this action.");
  return user;
}
