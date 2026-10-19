"use client";

import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {isDialogBackdropClick} from "@/lib/dialog-events";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import Icon from "@/components/ui/icon";
import {useUnsavedChanges, useConfirmNavigation} from "@/components/forms/unsaved-changes";
import {api} from "@/lib/api-client";

export default function AdminProfile({onNavigate}: {onNavigate: (section: string) => void}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({name: "", email: "", role: ""});
  const [profileError, setProfileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const confirmClose = useUnsavedChanges(dirty, () => {setDirty(false); dialog.current?.querySelector("form")?.reset();});
  const confirmNavigation = useConfirmNavigation();
  function closeProfile() {confirmClose(() => dialog.current?.close());}
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  useEffect(() => {let active = true; api<typeof profile>("/api/admin/profile").then(result => {if (active) setProfile(result);}).catch(() => {}); return () => {active = false;};}, []);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function navigate(section: string) { setOpen(false); onNavigate(section); trigger.current?.focus(); }

  function logout() {
    if (loggingOut) return;
    setConfirmLogout(true);
  }
  async function performLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api("/api/auth/sign-out", {method: "POST", body: "{}"});
      window.location.replace("/login");
    } catch {
      setLogoutError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return <div className="adm-account" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="adm-account-trigger" aria-label={`Admin profile: ${profile.name}`} aria-expanded={open} aria-controls="admin-account-options" onClick={() => setOpen(!open)}>
      <span className="adm-profile-avatar">{initials}</span>
      <span className="adm-profile"><strong>{profile.name}</strong><small>{profile.role}</small></span>
      <svg className={open ? "is-open" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && <div className="adm-account-dropdown" id="admin-account-options">
      <div className="adm-account-summary"><span className="adm-profile-avatar">{initials}</span><div><strong>{profile.name}</strong><small>{profile.email}</small><span className="adm-account-role">{profile.role}</span></div></div>
      <nav aria-label="Admin account options">
        <button type="button" onClick={() => { setOpen(false); setSaved(false); setDirty(false); dialog.current?.querySelector("form")?.reset(); dialog.current?.showModal(); }}><Icon name="user" size={19}/><span>My profile<small>View and edit your details</small></span></button>
        <button type="button" onClick={() => navigate("settings")}><ProfileIcon name="settings"/><span>Workspace settings<small>Company details and preferences</small></span></button>
        <button type="button" onClick={() => navigate("roles")}><Icon name="shield" size={19}/><span>Team &amp; roles<small>Manage workspace access</small></span></button>
        <Link href="/" onClick={() => setOpen(false)}><ProfileIcon name="website"/><span>View website</span><Icon name="arrow" size={16}/></Link>
      </nav>
      <div className="adm-account-footer"><button type="button" className="adm-account-logout" disabled={loggingOut} onClick={logout}><ProfileIcon name="exit"/>{loggingOut ? "Logging out..." : "Logout"}</button></div>
      {logoutError && <p className="adm-account-error" role="alert">{logoutError}</p>}
    </div>}
    <dialog ref={dialog} className="adm-account-dialog" aria-labelledby="admin-profile-title" onClose={() => trigger.current?.focus()} onCancel={event => {event.preventDefault(); closeProfile();}} onClick={event => { if (isDialogBackdropClick(event)) closeProfile(); }}>
      <div className="adm-account-dialog-head"><div><h2 id="admin-profile-title">My profile</h2><p>Your account details.</p></div><button type="button" className="adm-icon-button app-x-button" aria-label="Close profile" onClick={closeProfile}><ProfileIcon name="close"/></button></div>
      <form onChange={event => {const data = new FormData(event.currentTarget); setDirty(String(data.get("name") || "") !== profile.name || String(data.get("email") || "") !== profile.email);}} onSubmit={async event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const name = String(values.get("name") || "").trim();
        if (!name || saving) return;
        setSaving(true); setProfileError("");
        try {const updated = await api<{name: string; email: string}>("/api/admin/profile", {method: "PATCH", body: JSON.stringify({name, email: String(values.get("email") || "").trim()})}); setProfile({...profile, ...updated}); setSaved(true); setDirty(false); dialog.current?.close();}
        catch (error) {setProfileError(error instanceof Error ? error.message : "Unable to save your profile.");}
        finally {setSaving(false);}
      }}>
        <div className="adm-account-fields">
          <label>Full name<input name="name" autoComplete="name" defaultValue={profile.name} required maxLength={80} pattern=".*\S.*" onChange={() => setSaved(false)}/></label>
          <label>Email address<input name="email" type="email" autoComplete="email" defaultValue={profile.email} required maxLength={254} onChange={() => setSaved(false)}/></label>
          <label>Role<input value={profile.role} readOnly/></label>
          {profileError && <p role="alert" className="adm-account-error">{profileError}</p>}
          <p>Profile changes are saved to your account.</p>
          {saved && <p className="adm-account-saved" role="status"><Icon name="check" size={16}/>Profile updated.</p>}
        </div>
        <div className="adm-account-dialog-actions"><button type="button" className="adm-button secondary" onClick={closeProfile}>Close</button><button type="submit" disabled={saving} className="adm-button">Save changes</button></div>
      </form>
    </dialog>
    {confirmLogout && <ConfirmationDialog title="Log out?" description="Are you sure you want to log out of your account?" confirmLabel="Logout" onCancel={() => setConfirmLogout(false)} onConfirm={() => {setConfirmLogout(false); confirmNavigation(() => {void performLogout();});}}/>}
  </div>;
}

function ProfileIcon({name}: {name: "settings" | "website" | "exit" | "close"}) {
  const paths = {
    settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></>,
    website: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></>,
    exit: <><path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
