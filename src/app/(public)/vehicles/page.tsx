import {ContentText} from "@/features/content/public-content";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import PublicPage from "@/components/layout/public-page";
import {SectionHeading, VehicleCards} from "@/components/public/sections";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import Fleet from "@/features/fleet/components/fleet";
import {pageMetadata} from "@/lib/seo";
export const metadata = pageMetadata({title:"Umrah Taxi Fleet | Toyota Camry, Hyundai Staria, GMC & Toyota Hiace | Falak Rides",description:"Compare sedan, family, premium and group vehicle preferences for Umrah taxi trips. Check published passenger and luggage capacities, then confirm the actual vehicle with the team.",path:"/vehicles",image:"/images/reference/staria.webp"});
export default async function Vehicles() {const {published}=await readContent();const {copy:c}=websiteFromValues(published);return <PublicPage title="Umrah Taxi Vehicles and Fleet Options" description={c.vehiclesDescription}><SeoBreadcrumbs items={[{label:"Vehicles"}]}/><SectionHeading label={c.fleetLabel}><em>{c.fleetAccent}</em> {c.fleetTitle}</SectionHeading><VehicleCards/><div className="taxi-subheading"><SectionHeading label={<ContentText id="ui.vehicles.1" fallback="Current Catalog"/>} description={<ContentText id="ui.vehicles.2" fallback="View the vehicles currently listed by our team, including passenger and luggage capacities."/>}><em><ContentText id="ui.vehicles.3" fallback="Available Vehicle"/></em>{" "}<ContentText id="ui.vehicles.4" fallback="Information"/></SectionHeading></div><Fleet/></PublicPage>;}
