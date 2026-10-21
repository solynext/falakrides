"use client";
import {useEffect, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useWebsite} from "@/features/content/public-content";
import {photo} from "@/utils/images";
import ContactPopup from "./contact-popup";
export default function PublicHero() {
  const {slides:allSlides,copy:c}=useWebsite();
  const slides=allSlides.filter(slide=>slide.visible).map(slide=>{
    const text=slide.text.trim();
    return {...slide,text:text.match(/^[\s\S]*?[.!?\u061f\u3002](?=\s|$)/)?.[0] ?? text};
  });
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => {
    if (paused || hovered || focused || contactOpen || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActive(current => (current + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [paused, hovered, focused, contactOpen, slides.length]);
  if (!slides.length) return null;
  const currentIndex=Math.min(active,slides.length-1);
  return <><section className="taxi-hero" aria-label="Falak Rides services" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}}>
    {slides.map((slide,index) => <div key={slide.id} className="taxi-slide" data-active={currentIndex === index} aria-hidden={currentIndex !== index}>{slide.image && index === currentIndex && <Image src={photo(slide.image)} alt="" fill preload={index === 0} loading={index === 0 ? undefined : "lazy"} sizes="100vw"/>}<div className="taxi-slide-shade"/><div className="taxi-slide-copy">{index === 0 ? <h1>Umrah Taxi &amp; Airport Transfers in Makkah, Madinah &amp; Jeddah</h1> : <h2>{slide.title}</h2>}<p>{index === 0 ? "Request private airport transfers, Makkah to Madinah journeys and Ziyarat transport. Choose your route and vehicle, then confirm the fare and pickup details with our team." : slide.text}</p><div className="taxi-hero-actions"><Link className="taxi-button" href="/book-a-ride" tabIndex={currentIndex === index ? 0 : -1}>{c.bookNow}</Link><button type="button" className="taxi-button taxi-hero-contact" aria-haspopup="dialog" onClick={() => setContactOpen(true)} tabIndex={currentIndex === index ? 0 : -1}>Contact Us</button></div></div></div>)}
    <div className="taxi-slider-controls"><button type="button" className="taxi-slider-pause" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>{paused ? "Play" : "Pause"}</button>{slides.map((slide,index) => <button type="button" key={slide.id} className="taxi-slide-dot" aria-label={`Show ${slide.title}`} aria-pressed={currentIndex === index} onClick={() => {setActive(index);setPaused(true);}}/>)}</div>
  </section><ContactPopup open={contactOpen} onClose={() => setContactOpen(false)}/></>;
}
