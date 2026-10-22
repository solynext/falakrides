"use client";

import Link from "next/link";
import {useSiteCatalog} from "@/features/content/public-content";
import PriceRouteCard from "./price-route-card";
import {SectionHeading} from "./sections";
import "./price-route-cards.css";
import "./price-route-list.css";
import "./related-prices.css";

export default function RelatedPrices({serviceId, serviceTitle, locationName}: {serviceId?:string; serviceTitle:string; locationName?:string}) {
  const {routes, vehicles} = useSiteCatalog();
  const normalizedLocation = locationName?.trim().toLowerCase();
  const related = normalizedLocation
    ? routes.filter(route => [route[0], route[1]].some(place => place?.toLowerCase().includes(normalizedLocation)))
    : serviceId ? routes.filter(route => route[9] === serviceId) : [];
  return <section className="taxi-related-prices" aria-label={`Related prices for ${serviceTitle}`}>
    <SectionHeading label={serviceTitle}>Related Prices</SectionHeading>
    {related.length ? <div className="taxi-price-list-grid">
      {related.map(route => <PriceRouteCard key={route[7]} route={route} vehicle={vehicles.find(vehicle => vehicle.id === route[6])}/>)}
    </div> : <div className="taxi-price-empty">
      <p>{locationName ? `No route prices are currently listed for ${locationName}. Contact us for a quote.` : "No prices are currently listed for this service. Contact us for a quote."}</p>
      <Link className="taxi-button" href="/book-a-ride">Request a quote</Link>
    </div>}
  </section>;
}
