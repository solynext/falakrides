import {cookies} from "next/headers";
import {body, failure, json, rateLimit} from "@/lib/security/http";
import {RESET_COOKIE, RESET_LIFETIME_SECONDS, verifyPasswordResetOtp} from "@/features/auth/password-reset";
import {resetVerifySchema} from "@/features/auth/password-reset-schemas";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = resetVerifySchema.parse(await body(request, 4096));
    await rateLimit(request, "password-reset-verify", 30, 900);
    const token = await verifyPasswordResetOtp(input.email, input.otp);
    (await cookies()).set(RESET_COOKIE, token, {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/password-reset", maxAge: RESET_LIFETIME_SECONDS});
    return json({ok: true});
  } catch (error) {return failure(error);}
}
