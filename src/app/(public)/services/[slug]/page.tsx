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
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const {published}=await readContent();const service=websiteFromValues(published).services.find(item=>item.slug===slug&&item.visible);return {title:`${service?.title??"Service"} | ${published["company.name"]??"Falak Rides"}`,description:service?.intro};}
export default async function Service({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {published}=await readContent();const {services,copy:c}=websiteFromValues(published);const service=services.find(item=>item.slug===slug&&item.visible);if(!service)notFound();return <PublicPage title={service.title} description={service.intro}><div className="taxi-detail-split"><div>{service.image && <Image src={photo(service.image)} alt={service.title} fill priority sizes="(max-width: 760px) 90vw, 45vw"/>}</div><div><span className="taxi-eyebrow">{published["company.name"]??"Falak Rides"}</span><h2>{service.heading}</h2><p>{service.intro}</p><Link className="taxi-button" href="/book-a-ride">{c.bookNow}</Link></div></div><RelatedLocations serviceId={service.id} serviceTitle={service.title}/><div className="taxi-subheading"><SectionHeading label={c.fleetLabel}><em>{c.fleetAccent}</em> {c.fleetTitle}</SectionHeading></div><VehicleCards/><FaqSection/></PublicPage>;}
