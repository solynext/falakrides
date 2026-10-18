"use client";
import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import BrandLogo from "@/components/ui/brand-logo";
import Icon from "@/components/ui/icon";
import {api} from "@/lib/api-client";
import "./auth-form.css";
import "./password-reset-form.css";

let refreshRedirectHandled = false;

export default function PasswordResetForm({initialEmail = ""}: {initialEmail?: string}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [showPasswords, setShowPasswords] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const otpInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!refreshRedirectHandled && navigation?.type === "reload" && new URL(navigation.name).pathname === "/forgot-password") {
      refreshRedirectHandled = true;
      router.replace("/login");
    }
  }, [router]);
  useEffect(() => {heading.current?.focus();}, [step]);
  useEffect(() => {
    if (!resendAt) return;
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [resendAt]);
  async function requestCode() {
    await api("/api/password-reset/request", {method: "POST", body: JSON.stringify({email: email.trim()})});
    setEmail(email.trim().toLowerCase()); setNotice("If this is an active admin email, a code will arrive shortly. The code expires in 5 minutes."); setOtp(""); setResendSeconds(60); setResendAt(Date.now() + 60000); setStep("otp");
  }
  async function resend() {
    if (pending.current) return;
    if (Date.now() < resendAt) {setError("Wait a minute before requesting another code."); return;}
    pending.current = true; setBusy(true); setError("");
    try {await requestCode();} catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to send code.");} finally {pending.current = false; setBusy(false);}
  }
  async function verifyCode(code: string) {
    if (pending.current || code.length !== 5) return;
    pending.current = true; setBusy(true); setError("");
    try {
      await api("/api/password-reset/verify", {method: "POST", body: JSON.stringify({email, otp: code})});
      setNotice(""); setStep("password");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to check your code.");
      setOtp(""); requestAnimationFrame(() => otpInput.current?.focus());
    } finally {pending.current = false; setBusy(false);}
  }
  return <main className="adm-reset-shell"><div className="adm-reset-brand"><BrandLogo size={44}/></div><section className="adm-auth-card adm-reset-card" aria-labelledby="reset-title">
    {step !== "done" && <ol className="adm-reset-steps" aria-label="Password reset progress">{["Email", "Confirm", "Reset"].map((label, index) => {const current = step === "email" ? 0 : step === "otp" ? 1 : 2; return <li key={label} className={index <= current ? "is-active" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Icon name="check" size={12}/> : index + 1}</span>{label}</li>;})}</ol>}
    <div className="adm-auth-heading"><span className={`adm-cms-pin-icon ${step === "done" ? "adm-reset-success" : ""}`}><Icon name={step === "done" ? "check" : "lock"} size={23}/></span><h2 ref={heading} tabIndex={-1} id="reset-title">{step === "email" ? "Reset your password" : step === "otp" ? "Confirm your code" : step === "password" ? "Set a new password" : "You're all set"}</h2><p>{step === "email" ? "A 5-digit code will be sent to your email." : step === "otp" ? `Enter the 5-digit verification code for ${email}.` : step === "password" ? "Use at least 4 characters for your new password." : "Your password has been updated. Sign in to continue."}</p></div>
    {step !== "done" && <form key={step} onSubmit={async event => {
      event.preventDefault(); if (pending.current || step === "otp") return;
      pending.current = true; setBusy(true); setError("");
      const form = new FormData(event.currentTarget);
      try {
        if (step === "email") await requestCode();
        else {if (form.get("newPassword") !== form.get("confirmPassword")) throw new Error("Passwords do not match."); await api("/api/password-reset/complete", {method: "POST", body: JSON.stringify({email, newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword")})}); setStep("done");}
      } catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to reset your password.");} finally {pending.current = false; setBusy(false);}
    }}>
      {step === "email" && <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} autoComplete="username" placeholder="you@example.com" required disabled={busy}/></label>}
      {step === "otp" && <label>Verification code<input ref={otpInput} className="adm-reset-otp" type="text" inputMode="numeric" pattern="[0-9]{5}" minLength={5} maxLength={5} value={otp} onChange={event => {const code = event.target.value.replace(/\D/g, "").slice(0, 5); setOtp(code); setError(""); if (code.length === 5) void verifyCode(code);}} autoComplete="one-time-code" placeholder="00000" required disabled={busy}/></label>}
      {step === "password" && <><label>New password<input type={showPasswords ? "text" : "password"} name="newPassword" autoComplete="new-password" minLength={4} maxLength={128} required disabled={busy}/></label><label>Confirm password<input type={showPasswords ? "text" : "password"} name="confirmPassword" autoComplete="new-password" minLength={4} maxLength={128} required disabled={busy}/></label><label className="adm-reset-show"><input type="checkbox" checked={showPasswords} disabled={busy} onChange={event => setShowPasswords(event.target.checked)}/>Show passwords</label></>}
      {notice && <p className="adm-reset-notice" role="status">{notice}</p>}
      {error && <p className="adm-account-error" role="alert">{error}</p>}
      {step === "otp" ? busy && <p className="adm-reset-notice" role="status">Checking code...</p> : <button type="submit" className="adm-button" disabled={busy}>{busy ? "Please wait..." : step === "email" ? "Send code" : "Reset password"}</button>}
      {step === "otp" && <button type="button" className="adm-reset-text-button" disabled={busy || resendSeconds > 0} onClick={() => void resend()}>{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}</button>}
      {step !== "email" && <button type="button" className="adm-reset-text-button" disabled={busy} onClick={() => {setStep("email"); setError(""); setNotice(""); setOtp(""); setShowPasswords(false);}}>{step === "otp" ? "Use a different email" : "Start again"}</button>}
    </form>}
    <Link className={step === "done" ? "adm-button adm-reset-sign-in" : "adm-reset-back"} href="/login">Back to sign in</Link>
  </section></main>;
}
