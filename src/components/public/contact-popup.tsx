"use client";

import {useEffect, useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import {useContentValue, useSiteContact} from "@/features/content/public-content";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import "./contact-popup.css";

export default function ContactPopup({open, onClose}: {open: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const {phone, email, whatsapp} = useSiteContact();
  const facebook = useContentValue("contact.facebook", "");
  const instagram = useContentValue("contact.instagram", "");
  const linkedin = useContentValue("contact.linkedin", "");
  const tiktok = useContentValue("contact.tiktok", "");
  const youtube = useContentValue("contact.youtube", "");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const confirmClose = useUnsavedChanges(open && dirty, () => {form.current?.reset(); setDirty(false);});
  const close = () => confirmClose(() => dialog.current?.close());

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({preventScroll: true});
    };
  }, [open]);

  function socialLink(label: string, url: string, domain: string) {
    let valid = false;
    try {const parsed = new URL(url); valid = parsed.protocol === "https:" && (parsed.hostname === domain || parsed.hostname.endsWith("." + domain));} catch { /* Profile is not configured yet. */ }
    const network = label.toLowerCase();
    const icons: Record<string, React.ReactNode> = {
      facebook: <path fill="currentColor" d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.4A23 23 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9Z"/>,
      instagram: <g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></g>,
      linkedin: <g fill="currentColor"><circle cx="5" cy="5" r="2"/><path d="M3 9h4v12H3zm7 0h4v1.6c.8-1.2 1.9-1.9 3.5-1.9 3 0 3.5 2 3.5 5V21h-4v-6.5c0-1.5-.3-2.3-1.4-2.3-1.2 0-1.6.9-1.6 2.3V21h-4Z"/></g>,
      tiktok: <path fill="currentColor" d="M14 2h3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.7V16a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3Z"/>,
      youtube: <><path fill="currentColor" d="M21.6 6.2c-.2-.9-.9-1.6-1.8-1.8C18.2 4 12 4 12 4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 7.8 2 12 2 12s0 4.2.4 5.8c.2.9.9 1.6 1.8 1.8C5.8 20 12 20 12 20s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8C22 16.2 22 12 22 12s0-4.2-.4-5.8Z"/><path fill="#e71923" d="m10 8 6 4-6 4Z"/></>,
    };
    const content = <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">{icons[network]}</svg>;
    return valid ? <a className={`contact-social-button contact-social-${network}`} href={url} target="_blank" rel="noopener noreferrer" title={`${label} (opens in a new tab)`} aria-label={`${label} (opens in a new tab)`}>{content}</a> : null;
  }

  return <dialog ref={dialog} className="contact-popup" aria-labelledby="contact-popup-title" aria-describedby="contact-popup-description" onClose={onClose} onCancel={event => {event.preventDefault(); close();}} onClick={event => {if (event.target === event.currentTarget) {const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();}}}>
    <button type="button" className="contact-popup-close app-x-button" aria-label="Close contact popup" onClick={close} autoFocus><span aria-hidden="true">&times;</span></button>
    <div className="contact-popup-layout">
      <aside className="contact-popup-details">
        <span className="contact-popup-eyebrow">LET&apos;S TALK TRAVEL</span>
        <h2 id="contact-popup-title">Your journey.<br/>Our personal care.</h2>
        <p id="contact-popup-description">Have a question or a ride in mind? Get in touch with Falak Rides.</p>
        <a className="contact-popup-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={23}/>Chat on WhatsApp<Icon size={18}/></a>
        <a className="contact-popup-contact" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Icon name="user" size={20}/><span><small>CALL US</small>{phone}</span></a>
        <a className="contact-popup-contact" href={`mailto:${email}`}><Icon name="mail" size={20}/><span><small>EMAIL US</small>{email}</span></a>
        <div className="contact-popup-social"><span>Stay connected</span><nav aria-label="Social media">{socialLink("Facebook", facebook, "facebook.com")}{socialLink("Instagram", instagram, "instagram.com")}{socialLink("LinkedIn", linkedin, "linkedin.com")}{socialLink("TikTok", tiktok, "tiktok.com")}{socialLink("YouTube", youtube, "youtube.com")}</nav></div>
      </aside>
      <section className="contact-popup-form-panel" aria-labelledby="contact-popup-form-title">
        <span className="contact-popup-eyebrow">CONTACT US</span>
        <h3 id="contact-popup-form-title">How can we help?</h3>
        <p>Share a few details and let&apos;s plan your next journey.</p>
        <form ref={form} onChange={() => {setDirty(true); setStatus("");}} onSubmit={event => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const name = String(fields.get("name") || "").trim();
          const customerPhone = String(fields.get("phone") || "").trim();
          const message = String(fields.get("message") || "").trim();
          if (!name || !message) {setStatus("Please enter your name and a message."); return;}
          if (customerPhone.replace(/\D/g, "").length < 8) {setStatus("Please enter a valid phone number, including country code."); return;}
          setDirty(false);
          setStatus("Your email is ready. Send it from your email app to contact our team.");
          window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Travel inquiry from ${name}`)}&body=${encodeURIComponent(`${message}\n\nName: ${name}\nContact number: ${customerPhone}`)}`;
        }}>
          <div className="contact-popup-fields">
            <label>Your name<input name="name" required maxLength={80} autoComplete="name" placeholder="Full name"/></label>
            <label>Phone number<input name="phone" type="tel" required maxLength={25} autoComplete="tel" placeholder="+966 5X XXX XXXX"/></label>
          </div>
          <label className="contact-popup-message">Your message<textarea name="message" required maxLength={1500} rows={5} placeholder="Tell us about your travel plans or ask a question."/></label>
          <p className="contact-popup-note">Opens your email app. Send the email there to complete your inquiry.</p>
          {status && <p className="contact-popup-status" role="status">{status}</p>}
          <button className="taxi-button" type="submit">Submit<Icon size={19}/></button>
        </form>
      </section>
    </div>
  </dialog>;
}
