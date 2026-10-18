import {Resend} from "resend";
import {requireAdmin} from "@/lib/auth";
import {failure, HttpError, json, rateLimit, sameOrigin} from "@/lib/security/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin("settings", true);
    await rateLimit(request, `email-test:${admin.id}`, 3, 900);
    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.EMAIL_FROM;
    if (!apiKey || !sender) throw new HttpError(503, "Configure RESEND_API_KEY and EMAIL_FROM before sending email.");

    const resend = new Resend(apiKey);
    const {data, error} = await resend.emails.send({
      from: sender,
      to: [admin.email],
      subject: "Falak Rides — Email connection test",
      text: "Hello from Falak Rides!\n\nYour workspace email connection is working. This message was sent to your current administrator email address.\n\nFalak Rides\nYour journey, made comfortable.",
    });

    if (error || !data?.id) {
      // Provider payloads can include addresses or credentials; keep them out of logs.
      console.error("Falak Rides test email was rejected by the email provider.");
      throw new HttpError(502, "The email provider rejected the message. Check your API key and sender configuration.");
    }
    return json({success: true, message: "Falak Rides test email accepted for delivery.", id: data.id});
  } catch (error) {return failure(error);}
}
