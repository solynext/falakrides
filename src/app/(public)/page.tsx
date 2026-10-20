import type {Metadata} from "next";
import Footer from "@/components/layout/footer";
import WhatsAppChat from "@/components/shared/whatsapp-chat";
import HomepageContent from "@/components/public/homepage-content";
import {pageMetadata} from "@/lib/seo";
export async function generateMetadata():Promise<Metadata>{return pageMetadata({title:"Makkah & Madinah Taxi | Airport Transfers | Falak Rides",description:"Book a private taxi in Makkah, Madinah and Jeddah. Airport transfers, Umrah transport and Ziyarat rides. Request a quote with Falak Rides.",path:"/",image:"/images/reference/hero-umrah.webp"});}
export default function Home(){return <><main id="main"><HomepageContent/></main><Footer/><WhatsAppChat/></>;}
