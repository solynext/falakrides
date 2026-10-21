"use client";
import LocationCardImage from "./location-card-image";
import Link from "next/link";
import {useSiteCatalog,useWebsite} from "@/features/content/public-content";
import {SectionHeading} from "./sections";
import "./location-cards.css";
import {publicPath} from "@/lib/seo";

export default function LocationCards({serviceId,carousel=true}:{serviceId?:string;serviceTitle?:string;carousel?:boolean}={}) {
  const {locationCards:allLocations=[]}=useSiteCatalog();
  const locationCards=serviceId?allLocations.filter(location=>location.serviceIds.includes(serviceId)):allLocations;
  const {copy}=useWebsite();
  if(!locationCards.length)return null;
  const repeats=carousel?Math.max(1,Math.ceil(6/locationCards.length)):1;
  return <section className={`taxi-locations-section ${serviceId&&!carousel?"taxi-locations-compact":""}`} id={serviceId?undefined:"locations"} aria-label={serviceId?"Related Locations":"Our locations"}><div className="taxi-container">
    {serviceId?<h2 className="taxi-related-locations-heading">Related Locations</h2>:<SectionHeading label="Our Locations"><em>Where Would You</em> Like to Go?</SectionHeading>}
    <div className={`taxi-location-marquee ${carousel?"":"is-static"}`}><div className="taxi-location-track">
      {(carousel?[0,1]:[0]).map(group=><div className={`taxi-location-group ${group?"is-copy":""}`} key={group} aria-hidden={group?true:undefined}>
        {Array.from({length:repeats},(_,repeat)=>locationCards.map(location=><article className={`taxi-location-card ${repeat?"is-repeat":""}`} key={`${repeat}-${location.id}`} aria-hidden={repeat?true:undefined}>
          <Link className="taxi-location-detail-link" href={publicPath(`/locations/${encodeURIComponent(location.slug)}`)} aria-label={`View ${location.name}`} tabIndex={group||repeat?-1:undefined}/>
          <LocationCardImage name={location.name} image={location.image}/>
          <div className="taxi-location-body"><h3>{location.name}</h3><Link className="taxi-button taxi-location-book" href={`/book-a-ride?pickup=${encodeURIComponent(location.name)}`} tabIndex={group||repeat?-1:undefined}><span>{copy.bookNow}</span><span className="taxi-location-book-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></Link></div>
        </article>))}
      </div>)}
    </div></div>
  </div></section>;
}
