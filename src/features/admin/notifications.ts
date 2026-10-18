import {db} from "@/lib/db";
import {HttpError} from "@/lib/security/http";
import {sendAccountEmail} from "@/features/auth/password-reset-email";

function gmailConfigured() {
  return !!((process.env.GMAIL_SMTP_USER?.trim() || process.env.GMAIL_USER?.trim()) && (process.env.GMAIL_SMTP_APP_PASSWORD?.trim() || process.env.GMAIL_APP_PASSWORD?.trim()));
}

export function notificationConfigured(channel: string) {
  return channel === "Email" ? gmailConfigured() || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) : !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (channel === "WhatsApp" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM));
}
export async function deliverNotification(id: string) {
  const record = await db.notification.findUniqueOrThrow({where: {id}});
  if (record.status === "Sent") return record;
  const claimed = await db.notification.updateMany({where: {id, status: {in: ["Draft", "Queued", "Failed"]}}, data: {status: "Sending", error: null, version: {increment: 1}}});
  if (!claimed.count) throw new HttpError(409, "This notification is already being sent.");
  try {
    if (!notificationConfigured(record.channel)) throw new Error(`Configure the ${record.channel} delivery provider before sending.`);
    let providerId: string;
    if (record.channel === "Email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.recipient)) throw new Error("Use the recipient's email address.");
      if (gmailConfigured()) {
        const escape = (value: string) => value.replace(/[&<>"']/g, character => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[character]!));
        await sendAccountEmail(record.recipient, record.id.startsWith("booking-confirmed:") ? "Your Falak Rides booking is confirmed" : "Falak Rides booking update", record.message, `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px;color:#24331d;white-space:pre-wrap">${escape(record.message)}</div>`);
        providerId = `gmail:${id}`;
      } else {
      const response = await fetch("https://api.resend.com/emails", {method: "POST", headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `notification-${id}`}, body: JSON.stringify({from: process.env.EMAIL_FROM, to: [record.recipient], subject: record.id.startsWith("booking-confirmed:") ? "Your Falak Rides booking is confirmed" : "Falak Rides booking update", text: record.message}), signal: AbortSignal.timeout(15000)});
      const result = await response.json(); if (!response.ok) throw new Error("Email provider rejected the message. Check provider configuration."); providerId = result.id;
      }
    } else {
      const recipient = record.recipient.replace(/[\s()-]/g, "");
      if (!/^\+\d{8,15}$/.test(recipient)) throw new Error("Use the recipient's international phone number.");
      const whatsapp = record.channel === "WhatsApp";
      const from = whatsapp ? process.env.TWILIO_WHATSAPP_FROM! : process.env.TWILIO_SMS_FROM!;
      const payload = new URLSearchParams({From: whatsapp && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from, To: whatsapp ? `whatsapp:${recipient}` : recipient, Body: record.message});
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {method: "POST", headers: {Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded"}, body: payload, signal: AbortSignal.timeout(15000)});
      const result = await response.json(); if (!response.ok) throw new Error("Messaging provider rejected the message. Check provider configuration."); providerId = result.sid;
    }
    return await db.notification.update({where: {id}, data: {status: "Sent", providerId, error: null, version: {increment: 1}}});
  } catch (error) {
    await db.notification.update({where: {id}, data: {status: "Failed", error: error instanceof Error ? error.message : "Delivery failed", version: {increment: 1}}});
    throw new HttpError(502, error instanceof Error ? error.message : "Delivery failed. The notification was not marked as sent.");
  }
}
