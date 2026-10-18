import {cookies} from "next/headers";
import {body, failure, json, rateLimit} from "@/lib/security/http";
import {completePasswordReset, RESET_COOKIE} from "@/features/auth/password-reset";
import {resetCompleteSchema} from "@/features/auth/password-reset-schemas";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = resetCompleteSchema.parse(await body(request, 4096));
    await rateLimit(request, "password-reset-complete", 10, 900);
    const jar = await cookies();
    await completePasswordReset(input.email, jar.get(RESET_COOKIE)?.value || "", input.newPassword);
    jar.set(RESET_COOKIE, "", {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/password-reset", maxAge: 0});
    return json({ok: true});
  } catch (error) {return failure(error);}
}
