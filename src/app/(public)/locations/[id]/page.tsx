import type {Metadata} from "next";
import {cache} from "react";
import Image from "next/image";
import Link from "next/link";
import {notFound,permanentRedirect} from "next/navigation";
import PublicPage from "@/components/layout/public-page";
import {SectionHeading} from "@/components/public/sections";
import RelatedPrices from "@/components/public/related-prices";
import {db} from "@/lib/db";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import {photo} from "@/utils/images";
import JsonLd from "@/components/seo/json-ld";
import {absoluteImageUrl,absoluteUrl,pageMetadata} from "@/lib/seo";

const duplicateJeddahAirportSlug="jeddah-airport-jed-b4dd7";
const canonicalJeddahAirportSlug="jeddah-airport";

const findLocation=cache(async(id:string)=>{
  if(id===duplicateJeddahAirportSlug)permanentRedirect(`/locations/${canonicalJeddahAirportSlug}`);
  const location=await db.location.findFirst({where:{OR:[{slug:id},{id}],status:"Active"}});
  if(!location)notFound();
  if(location.slug&&id!==location.slug)permanentRedirect(`/locations/${location.slug}`);
  return location;
});
type Props={params:Promise<{id:string}>};

function locationSeo(location:{slug:string;name:string;description:string}) {
  const name=location.name.trim();
  const normalized=name.toLowerCase();
  const description=`Private taxi and transfers in ${name}. Airport pickups, Umrah and Ziyarat rides. Request a quote on WhatsApp.`;
  if(normalized.includes("jeddah airport"))return {title:"Jeddah Airport to Makkah Taxi | Falak Rides",h1:"Jeddah Airport Private Taxi and Transfers",description,schemaName:"Jeddah Airport Taxi to Makkah",schemaDescription:"Arrange a private Jeddah Airport taxi to Makkah hotels, Madinah or Jeddah, with pickup details and vehicle requirements agreed in advance."};
  if(normalized.includes("madinah airport"))return {title:"Madinah Airport Transfers | Falak Rides",h1:"Madinah Airport to Hotel Transfers",description,schemaName:"Madinah Airport Taxi Transfers",schemaDescription:"Arrange a private Madinah Airport taxi transfer to Madinah hotels or onward to Makkah, with pickup time and vehicle requirements agreed in advance."};
  if(normalized==="makkah")return {title:"Makkah Taxi Service | Falak Rides",h1:"Private Taxi Service in Makkah",description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  if(normalized==="madinah")return {title:"Madinah Taxi Service | Falak Rides",h1:"Private Taxi Service in Madinah",description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  if(normalized==="jeddah")return {title:"Jeddah Taxi Service | Falak Rides",h1:"Private Taxi Service in Jeddah",description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  if(normalized.includes("makkah ziyarat"))return {title:"Makkah Ziyarat Taxi | Falak Rides",h1:"Private Makkah Ziyarat Taxi",description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  if(normalized.includes("madinah ziyarat"))return {title:"Madinah Ziyarat Taxi | Falak Rides",h1:"Private Madinah Ziyarat Taxi",description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  const matchesNamedLocation=/\b(taif|miqat|jeddah tours?|kiswa factory|hotel)\b/i.test(name);
  if(matchesNamedLocation)return {title:`${name} Taxi and Transfers | Falak Rides`,h1:`Private Taxi to ${name}`,description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
  return {title:`${location.name} Private Taxi | Falak Rides`,h1:location.name,description:location.description,schemaName:`${location.name} Private Taxi`,schemaDescription:location.description};
}

export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {id}=await params;
  const location=await findLocation(id);
  const seo=locationSeo(location);
  return pageMetadata({...seo,path:`/locations/${location.slug}`,image:location.image||"/images/header-background.jpg"});
}

export default async function LocationPage({params}:Props) {
  const {id}=await params;
  const [location,{published}]=await Promise.all([findLocation(id),readContent()]);
  const {services,copy}=websiteFromValues(published);
  const related=services.filter(service=>service.visible&&location.serviceIds.includes(service.id));
  const destinations=location.destinations.split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  const seo=locationSeo(location);
  return <><JsonLd data={{"@context":"https://schema.org","@type":"Service","@id":absoluteUrl(`/locations/${location.slug}#service`),url:absoluteUrl(`/locations/${location.slug}`),name:seo.schemaName,description:seo.schemaDescription,image:absoluteImageUrl(location.image||"/images/header-background.jpg"),provider:{"@id":absoluteUrl("/#organization")},areaServed:location.name}}/><PublicPage title={seo.h1} description="Private transportation to and from this location.">
    <div className="taxi-detail-split"><div>{location.image&&<Image src={photo(location.image)} alt={location.name} fill priority sizes="(max-width: 760px) 90vw, 45vw"/>}</div><div>
      <span className="taxi-eyebrow">Our Locations</span><h2>{location.name}</h2><p style={{whiteSpace:"pre-line"}}>{location.description}</p>
      <Link className="taxi-button" href={`/book-a-ride?pickup=${encodeURIComponent(location.name)}`}>{copy.bookNow}</Link>
    </div></div>
    <RelatedPrices serviceTitle={location.name} locationName={location.name}/>
    {location.name.trim().toLowerCase()==="makkah"&&<section className="seo-content" aria-labelledby="makkah-taxi-heading"><h2 id="makkah-taxi-heading">Private taxi in Makkah</h2><p>Share your Makkah pickup and destination, travel date, passenger count and luggage when requesting a private city ride. For journeys beyond the city, ask the team to confirm the route, vehicle preference and total fare in SAR.</p><ul className="seo-related-links"><li><Link href="/services/city-wise-services">Makkah city and intercity taxi services</Link></li><li><Link href="/umrah-taxi-prices">Published Umrah taxi prices and quote guidance</Link></li><li><Link href="/makkah-to-madinah-taxi">Makkah to Madinah private taxi</Link></li><li><Link href="/book-a-ride?pickup=Makkah">Request a private taxi in Makkah</Link></li></ul></section>}
    {!!related.length&&<section aria-labelledby="related-services-title"><SectionHeading label={location.name}><span id="related-services-title">Related Service</span></SectionHeading><div className="taxi-service-grid">{related.map(service=><Link className="taxi-service-card" href={`/services/${service.slug}`} key={service.id}><div>{service.image&&<Image src={photo(service.image)} alt={service.title} fill sizes="(max-width: 700px) 90vw, 30vw"/>}</div><h3>{service.title}</h3><span>{copy.learnMore} →</span></Link>)}</div></section>}
    {!!destinations.length&&<div className="taxi-detail-grid"><article><h2>Supported destinations</h2><ul>{destinations.map((destination,index)=><li key={index}>{destination}</li>)}</ul></article></div>}
    <div className="taxi-subheading"><Link className="taxi-text-link" href="/#locations">← Explore more locations</Link></div>
  </PublicPage></>;
}
