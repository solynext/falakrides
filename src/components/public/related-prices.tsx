"use client";

import Link from "next/link";
import {useSiteCatalog} from "@/features/content/public-content";
import PriceRouteCard from "./price-route-card";
import {SectionHeading} from "./sections";
import "./price-route-cards.css";
import "./price-route-list.css";
import "./related-prices.css";

export default function RelatedPrices({serviceId, serviceTitle}: {serviceId:string; serviceTitle:string}) {
  const {routes, vehicles} = useSiteCatalog();
  const related = serviceId ? routes.filter(route => route[9] === serviceId) : [];
  return <section className="taxi-related-prices" aria-label={`Related prices for ${serviceTitle}`}>
    <SectionHeading label={serviceTitle}>Related Prices</SectionHeading>
    {related.length ? <div className="taxi-price-list-grid">
      {related.map(route => <PriceRouteCard key={route[7]} route={route} vehicle={vehicles.find(vehicle => vehicle.id === route[6])}/>)}
    </div> : <div className="taxi-price-empty">
      <p>No prices are currently listed for this service. Contact us for a quote.</p>
      <Link className="taxi-button" href="/book-a-ride">Request a quote</Link>
    </div>}
  </section>;
}
