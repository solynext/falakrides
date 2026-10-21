"use client";
import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Icon from "@/components/ui/icon";
import BrandLogo from "@/components/ui/brand-logo";
import Link from "next/link";
import "./auth-form.css";

export default function AuthForm({token, passwordChanged = false}: {token?: string; passwordChanged?: boolean}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    if (!retryUntil) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRetrySeconds(remaining);
      if (!remaining) {setRetryUntil(0); clearInterval(timer);}
    }, 250);
    return () => clearInterval(timer);
  }, [retryUntil]);
  const router = useRouter();
  return <main className="adm-auth"><section className="adm-auth-form-side" aria-labelledby="admin-sign-in-title"><Link className="adm-auth-top-link" href="/">Back to website<Icon size={15}/></Link><div className="adm-auth-card"><div className="adm-auth-brand"><BrandLogo size={48}/></div><div className="adm-auth-heading"><span className="adm-overline">FALAK RIDES ADMINISTRATION</span><h1 id="admin-sign-in-title">{token ? "Activate your account" : "Admin sign in"}</h1><p>{token ? "Set your password to get started." : "Enter your email and password to access the admin dashboard."}</p></div><form onSubmit={async event => {
    event.preventDefault(); if (pending.current || Date.now() < retryUntil) return; pending.current = true; setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(token ? "/api/team/activate" : "/api/auth/sign-in/email", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(token ? {token, password: data.get("password")} : {email: data.get("email"), password: data.get("password")})});
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : retryAfter ? Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000) : NaN;
        const seconds = Number.isFinite(delay) ? Math.max(1, delay) : token ? 600 : 60;
        setRetrySeconds(seconds); setRetryUntil(Date.now() + seconds * 1000); return;
      }
      const result = await response.json(); if (!response.ok) throw new Error(result.message || result.error || "Unable to sign in.");
      if (token) {router.replace("/login"); router.refresh();} else {router.replace("/admin"); router.refresh();}
    } catch (error) {setError(error instanceof Error ? error.message : "Unable to connect.");} finally {pending.current = false; setBusy(false);}
  }}>
    {!token && <label>Email<input type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" placeholder="you@example.com" disabled={busy}/></label>}
    <div className="adm-auth-password-field"><label htmlFor="workspace-password">Password</label><div className="adm-auth-password-input"><input id="workspace-password" type={showPassword ? "text" : "password"} name="password" required minLength={token ? 4 : 1} maxLength={128} autoComplete={token ? "new-password" : "current-password"} placeholder="Enter your password" disabled={busy}/><button type="button" className="adm-auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="workspace-password" disabled={busy} onClick={() => setShowPassword(current => !current)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{showPassword && <path d="m3 3 18 18"/>}</svg></button></div></div>
    {!token && <Link className="adm-auth-forgot" href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}>Forgot password?</Link>}
    {passwordChanged && <p role="status" className="adm-auth-success">Password changed successfully. Sign in with your new password.</p>}
    {retrySeconds > 0 && <p role="status" className="adm-account-error">Too many sign-in attempts. Try again in {retrySeconds} seconds.</p>}
    {error && <p role="alert" className="adm-account-error">{error}</p>}
    <button type="submit" className="adm-button" disabled={busy || retrySeconds > 0}>{retrySeconds > 0 ? `Try again in ${retrySeconds}s` : busy ? "Please wait..." : token ? "Activate account" : "Sign in"}<Icon size={17}/></button>
  </form><div className="adm-auth-secure"><Icon name="shield" size={15}/>Protected access for authorized team members</div></div><footer className="adm-auth-form-footer"><span>FALAK RIDES</span><span>Administration</span></footer></section></main>;
}
