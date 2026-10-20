"use client";
import {useEffect, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useWebsite} from "@/features/content/public-content";
import {photo} from "@/utils/images";
import ContactPopup from "./contact-popup";
export default function PublicHero() {
  const {slides:allSlides,copy:c}=useWebsite();
  const slides=allSlides.filter(slide=>slide.visible);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => {
    if (hovered || focused || contactOpen || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActive(current => (current + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [hovered, focused, contactOpen, slides.length]);
  if (!slides.length) return null;
  const currentIndex=Math.min(active,slides.length-1);
  return <><section className="taxi-hero" aria-label="Falak Rides services" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}}>
    {slides.map((slide,index) => <div key={slide.id} className="taxi-slide" data-active={currentIndex === index} aria-hidden={currentIndex !== index}>{slide.image && <Image src={photo(slide.image)} alt="" fill preload={index === 0} loading={index === 0 ? undefined : "lazy"} sizes="100vw"/>}<div className="taxi-slide-shade"/><div className="taxi-slide-copy">{index === 0 ? <h1>Private Taxi Service in Makkah, Madinah &amp; Jeddah</h1> : <h2>{slide.title}</h2>}<p>{slide.text}</p><div className="taxi-hero-actions"><Link className="taxi-button" href="/book-a-ride" tabIndex={currentIndex === index ? 0 : -1}>{c.bookNow}</Link><button type="button" className="taxi-button taxi-hero-contact" aria-haspopup="dialog" onClick={() => setContactOpen(true)} tabIndex={currentIndex === index ? 0 : -1}>Contact Us</button></div></div></div>)}
  </section><ContactPopup open={contactOpen} onClose={() => setContactOpen(false)}/></>;
}
