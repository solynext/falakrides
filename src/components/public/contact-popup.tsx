"use client";

import {useEffect, useRef, useState} from "react";
import Icon from "@/components/ui/icon";
import {useSiteContact} from "@/features/content/public-content";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";
import SocialLinks from "./social-links";
import "./contact-popup.css";

export default function ContactPopup({open, onClose}: {open: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const {phone, email, whatsapp} = useSiteContact();
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  useUnsavedChanges(open && dirty, () => {form.current?.reset(); setDirty(false);});
  const close = () => {form.current?.reset(); setDirty(false); setStatus(""); dialog.current?.close();};

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
        <SocialLinks/>
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
