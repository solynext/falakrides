import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import PublicPage from "@/components/layout/public-page";
import {SectionHeading, VehicleCards} from "@/components/public/sections";
import {pageMetadata} from "@/lib/seo";
export const metadata = pageMetadata({title:"Umrah Transport Packages | Falak Rides",description:"Explore private Umrah transport packages for airport transfers, Makkah, Madinah and Ziyarat journeys. Request a quote with Falak Rides.",path:"/packages",image:"/images/reference/hero-family.webp"});
export default async function Packages() {const {published}=await readContent();const {copy:c}=websiteFromValues(published);return <PublicPage title="Umrah Transport Packages" description={c.packagesDescription}><SectionHeading label={c.packagesLabel}><em>{c.packagesAccent}</em> {c.packagesHeading}</SectionHeading><VehicleCards/></PublicPage>;}
