import {body, failure, json, rateLimit} from "@/lib/security/http";
import {requestPasswordReset} from "@/features/auth/password-reset";
import {resetRequestSchema} from "@/features/auth/password-reset-schemas";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = resetRequestSchema.parse(await body(request, 4096));
    await rateLimit(request, "password-reset-request", 10, 900);
    await requestPasswordReset(input.email);
    return json({ok: true, message: "If this email belongs to an active administrator, a verification code will be sent. It expires in 5 minutes."});
  } catch (error) {return failure(error);}
}
