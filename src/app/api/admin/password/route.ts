import {z} from "zod";
import {auth, requireAdmin} from "@/lib/auth";
import {body, failure, HttpError, json} from "@/lib/security/http";
import {changePasswordForSession} from "@/features/auth/change-password";

export const runtime = "nodejs";
const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: z.string().min(12, "Use at least 12 characters for your new password.").max(128),
  confirmPassword: z.string().max(128),
}).refine(value => value.newPassword === value.confirmPassword, "New passwords do not match.");

export async function POST(request: Request) {
  try {
    const input = schema.parse(await body(request, 4096));
    const user = await requireAdmin("settings", true);
    const session = await auth.api.getSession({headers: request.headers});
    if (!session || session.user.id !== user.id) throw new HttpError(401, "Please sign in again.");
    await changePasswordForSession(request, user.id, session.session.id, input.currentPassword, input.newPassword);
    return json({ok: true});
  } catch (error) {return failure(error);}
}
