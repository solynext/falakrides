import {ContentText} from "@/features/content/public-content";
import PublicPage from "@/components/layout/public-page";
import PriceRouteList from "@/components/public/price-route-list";
import {SectionHeading} from "@/components/public/sections";
import Link from "next/link";
import {pageMetadata} from "@/lib/seo";
export const metadata = pageMetadata({title:"Umrah Taxi Fares & Routes | Falak Rides",description:"Compare private taxi routes between Jeddah Airport, Makkah, Madinah and Madinah Airport, with fares in SAR. Request your ride with Falak Rides.",path:"/routes",image:"/images/locations/makkah-haram.jpg"});
export default async function Routes() {return <PublicPage title="Umrah Taxi Routes & Transfer Prices" description={<ContentText id="ui.routes.2" fallback="Airport arrivals, hotel transfers, and connections between the holy cities."/>}><SectionHeading label={<ContentText id="ui.routes.3" fallback="City-wise Services"/>}><em><ContentText id="ui.routes.4" fallback="Connecting"/></em>{" "}<ContentText id="ui.routes.5" fallback="Your Destinations"/></SectionHeading><PriceRouteList/><p className="taxi-note"><ContentText id="ui.routes.6" fallback="Need another route or an extra stop? "/><Link href="/contact"><ContentText id="ui.routes.7" fallback="Share your itinerary with our team."/></Link></p></PublicPage>;}
