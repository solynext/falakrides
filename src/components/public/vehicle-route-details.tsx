"use client";

import Link from "next/link";
import {useSiteCatalog} from "@/features/content/public-content";
import PriceRouteCard from "./price-route-card";
import {SectionHeading, VehicleCards} from "./sections";
import "./price-route-cards.css";
import "./price-route-list.css";
import "./related-prices.css";

export default function VehicleRouteDetails({vehicleName}: {vehicleName: string}) {
  const {routes, vehicles} = useSiteCatalog();
  const matchingRoutes = routes.filter(route =>
    vehicles.find(vehicle => vehicle.id === route[6])?.name.toLowerCase() === vehicleName.toLowerCase()
  );

  return <>
    <section className="taxi-related-prices" aria-label={`${vehicleName} details`}>
      <SectionHeading label="Vehicle">Details</SectionHeading>
      {matchingRoutes.length ? <div className="taxi-price-list-grid taxi-vehicle-route-grid">
        {matchingRoutes.map(route => <PriceRouteCard key={route[7] || `${route[0]}:${route[1]}:${route[6]}`} route={route} vehicle={vehicles.find(vehicle => vehicle.id === route[6])}/>) }
      </div> : <div className="taxi-price-empty">
        <p>No route details are listed for {vehicleName} yet. Contact us to discuss your journey.</p>
        <Link className="taxi-button" href="/contact">Contact us</Link>
      </div>}
    </section>
    <section className="taxi-container taxi-all-vehicles" aria-label="All vehicles">
      <SectionHeading label="Browse Fleet">All Cars</SectionHeading>
      <VehicleCards showNote={false}/>
    </section>
  </>;
}
