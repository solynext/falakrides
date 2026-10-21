import type {Metadata} from "next";
import Footer from "@/components/layout/footer";
import WhatsAppChat from "@/components/shared/whatsapp-chat";
import HomepageContent from "@/components/public/homepage-content";
import {pageMetadata} from "@/lib/seo";
export async function generateMetadata():Promise<Metadata>{return pageMetadata({title:"Jeddah Airport, Makkah & Madinah Taxi | Falak Rides",description:"Request Jeddah Airport transfers, Makkah to Madinah taxis and private Ziyarat transport with Falak Rides. Explore vehicles, routes and fares in SAR.",path:"/",image:"/images/reference/hero-umrah.webp"});}
export default function Home(){return <><main id="main"><HomepageContent/></main><Footer/><WhatsAppChat/></>;}
