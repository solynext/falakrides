"use client";

import {useEffect, useRef, useState} from "react";
import BrandLogo from "@/components/ui/brand-logo";
import Icon from "@/components/ui/icon";
import Booking from "./booking";
import "./booking-popup.css";

type Preference = {vehicle?: string; package?: string; pickup?:string};
export default function BookingPopup() {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<Preference>({});
  function close() {setOpen(false); dialog.current?.close();}
  useEffect(() => {
    function show(preference: Preference, source: HTMLElement | null) {
      if (dialog.current?.open) return;
      trigger.current = source;
      setPreference(preference); setOpen(true); dialog.current?.showModal();
      requestAnimationFrame(() => heading.current?.focus({preventScroll: true}));
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const url = new URL(target.href, location.href);
      if (url.origin !== location.origin || url.pathname.replace(/\/$/, "") !== "/book-a-ride") return;
      event.preventDefault();
      show({pickup:url.searchParams.get("pickup")?.slice(0,150),vehicle: url.searchParams.get("vehicle")?.slice(0, 100), package: url.searchParams.get("package")?.slice(0, 100)}, target);
    }
    function vehicle(event: Event) {const value = (event as CustomEvent<string>).detail; if (typeof value === "string") show({vehicle: value.slice(0, 100)}, document.activeElement as HTMLElement);}
    document.addEventListener("click", click, true);
    window.addEventListener("falak:book-vehicle", vehicle);
    return () => {document.removeEventListener("click", click, true); window.removeEventListener("falak:book-vehicle", vehicle);};
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {document.body.style.overflow = previous; trigger.current?.focus({preventScroll: true});};
  }, [open]);
  return <dialog ref={dialog} className="ride-dialog" aria-labelledby="ride-title" onClose={() => setOpen(false)} onCancel={event => {event.preventDefault(); close();}} onClick={event => {if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();}}>
    <header className="ride-top"><BrandLogo size={34}/><span className="ride-assurance"><Icon name="shield" size={15}/>Your own private ride</span><button type="button" className="ride-close app-x-button" aria-label="Close booking popup" onClick={close}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
    <div className="ride-heading"><div><span>LET&apos;S PLAN YOUR JOURNEY</span><h2 id="ride-title" ref={heading} tabIndex={-1}>Book your ride.</h2><p>Airport pickups, Umrah journeys and private transfers, made personal.</p></div><span className="ride-timezone"><Icon name="clock" size={15}/>Saudi Arabia &middot; GMT+3</span></div>
    {open && <Booking preference={preference}/>}
  </dialog>;
}
