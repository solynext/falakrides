import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import RelatedLocations from "@/components/public/related-locations";
import PublicPage from "@/components/layout/public-page";
import {FaqSection,SectionHeading,VehicleCards} from "@/components/public/sections";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import {photo} from "@/utils/images";
import JsonLd from "@/components/seo/json-ld";
import {absoluteImageUrl,absoluteUrl,pageMetadata} from "@/lib/seo";

function serviceSeo(slug:string,title:string,intro:string){
  if(slug==="airport-transfers")return {title:"Jeddah & Madinah Airport Transfers | Falak Rides",description:"Arrange private Jeddah airport transfers or Madinah airport transfers to hotels in Makkah, Madinah and Jeddah."};
  if(slug==="city-wise-services")return {title:"Makkah, Madinah & Jeddah Taxi Services | Falak Rides",description:"Arrange private taxi services for city travel in Makkah, Madinah and Jeddah, with pickup and destination details agreed in advance."};
  if(slug==="ziyarat-taxi-services")return {title:"Makkah & Madinah Ziyarat Taxi | Falak Rides",description:"Arrange a private Makkah Ziyarat taxi or Madinah Ziyarat taxi for the listed religious and historical destinations."};
  return {title:`${title} | Falak Rides`,description:intro};
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const {published}=await readContent();const service=websiteFromValues(published).services.find(item=>item.slug===slug&&item.visible);if(!service)return pageMetadata({title:"Service | Falak Rides",description:"Private transportation services from Falak Rides.",path:`/services/${slug}`});const seo=serviceSeo(slug,service.title,service.intro);return pageMetadata({...seo,path:`/services/${slug}`,image:service.image||"/images/reference/airport.webp"});}
export default async function Service({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {published}=await readContent();const {services,copy:c}=websiteFromValues(published);const service=services.find(item=>item.slug===slug&&item.visible);if(!service)notFound();const seo=serviceSeo(slug,service.title,service.intro);return <><JsonLd data={{"@context":"https://schema.org","@type":"Service","@id":absoluteUrl(`/services/${slug}#service`),url:absoluteUrl(`/services/${slug}`),name:seo.title.replace(/ \| Falak Rides$/, ""),description:seo.description,image:absoluteImageUrl(service.image||"/images/reference/airport.webp"),provider:{"@id":absoluteUrl("/#organization")}}}/><PublicPage title={service.title} description={service.intro}><div className="taxi-detail-split"><div>{service.image && <Image src={photo(service.image)} alt={service.title} fill priority sizes="(max-width: 760px) 90vw, 45vw"/>}</div><div><span className="taxi-eyebrow">{published["company.name"]??"Falak Rides"}</span><h2>{service.heading}</h2><p>{service.intro}</p><Link className="taxi-button" href="/book-a-ride">{c.bookNow}</Link></div></div><RelatedLocations serviceId={service.id} serviceTitle={service.title}/><div className="taxi-subheading"><SectionHeading label={c.fleetLabel}><em>{c.fleetAccent}</em> {c.fleetTitle}</SectionHeading></div><VehicleCards/><FaqSection/></PublicPage></>;}
