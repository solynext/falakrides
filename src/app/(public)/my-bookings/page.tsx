import {ContentText} from "@/features/content/public-content";
import PublicPage from "@/components/layout/public-page";
import BookingHistory from "@/features/bookings/components/booking-history";
import Link from "next/link";
import {pageMetadata} from "@/lib/seo";
export const metadata={...pageMetadata({title:"My Bookings | Falak Rides",description:"Help with upcoming rides, booking history and cancellation requests.",path:"/my-bookings"}),robots:{index:false,follow:false}};
export default function Page(){return <PublicPage title={<ContentText id="ui.my-bookings.1" fallback="My Bookings"/>} description={<ContentText id="ui.my-bookings.2" fallback="Help with upcoming rides, booking history and cancellation requests."/>}><BookingHistory/><Link className="button" href="/contact"><ContentText id="ui.my-bookings.3" fallback="Contact booking support ?"/></Link></PublicPage>;}
