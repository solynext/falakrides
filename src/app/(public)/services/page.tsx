import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import PublicPage from "@/components/layout/public-page";
import {BookingCallout, SectionHeading, ServiceCards} from "@/components/public/sections";
import {pageMetadata} from "@/lib/seo";
export const metadata = pageMetadata({title:"Taxi, Airport & Umrah Transport Services | Falak Rides",description:"Arrange private airport transfers, city taxi rides and Ziyarat transport in Makkah, Madinah and Jeddah with Falak Rides.",path:"/services",image:"/images/reference/airport.webp"});
export default async function Services() {const {published}=await readContent();const {copy:c}=websiteFromValues(published);return <PublicPage title="Private Transport Services for Umrah & Ziyarat" description={c.servicesPageDescription}><SectionHeading label={c.servicesLabel}><em>{c.servicesAccent}</em> {c.servicesTitle}</SectionHeading><ServiceCards/><div className="taxi-subheading"><BookingCallout/></div></PublicPage>;}
