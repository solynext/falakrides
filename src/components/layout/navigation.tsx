"use client";

import Link from "./header-link";
import {usePathname} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import "./reference-navigation.css";
import {useWebsite} from "@/features/content/public-content";

export default function Navigation() {
  const {services,vehicles,copy:c}=useWebsite();
  const items = [
    {label:c.navHome,href:"/"}, {label:c.navAbout,href:"/about"},
    {label:c.navServices,links:services.filter(item=>item.visible).map(item=>[item.title,`/services/${item.slug}`])},
    {label:c.navPackages,links:[[c.allPackages,"/packages"],...vehicles.filter(item=>item.visible).map(item=>[`${item.name} Packages`,`/packages/${item.slug}`])]},
    {label:c.navGallery,href:"/gallery"}, {label:c.navContact,href:"/contact"},
  ];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!shell.current?.contains(event.target as Node)) {setOpen(false); setDropdown(null);}
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (dropdown) {
        shell.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"][data-dropdown]')?.focus();
        setDropdown(null);
      } else if (open) {setOpen(false); trigger.current?.focus();}
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape);};
  }, [open, dropdown]);
  function close() {setOpen(false); setDropdown(null);}
  return <div className="reference-navigation" ref={shell}>
    <button ref={trigger} className={`reference-menu-toggle${open ? " app-x-button" : ""}`} aria-label={open ? "Close menu" : "Open menu"} type="button" aria-expanded={open} aria-controls="reference-main-navigation" onClick={() => setOpen(!open)}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{open ? <path d="m6 6 12 12M6 18 18 6"/> : <path d="M3 6h18M3 12h18M3 18h18"/>}</svg><span>{open ? "Close" : "Menu"}</span></button>
    <nav id="reference-main-navigation" className="reference-nav" data-open={open} aria-label="Main navigation">
      {items.map(item => item.links ? <div className="reference-nav-group" key={item.label} onPointerEnter={event => {if (event.pointerType === "mouse" && window.matchMedia("(min-width: 901px)").matches) setDropdown(item.label);}} onPointerLeave={event => {if (event.pointerType === "mouse" && window.matchMedia("(min-width: 901px)").matches && !event.currentTarget.contains(document.activeElement)) setDropdown(null);}} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setDropdown(null);}}>
        <span className="reference-mobile-group-label">{item.label}</span>
        <div className="reference-mobile-links">{item.links.map(([label, href]) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined} onClick={close}>{label}</Link>)}</div>
        <button data-dropdown type="button" className="reference-dropdown-toggle" data-active={item.links.some(([, href]) => pathname === href.split("#")[0])} aria-expanded={dropdown === item.label} aria-controls={`reference-${item.label.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setDropdown(dropdown === item.label ? null : item.label)}>{item.label}<svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="m2 4 4 4 4-4Z"/></svg></button>
        <div id={`reference-${item.label.toLowerCase().replaceAll(" ", "-")}`} className="reference-dropdown" hidden={dropdown !== item.label}>{item.links.map(([label, href]) => <Link href={href} key={label} aria-current={pathname === href ? "page" : undefined} onClick={close}>{label}</Link>)}</div>
      </div> : <Link href={item.href!} key={item.label} aria-current={pathname === item.href ? "page" : undefined} onClick={close}>{item.label}</Link>)}
      <Link href="/book-a-ride" className="reference-mobile-book" onClick={close}>{c.bookNow}</Link>
    </nav>
  </div>;
}
