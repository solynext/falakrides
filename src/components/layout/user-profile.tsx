"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";

import {useEffect, useId, useRef, useState} from "react";
import Link from "./header-link";
import Image from "next/image";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import {api} from "@/lib/api-client";
import Icon from "@/components/ui/icon";
import "./user-profile.css";

const storageKey = "falakrides.public-profile.v1";
const emptyProfile = {name: "", email: "", phone: "", image: "", version: 0};

export default function UserProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const value = JSON.stringify(profile);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const imageRequest = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const confirmClose = useUnsavedChanges(editing && (fieldsDirty || image !== profile.image || loadingImage), () => {imageRequest.current++; setLoadingImage(false); setFieldsDirty(false); setImage(profile.image); dialog.current?.querySelector("form")?.reset();});
  function closeProfile() {if (saving) return; confirmClose(() => {imageRequest.current++; setLoadingImage(false); setEditing(false); dialog.current?.close();});}
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  useEffect(() => {let active = true; api<typeof emptyProfile>("/api/profile").then(async current => {if (!current.name) {try {const legacy = JSON.parse(localStorage.getItem(storageKey) || "null"); if (legacy?.name) current = await api<typeof emptyProfile>("/api/profile", {method: "PUT", body: JSON.stringify({...emptyProfile, ...legacy, version: current.version})});} catch { /* Keep the server profile if an old device profile is unavailable. */ }} if (active) setProfile(current);}).catch(() => {}).finally(() => {if (active) setProfileLoaded(true);}); return () => {active = false;};}, []);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {if (!root.current?.contains(event.target as Node)) setOpen(false);}
    function escape(event: KeyboardEvent) {if (event.key === "Escape") {setOpen(false); trigger.current?.focus();}}
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape);};
  }, [open]);

  function edit() {setOpen(false); setEditing(true); setFieldsDirty(false); setMessage(""); imageRequest.current++; setLoadingImage(false); setImage(profile.image); dialog.current?.querySelector("form")?.reset(); dialog.current?.showModal();}
  useEffect(() => {
    function openProfile() {if (profileLoaded && !dialog.current?.open) edit();}
    window.addEventListener("falak:open-profile", openProfile);
    return () => window.removeEventListener("falak:open-profile", openProfile);
  });
  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++imageRequest.current;
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setLoadingImage(false); setMessage("Choose a JPG, PNG or WebP image smaller than 5 MB."); return;
    }
    setLoadingImage(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) {bitmap.close(); throw new Error("Image unavailable");}
      const size = Math.min(bitmap.width, bitmap.height);
      context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256);
      bitmap.close();
      if (request === imageRequest.current) setImage(canvas.toDataURL("image/png"));
    } catch {if (request === imageRequest.current) setMessage("This image could not be opened. Please choose another image.");}
    finally {if (request === imageRequest.current) setLoadingImage(false);}
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingImage || saving) return;
    const data = new FormData(event.currentTarget);
    const next = {name: String(data.get("name") || "").trim(), email: String(data.get("email") || "").trim(), phone: String(data.get("phone") || "").trim(), image, version: profile.version};
    if (!next.name) {setMessage("Please enter your name."); return;}
    setSaving(true);
    try {const saved = await api<typeof emptyProfile>("/api/profile", {method: "PUT", body: JSON.stringify(next)}); setProfile(saved); setFieldsDirty(false); setMessage(""); setEditing(false); dialog.current?.close(); try {localStorage.removeItem(storageKey);} catch { /* The server has saved the profile. */ }}
    catch (error) {setMessage(error instanceof Error ? error.message : "Your profile could not be saved. Please try again.");}
    finally {setSaving(false);}
  }

  return <div className="public-account" ref={root} onBlur={event => {if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}>
    <button className="public-account-trigger" disabled={!profileLoaded} type="button" ref={trigger} aria-label={profile.name ? `Profile: ${profile.name}` : "Open user profile"} aria-expanded={open} aria-controls={id} onClick={() => setOpen(current => !current)} onKeyDown={event => {if (event.key === "ArrowDown") {event.preventDefault(); setOpen(true); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".public-account-dropdown button")?.focus());}}}>
      <span className="public-account-avatar">{profile.image ? <Image src={profile.image} alt="" width={32} height={32} unoptimized/> : initials || <Icon name="user" size={19}/>}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && <div className="public-account-dropdown" id={id}>
      <div className="public-account-summary"><span className="public-account-avatar">{profile.image ? <Image src={profile.image} alt="" width={32} height={32} unoptimized/> : initials || <Icon name="user" size={20}/>}</span><div><strong>{profile.name || "Welcome to Falak Rides"}</strong><small>{profile.email || "Your journey, your way"}</small></div></div>
      <div className="public-account-options"><button type="button" onClick={edit}><Icon name="user" size={18}/><span>My profile</span><Icon size={14}/></button><Link href="/my-bookings" onClick={() => setOpen(false)}><Icon name="car" size={18}/><span>My bookings</span><Icon size={14}/></Link><Link href="/contact" onClick={() => setOpen(false)}><Icon name="chat" size={18}/><span>Help &amp; support</span><Icon size={14}/></Link></div>
    </div>}
    <dialog ref={dialog} className="public-profile-dialog" aria-labelledby={`${id}-title`} onClose={() => {setEditing(false); trigger.current?.focus();}} onCancel={event => {event.preventDefault(); closeProfile();}} onClick={event => {if (isDialogBackdropClick(event)) closeProfile();}}>
      <div className="public-profile-heading"><div><h2 id={`${id}-title`}>My profile</h2></div><button type="button" aria-label="Close profile" onClick={closeProfile}>×</button></div>
      <form key={value} onSubmit={save} onChange={event => {if (!(event.target instanceof HTMLInputElement) || event.target.type !== "file") {setMessage(""); const data = new FormData(event.currentTarget); setFieldsDirty(["name", "email", "phone"].some(key => String(data.get(key) || "") !== profile[key as "name" | "email" | "phone"]));}}}>
        <div className="public-profile-photo">
          <div className="public-profile-photo-wrap">
            <span className="public-account-avatar">{image ? <Image src={image} alt="Profile preview" width={96} height={96} unoptimized/> : initials || <Icon name="user" size={36}/>}</span>
            <button type="button" className="public-profile-camera" aria-label="Upload profile image" title="Change profile image" onClick={() => photoInput.current?.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5Z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={uploadImage} aria-label="Profile image"/>
          </div>
          {loadingImage && <small role="status">Preparing image...</small>}
        </div>
        <ProfileField id={`${id}-name`} label="Full name" name="name" required maxLength={80} autoComplete="name" placeholder="Your full name" defaultValue={profile.name} onClear={() => {setMessage(""); setFieldsDirty(true);}}/>
        <ProfileField id={`${id}-email`} label="Email" type="email" name="email" maxLength={120} autoComplete="email" placeholder="you@example.com" defaultValue={profile.email} onClear={() => {setMessage(""); setFieldsDirty(true);}}/>
        <ProfileField id={`${id}-phone`} label="Phone number" type="tel" name="phone" maxLength={25} autoComplete="tel" placeholder="+966 5X XXX XXXX" defaultValue={profile.phone} onClear={() => {setMessage(""); setFieldsDirty(true);}}/>
        {message && <p className="public-profile-message" role="status">{message}</p>}
        <div className="public-profile-actions"><button type="button" className="public-profile-cancel" onClick={closeProfile}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>Cancel</button><button type="submit" disabled={loadingImage || saving} className="public-profile-save">Save<Icon size={16}/></button></div>
      </form>
    </dialog>
  </div>;
}

function ProfileField({label, onClear, ...props}: React.InputHTMLAttributes<HTMLInputElement> & {label: string; onClear: () => void}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="public-profile-field">
    <label htmlFor={props.id}>{label}{!props.required && <small>Optional</small>}</label>
    <div className="public-profile-input-wrap">
      <input {...props} ref={input}/>
      <button type="button" className="public-profile-input-clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => {if (input.current) {input.current.value = ""; input.current.focus(); onClear();}}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
    </div>
  </div>;
}
