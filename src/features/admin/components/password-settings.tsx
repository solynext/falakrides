"use client";

import {useEffect, useRef, useState} from "react";
import {api} from "@/lib/api-client";
import Icon from "@/components/ui/icon";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import "./password-settings.css";

export default function PasswordSettings() {
  const form = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useUnsavedChanges(dirty, () => {form.current?.reset(); setDirty(false);});
  useEffect(() => {if (saved) window.location.replace("/login?password=changed");}, [saved]);

  return <section className="adm-panel adm-password-settings" aria-labelledby="password-settings-title">
    <div className="adm-panel-head"><div><h2 id="password-settings-title">Password &amp; security</h2><p>Update the password for your administrator account.</p></div><Icon name="shield" size={20}/></div>
    <form ref={form} autoComplete="off" onChange={event => {const values = new FormData(event.currentTarget); setDirty([...values.values()].some(Boolean)); setSaved(false); setError("");}} onSubmit={async event => {
      event.preventDefault();
      if (pending.current) return;
      const values = new FormData(event.currentTarget);
      const currentPassword = String(values.get("currentPassword") || "");
      const newPassword = String(values.get("newPassword") || "");
      if (newPassword === currentPassword) {setError("Choose a password different from your current password."); return;}
      pending.current = true; setBusy(true); setError(""); setSaved(false);
      try {
        await api("/api/admin/password", {method: "POST", body: JSON.stringify({currentPassword, newPassword})});
        form.current?.reset(); setDirty(false);
        try {await api("/api/auth/sign-out", {method: "POST", body: "{}"});} catch { /* Sessions were already revoked by the password update. */ }
        setSaved(true);
      } catch (error) {setError(error instanceof Error ? error.message : "Unable to change your password. Please try again.");}
      finally {pending.current = false; setBusy(false);}
    }}>
      <div className="adm-password-fields">
        <label>Old password<input type="password" name="currentPassword" autoComplete="off" data-lpignore="true" data-1p-ignore="true" spellCheck={false} required maxLength={128} disabled={busy}/></label>
        <label>New password<input type="password" name="newPassword" autoComplete="off" data-lpignore="true" data-1p-ignore="true" spellCheck={false} required minLength={4} maxLength={128} aria-describedby="password-settings-help" disabled={busy}/></label>
        <p id="password-settings-help">Use at least 4 characters.</p>
        {error && <p className="adm-password-error" role="alert">{error}</p>}
        {saved && <p className="adm-password-success" role="status"><Icon name="check" size={17}/>Password changed successfully. Redirecting to sign in...</p>}
      </div>
      <div className="adm-password-footer"><p>You will be signed out after changing your password.</p><button type="submit" className="adm-button" disabled={busy}>{busy ? "Updating…" : "Change password"}</button></div>
    </form>
  </section>;
}
