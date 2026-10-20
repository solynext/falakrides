"use client";

import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/ui/icon";
import {useSiteCatalog} from "@/features/content/public-content";
import {photo} from "@/utils/images";
import "./price-route-cards.css";

export default function PriceRouteCards() {
  const {routes, fares = [], vehicles} = useSiteCatalog();

  return <div className="taxi-price-grid">{routes.map(([from, to, caption, routeImage, fare, maxFare]) => {
    const route = fares.find(item => item.route === `${from} → ${to}`);
    const vehicle = route?.vehicleId ? vehicles.find(item => item.id === route.vehicleId) : undefined;
    const image = vehicle?.image || routeImage;
    const hasFare = fare !== "" && fare !== undefined && Number.isFinite(Number(fare));
    const formatPrice = (value: string) => Number(value).toLocaleString("en-US", {maximumFractionDigits: 2});
    const price = hasFare ? `${formatPrice(fare)}${maxFare && Number(maxFare) > Number(fare) ? ` – ${formatPrice(maxFare)}` : ""}` : "Request a quote";

    return <article className="taxi-price-card" key={`${from}→${to}`}>
      <div className={`taxi-price-photo${vehicle?.image ? " taxi-price-photo-vehicle" : ""}`}>
        {image ? <Image src={photo(image, 800)} alt={vehicle?.image ? `${vehicle.name} for ${from} to ${to}` : `${from} to ${to}`} fill sizes="(max-width: 760px) 90vw, (max-width: 1000px) 45vw, 30vw"/> : <Icon name="car" size={64}/>}
        <span className="taxi-price-badge"><Icon name="car" size={15}/>{vehicle?.name || "Family SUV"}</span>
      </div>
      <div className="taxi-price-body">
        <h3 className="taxi-price-route"><span className="taxi-price-place"><Icon name="pin" size={17}/><span>{from}</span></span><span className="taxi-price-route-arrow"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="to"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></span><span className="taxi-price-place"><Icon name="pin" size={17}/><span>{to}</span></span></h3>
        {caption && caption.trim().toLowerCase() !== "travel at your own pace" && <p className="taxi-price-caption">{caption}</p>}
        {vehicle && <div className="taxi-price-specs"><span><Icon name="user" size={16}/>{vehicle.passengers} passengers</span><span><Icon name="bag" size={16}/>{vehicle.bags} bags</span></div>}
        <div className="taxi-price-bottom"><div><small>{hasFare ? "Journey fare" : "Your journey, your quote"}</small><strong className={hasFare ? "taxi-price-amount" : "taxi-price-quote"}>{hasFare && <span className="taxi-price-currency">SAR</span>}{price}</strong></div><Link className="taxi-button" href="/book-a-ride" aria-label={`Book ${from} to ${to}${vehicle ? ` with ${vehicle.name}` : ""}`}>Book Now <Icon size={16}/></Link></div>
      </div>
    </article>;
  })}</div>;
}
