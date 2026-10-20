"use client";

import Link from "next/link";
import {useEffect, useId, useRef, type PointerEvent} from "react";
import Icon from "@/components/ui/icon";
import {useSiteCatalog} from "@/features/content/public-content";
import PriceRouteCard from "./price-route-card";
import "./price-route-cards.css";

export default function PriceRouteCards({featuredOnly = true}: {featuredOnly?: boolean}) {
  const {routes: allRoutes, vehicles} = useSiteCatalog();
  const routes = featuredOnly ? allRoutes.filter(route => route[8] === "true") : allRoutes;
  const track = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const drag = useRef<{pointer: number; x: number; scroll: number; moved: boolean} | null>(null);
  const suppressClickUntil = useRef(0);
  const manualUntil = useRef(0);
  const carousel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (routes.length < 2) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      const container = carousel.current;
      if (!element || !container || document.hidden || Date.now() < manualUntil.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches || container.matches(":hover, :focus-within")) return;
      const bounds = container.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || element.scrollWidth <= element.clientWidth) return;
      const card = element.firstElementChild as HTMLElement | null;
      const distance = card ? card.offsetWidth + parseFloat(getComputedStyle(element).columnGap || "0") : element.clientWidth;
      if (element.scrollLeft + element.clientWidth >= element.scrollWidth - 2) element.scrollTo({left: 0, behavior: "smooth"});
      else element.scrollBy({left: distance, behavior: "smooth"});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [routes.length]);

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const card = element.firstElementChild as HTMLElement | null;
    const distance = card ? card.offsetWidth + parseFloat(getComputedStyle(element).columnGap || "0") : element.clientWidth;
    manualUntil.current = Date.now() + 8000;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (direction > 0 && element.scrollLeft + element.clientWidth >= element.scrollWidth - 2) element.scrollTo({left: 0, behavior});
    else if (direction < 0 && element.scrollLeft <= 2) element.scrollTo({left: element.scrollWidth - element.clientWidth, behavior});
    else element.scrollBy({left: direction * distance, behavior});
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    manualUntil.current = Date.now() + 8000;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = {pointer: event.pointerId, x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false};
  }

  function dragMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const distance = event.clientX - current.x;
    if (!current.moved && Math.abs(distance) < 5) return;
    current.moved = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.scrollLeft = current.scroll - distance;
    suppressClickUntil.current = Date.now() + 500;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    delete event.currentTarget.dataset.dragging;
    drag.current = null;
    manualUntil.current = Date.now() + 8000;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!routes.length) return <div className="taxi-price-empty"><p>{featuredOnly ? "No featured rides at the moment. Explore all routes to find your journey." : "No routes are currently available. Contact us to plan your journey."}</p><Link href={featuredOnly ? "/routes" : "/contact"} className="taxi-button">{featuredOnly ? "See all prices" : "Contact us"} <Icon size={16}/></Link></div>;

  return <section ref={carousel} className="taxi-price-carousel" aria-label="Prices and routes" aria-roledescription="carousel">
    <div className="taxi-price-grid" id={trackId} ref={track} onPointerDown={startDrag} onPointerMove={dragMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onDragStart={event => event.preventDefault()} onClickCapture={event => {if (Date.now() < suppressClickUntil.current) {event.preventDefault(); event.stopPropagation();}}} onWheel={() => {manualUntil.current = Date.now() + 8000;}} tabIndex={0} role="group" aria-label="Available rides" onKeyDown={event => {if (event.target !== event.currentTarget) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") {event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);}}}>{routes.map((route, index) => <PriceRouteCard key={route[7] || `${route[0]}:${route[1]}:${route[6]}`} route={route} vehicle={vehicles.find(vehicle => vehicle.id === route[6])} slide={`${index + 1} of ${routes.length}`}/>)}</div>
    {featuredOnly && <div className="taxi-price-see-all"><Link href="/routes">See all prices <Icon size={16}/></Link></div>}
  </section>;
}
