import {ContentText} from "@/features/content/public-content";
import PublicPage from "@/components/layout/public-page";
import Link from "next/link";
import Booking from "@/features/bookings/components/booking";
export const metadata = {title: "Book a Ride | Falak Rides", description: "Plan your pickup, destination and schedule. Our team confirms availability and the full fare in SAR."};
export default async function BookingPage({searchParams}: {searchParams: Promise<{vehicle?: string | string[]; package?: string | string[];pickup?:string|string[]}>}) {
  const params = await searchParams;
  const preference = {pickup:typeof params.pickup === "string" ? params.pickup.slice(0,150) : undefined,vehicle: typeof params.vehicle === "string" ? params.vehicle.slice(0,100) : undefined, package: typeof params.package === "string" ? params.package.slice(0,100) : undefined};
  return <PublicPage title={<ContentText id="ui.book-a-ride.1" fallback="Book a Ride"/>} description={<ContentText id="ui.book-a-ride.3" fallback="Plan your pickup, destination and schedule. Our team confirms availability and the full fare in SAR."/>} ><Booking key={`${preference.vehicle ?? ""}:${preference.package ?? ""}:${preference.pickup ?? ""}`} preference={preference}/><p className="disclosure"><Link href="/policies"><ContentText id="ui.book-a-ride.2" fallback="Review policies before confirming your ride."/></Link></p></PublicPage>;
}
