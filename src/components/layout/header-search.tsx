"use client";

import {useId, useRef, useState} from "react";
import {useWebsite} from "@/features/content/public-content";
import Link from "./header-link";
import "./header-search.css";

export default function HeaderSearch() {
  const {copy: c, services, vehicles, faqs} = useWebsite();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const id = useId();
  const pages = [
    {title:c.navHome,href:"/",text:"Home"},
    {title:c.navAbout,href:"/about",text:c.aboutDescription},
    {title:c.navServices,href:"/services",text:c.servicesPageDescription},
    {title:c.navPackages,href:"/packages",text:c.packagesDescription},
    {title:c.vehiclesTitle,href:"/vehicles",text:c.vehiclesDescription},
    {title:c.navContact,href:"/contact",text:c.contactDescription},
    {title:c.faqPageTitle,href:"/faq",text:faqs.filter(item=>item.visible).map(item=>`${item.question} ${item.answer}`).join(" ")},
    {title:c.bookNow,href:"/book-a-ride",text:"Book a ride transport reservation"},
    {title:"My Bookings",href:"/my-bookings",text:"Booking history"},
    {title:"Routes",href:"/routes",text:"Destinations Makkah Madinah Jeddah"},
    {title:"Offers",href:"/offers",text:"Special offers"},
    {title:"Policies",href:"/policies",text:"Booking policies"},
    {title:"Privacy Policy",href:"/privacy",text:"Privacy"},
    {title:"Terms and Conditions",href:"/terms",text:"Terms"},
    ...services.filter(item=>item.visible).map(item=>({title:item.title,href:`/services/${item.slug}`,text:`${item.heading} ${item.intro} ${item.sections.map(section=>`${section.title} ${section.text} ${section.items.join(" ")}`).join(" ")}`})),
    ...vehicles.filter(item=>item.visible).map(item=>({title:`${item.name} Packages`,href:`/packages/${item.slug}`,text:`${item.category} ${item.description}`})),
  ];
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches=terms.length?pages.filter(page=>terms.every(term=>`${page.title} ${page.text}`.toLowerCase().includes(term))):[];
  const shown=open&&terms.length>0;
  return <div className="header-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setMobileOpen(false);}}} onKeyDown={event=>{
    if(event.key==="Escape"){setOpen(false);if(window.matchMedia("(max-width: 900px)").matches){setMobileOpen(false);mobileTrigger.current?.focus();}else input.current?.focus();}
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){
      const links=Array.from(results.current?.querySelectorAll<HTMLAnchorElement>("a")??[]);
      if(!links.length)return;
      event.preventDefault();
      const index=links.indexOf(document.activeElement as HTMLAnchorElement);
      if(event.key==="ArrowUp"&&index<=0)input.current?.focus();
      else links[event.key==="ArrowDown"?Math.min(index+1,links.length-1):index-1]?.focus();
    }
  }}>
    <button type="button" ref={mobileTrigger} className={`header-search-mobile-toggle${mobileOpen ? " app-x-button" : ""}`} aria-label={mobileOpen ? "Close search" : "Search website"} aria-expanded={mobileOpen} aria-controls={id + "-panel"} onClick={()=>{setMobileOpen(!mobileOpen);if(!mobileOpen)requestAnimationFrame(()=>input.current?.focus());}}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{mobileOpen ? <path d="m6 6 12 12M6 18 18 6"/> : <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>}</svg></button>
    <div id={id + "-panel"} className="header-search-panel" data-mobile-open={mobileOpen}>
    <form role="search" aria-label="Search website" onSubmit={event=>{event.preventDefault();setOpen(true);results.current?.querySelector<HTMLAnchorElement>("a")?.focus();}}>
      <input ref={input} type="search" aria-label="Search website" placeholder="Search website…" value={query} maxLength={120} aria-controls={id} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}}/>
      <button type="submit" aria-label="Search" aria-expanded={shown} aria-controls={id}>Search</button>
    </form>
    <div id={id} ref={results} className="header-search-results" hidden={!shown}>
      <p role="status">{matches.length?`${matches.length} results`:"No results. Try a page, service or vehicle name."}</p>
      {matches.map(page=><Link href={page.href} key={page.href} onClick={()=>{setOpen(false);setMobileOpen(false);setQuery("");}}>{page.title}<span aria-hidden="true">↗</span></Link>)}
    </div>
    </div>
  </div>;
}
