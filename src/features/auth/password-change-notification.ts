import "server-only";
import {db} from "@/lib/db";
import {sendPasswordChangedEmail} from "./password-reset-email";

/** Call only after the password transaction commits successfully. */
export async function notifyPasswordChanged(userId: string) {
  try {
    const user = await db.user.findUniqueOrThrow({where: {id: userId}, select: {email: true}});
    await sendPasswordChangedEmail(user.email);
  } catch {
    // Delivery failure must not report an already committed password change as failed.
    console.error("Password changed notification could not be delivered. Check Gmail SMTP configuration.");
  }
}
