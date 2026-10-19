"use client";
import {useSiteContact} from "@/features/content/public-content";
import {ContentText} from "@/features/content/public-content";

import {useEffect, useRef, useState} from "react";

import WhatsAppIcon from "@/components/ui/whatsapp-icon";
import {useUnsavedChanges} from "@/components/forms/unsaved-changes";

function CloseIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>;
}

export default function WhatsAppChat() {
const {whatsapp} = useSiteContact();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  useUnsavedChanges(!!message.trim(), () => setMessage(""));
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(min-width: 601px)").matches) input.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const text = message.trim() || "Hello Falak Rides, I would like to plan a ride. Could you help me with availability and a quote in SAR?";

  return <div className="whatsapp-widget" ref={container}>
    {open && <section className="whatsapp-panel" id="whatsapp-chat" role="dialog" aria-labelledby="whatsapp-title" aria-describedby="whatsapp-description">
      <header className="whatsapp-panel-header">
        <span className="whatsapp-avatar"><WhatsAppIcon size={27}/></span>
        <div><h2 id="whatsapp-title"><ContentText id="whatsapp.1" fallback="Falak Rides"/></h2><p><ContentText id="whatsapp.2" fallback="Chat with us on WhatsApp"/></p></div>
        <button type="button" onClick={close} className="whatsapp-close app-x-button" aria-label="Close WhatsApp chat"><CloseIcon/></button>
      </header>
      <div className="whatsapp-panel-body">
        <div className="whatsapp-welcome"><strong><ContentText id="whatsapp.3" fallback="Let’s plan your journey."/></strong><p><ContentText id="whatsapp.4" fallback="Share your pickup, destination and travel date. Our team can help with your ride and a quote in SAR."/></p></div>
        <p id="whatsapp-description" className="whatsapp-disclaimer"><ContentText id="whatsapp.5" fallback="Continue to WhatsApp to send your message. This is not a live chat on this website."/></p>
        <label htmlFor="whatsapp-message"><ContentText id="whatsapp.6" fallback="Your message"/></label>
        <textarea id="whatsapp-message" ref={input} value={message} maxLength={1500} onChange={event => setMessage(event.target.value)} placeholder="Hello! I need a ride from..." rows={4}/>
        <a className="whatsapp-send" href={`${whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={21}/> <ContentText id="whatsapp.7" fallback=" Continue to WhatsApp "/><span aria-hidden="true">&#8599;</span></a>
        <small><ContentText id="whatsapp.8" fallback="+966 56 769 1683 · Availability confirmed by our team"/></small>
      </div>
    </section>}
    <button ref={trigger} className={`floating-chat whatsapp-trigger${open ? " app-x-button" : ""}`} type="button" aria-expanded={open} aria-controls={open ? "whatsapp-chat" : undefined} aria-label={open ? "Close WhatsApp chat" : "Open WhatsApp chat"} onClick={() => open ? close() : setOpen(true)}>{open ? <CloseIcon/> : <WhatsAppIcon size={29}/>}</button>
  </div>;
}
