"use client";

import {isDialogBackdropClick} from "@/lib/dialog-events";

import {useEffect, useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import {api} from "@/lib/api-client";
import type {WebsiteAvailability} from "@/features/content/website-availability";

export default function DeveloperMode({onClose}: {onClose: () => void}) {
  const [status, setStatus] = useState<WebsiteAvailability | null>(null);
  const [image, setImage] = useState("");
  const [audio, setAudio] = useState("");
  const [uploading, setUploading] = useState<"image" | "audio" | null>(null);
  const [pin, setPin] = useState("");
  const unlockedPin = useRef("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pinInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const popup = dialog.current;
    if (!status) {popup?.showModal(); pinInput.current?.focus();}
    return () => {popup?.close();};
  }, [status]);
  useEffect(() => () => {unlockedPin.current = "";}, []);

  async function unlock(value: string) {
    if (pending.current || value.length !== 5) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await api<WebsiteAvailability>("/api/admin/developer-mode", {headers: {"x-developer-pin": value}});
      unlockedPin.current = value; setStatus(result); setImage(result.image || ""); setAudio(result.audio || ""); setPin("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to unlock Developer mode.");
      setPin(""); requestAnimationFrame(() => pinInput.current?.focus());
    } finally {pending.current = false; setBusy(false);}
  }

  async function saveAvailability(values: Pick<WebsiteAvailability, "paused" | "messageEnabled" | "image" | "audio">) {
    if (!status || busy || uploading || pending.current) return;

    pending.current = true; setBusy(true); setError("");
    try {
      const result = await api<WebsiteAvailability>("/api/admin/developer-mode", {method: "PUT", headers: {"x-developer-pin": unlockedPin.current}, body: JSON.stringify({...values, version: status.version})});
      setStatus(result); setImage(result.image); setAudio(result.audio);

    } catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to change website status.");}
    finally {pending.current = false; setBusy(false);}
  }

  async function uploadMedia(file: File | undefined, kind: "image" | "audio") {
    if (!file || busy || uploading || pending.current) return;
    const max = kind === "image" ? 8 : 20;
    if (file.size > max * 1024 * 1024) {setError(`Choose a file smaller than ${max} MB.`); return;}
    pending.current = true; setUploading(kind); setError("");
    try {
      const response = await fetch(`/api/admin/developer-mode/media?kind=${kind}`, {method: "POST", headers: {"Content-Type": file.type || "application/octet-stream", "x-developer-pin": unlockedPin.current}, body: file});
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Upload failed.");
      if (kind === "image") setImage(result.url); else setAudio(result.url);
    } catch (reason) {setError(reason instanceof Error ? reason.message : "Unable to upload file.");}
    finally {pending.current = false; setUploading(null);}
  }

  if (!status) return <dialog ref={dialog} className="cms-developer-pin-dialog" aria-labelledby="developer-pin-title" onCancel={event => {event.preventDefault(); onClose();}} onClick={event => {if (isDialogBackdropClick(event)) onClose();}}>
    <button type="button" className="cms-developer-pin-close" aria-label="Close PIN popup" onClick={onClose}>&times;</button>
    <span className="cms-developer-lock-icon"><Icon name="lock" size={27}/></span>
    <h2 id="developer-pin-title">Developer mode</h2>
    <p>Enter your 5-digit PIN to continue.</p>
    <form onSubmit={event => {event.preventDefault(); void unlock(pin);}}>
      <label className="adm-sr-only" htmlFor="developer-pin">5-digit PIN</label>
      <input ref={pinInput} id="developer-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{5}" maxLength={5} aria-describedby="developer-pin-message" aria-invalid={!!error} readOnly={busy} value={pin} onChange={event => {const value = event.target.value.replace(/\D/g, "").slice(0, 5); setPin(value); if (value.length === 5) void unlock(value);}}/>
      <p id="developer-pin-message" role={error ? "alert" : "status"}>{error || (busy ? "Checking PIN..." : "Opens automatically after entering all 5 digits.")}</p>
    </form>
  </dialog>;

  return <section className="cms-developer-mode" aria-labelledby="developer-mode-title" aria-busy={busy}>
    <div className="cms-developer-heading"><span className="cms-developer-icon"><Icon name="shield" size={23}/></span><div><h2 id="developer-mode-title">Developer mode</h2><p>Control public website availability.</p></div></div>
    {error && <p className="adm-cms-error" role="alert">{error}</p>}

      <div className="cms-developer-option">
        <div><h3 id="website-pause-label">Pause website</h3><p id="website-pause-description">When enabled, all public pages show a 404 error. Turn it off to reopen the website.</p><span className={`adm-badge ${status.paused ? "amber" : "green"}`}>{status.paused ? "Website paused" : status.messageEnabled ? "Background media active" : "Website live"}</span></div>
        <button type="button" className="cms-developer-switch" role="switch" aria-checked={status.paused} aria-labelledby="website-pause-label" aria-describedby="website-pause-description" disabled={busy || !!uploading} onClick={() => {void saveAvailability({paused: !status.paused, messageEnabled: false, image: status.image, audio: status.audio});}}><span/></button>
      </div>
      <div className="cms-developer-option cms-developer-message-option">
        <div className="cms-developer-message-body">
          <h3 id="website-message-label">Background image &amp; sound</h3>
          <p id="website-message-description">Display a full-screen image with looping MP3 audio.</p>
          <label htmlFor="website-background-image">Background image<input id="website-background-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={busy || !!uploading} onChange={event => {void uploadMedia(event.target.files?.[0], "image"); event.target.value = "";}}/></label>
          {image && <div className="cms-pause-media-preview"><div style={{backgroundImage: `url(${JSON.stringify(image)})`}} role="img" aria-label="Selected background image"/><button type="button" className="adm-button secondary" disabled={busy || !!uploading} onClick={() => setImage("")}>Remove image</button></div>}
          <label htmlFor="website-background-audio">MP3 sound<input id="website-background-audio" type="file" accept="audio/mpeg,.mp3" disabled={busy || !!uploading} onChange={event => {void uploadMedia(event.target.files?.[0], "audio"); event.target.value = "";}}/></label>
          {audio && <div className="cms-pause-audio-preview"><audio src={audio} controls preload="metadata"/><button type="button" className="adm-button secondary" disabled={busy || !!uploading} onClick={() => setAudio("")}>Remove audio</button></div>}
          {uploading && <p role="status">Uploading {uploading}...</p>}
          {status.messageEnabled && (image !== status.image || audio !== status.audio) && <button type="button" className="adm-button" disabled={busy || !!uploading || !image} onClick={() => {void saveAvailability({paused: false, messageEnabled: true, image, audio});}}>Save media</button>}
        </div>
        <button type="button" className="cms-developer-switch" role="switch" aria-checked={status.messageEnabled} aria-labelledby="website-message-label" aria-describedby="website-message-description" disabled={busy || !!uploading || (!status.messageEnabled && !image)} onClick={() => {void saveAvailability({paused: false, messageEnabled: !status.messageEnabled, image, audio});}}><span/></button>
      </div>
  </section>;
}
