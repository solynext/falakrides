import type {Metadata} from "next";
import Footer from "@/components/layout/footer";
import WhatsAppChat from "@/components/shared/whatsapp-chat";
import HomepageContent from "@/components/public/homepage-content";
import {pageMetadata} from "@/lib/seo";
export async function generateMetadata():Promise<Metadata>{return pageMetadata({title:"Umrah Taxi & Private Transport in Saudi Arabia | Falak Rides",description:"Book reliable Umrah taxi and private transport with Falak Ride. Comfortable rides between Jeddah Airport, Makkah, Madinah and Taif. Contact us to book your ride.",path:"/",image:"/images/reference/hero-umrah.webp"});}
export default function Home(){return <><main id="main"><HomepageContent/></main><Footer/><WhatsAppChat/></>;}
