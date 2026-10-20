import type {Metadata} from "next";
import {cache} from "react";
import Image from "next/image";
import Link from "next/link";
import {notFound,permanentRedirect} from "next/navigation";
import PublicPage from "@/components/layout/public-page";
import {SectionHeading} from "@/components/public/sections";
import {db} from "@/lib/db";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import {photo} from "@/utils/images";

const findLocation=cache(async(id:string)=>{
  const location=await db.location.findFirst({where:{OR:[{slug:id},{id}],status:"Active"}});
  if(!location)notFound();
  if(location.slug&&id!==location.slug)permanentRedirect(`/locations/${location.slug}`);
  return location;
});
type Props={params:Promise<{id:string}>};

export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {id}=await params;
  const location=await findLocation(id);
  return {title:`${location.name} | Falak Rides`,description:location.description};
}

export default async function LocationPage({params}:Props) {
  const {id}=await params;
  const [location,{published}]=await Promise.all([findLocation(id),readContent()]);
  const {services,copy}=websiteFromValues(published);
  const related=services.filter(service=>service.visible&&location.serviceIds.includes(service.id));
  const destinations=location.destinations.split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  return <PublicPage title={location.name} description="Private transportation to and from this location.">
    <div className="taxi-detail-split"><div>{location.image&&<Image src={photo(location.image)} alt={location.name} fill priority sizes="(max-width: 760px) 90vw, 45vw"/>}</div><div>
      <span className="taxi-eyebrow">Our Locations</span><h2>{location.name}</h2><p style={{whiteSpace:"pre-line"}}>{location.description}</p>
      <Link className="taxi-button" href={`/book-a-ride?pickup=${encodeURIComponent(location.name)}`}>{copy.bookNow}</Link>
    </div></div>
    {!!related.length&&<section aria-labelledby="related-services-title"><SectionHeading label={location.name}><span id="related-services-title">Related Service</span></SectionHeading><div className="taxi-service-grid">{related.map(service=><Link className="taxi-service-card" href={`/services/${service.slug}`} key={service.id}><div>{service.image&&<Image src={photo(service.image)} alt={service.title} fill sizes="(max-width: 700px) 90vw, 30vw"/>}</div><h3>{service.title}</h3><span>{copy.learnMore} →</span></Link>)}</div></section>}
    {!!destinations.length&&<div className="taxi-detail-grid"><article><h2>Supported destinations</h2><ul>{destinations.map((destination,index)=><li key={index}>{destination}</li>)}</ul></article></div>}
    <div className="taxi-subheading"><Link className="taxi-text-link" href="/#locations">← Explore more locations</Link></div>
  </PublicPage>;
}
