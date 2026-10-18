import "server-only";
import nodemailer from "nodemailer";
import {HttpError} from "@/lib/security/http";

export function passwordResetEmailConfig() {
  const user = process.env.GMAIL_SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "") || process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !pass || !process.env.BETTER_AUTH_SECRET) throw new HttpError(503, "Password reset email is not configured. Contact your administrator.");
  return {user, pass};
}

export async function sendPasswordResetOtp(email: string, otp: string) {
  await sendAccountEmail(email, "Your Falak Rides password reset code",
    `Your password reset code is ${otp}.\n\nThis code expires in 5 minutes. If you did not request a password reset, ignore this email. Do not share this code.`,
    `<div style="font-family:Arial,sans-serif;max-width:440px;padding:24px;color:#24331d"><h2>Reset your password</h2><p>Your Falak Rides verification code:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 5 minutes. Do not share it.</p><p style="color:#6c7267">If you did not request this, ignore this email.</p></div>`);
}

export async function sendPasswordChangedEmail(email: string) {
  await sendAccountEmail(email, "Your Falak Rides password has changed",
    "Your Falak Rides admin password was changed successfully.\n\nIf you made this change, no further action is needed. If you did not make this change, reset your password immediately and contact your administrator.",
    '<div style="font-family:Arial,sans-serif;max-width:440px;padding:24px;color:#24331d"><h2>Password changed</h2><p>Your Falak Rides admin password was changed successfully.</p><p>If you made this change, no further action is needed.</p><p style="color:#6c7267">If you did not make this change, reset your password immediately and contact your administrator.</p></div>');
}

export async function sendAccountEmail(email: string, subject: string, text: string, html: string) {
  const auth = passwordResetEmailConfig();
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true, auth,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  try {
    await transport.sendMail({
      from: {name: "Falak Rides", address: auth.user}, to: email,
      subject, text, html,
    });
  } finally {transport.close();}
}
