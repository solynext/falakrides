import Header from "@/components/layout/header";
import localFont from "next/font/local";
import {readContent} from "@/features/content/store";
import {PublicContent} from "@/features/content/public-content";
import BookingPopup from "@/features/bookings/components/booking-popup";
import JsonLd from "@/components/seo/json-ld";
import {absoluteUrl} from "@/lib/seo";
import "./public-design.css";
import "@/components/public/seo-content.css";
const heading = localFont({src: [{path: "../../../public/fonts/oswald.ttf", weight: "400"}, {path: "../../../public/fonts/oswald-500.ttf", weight: "500"}, {path: "../../../public/fonts/oswald-700.ttf", weight: "700"}], variable: "--font-taxi-heading", display: "swap", preload: false});
const body = localFont({src: [{path: "../../../public/fonts/epilogue.ttf", weight: "400"}, {path: "../../../public/fonts/epilogue-500.ttf", weight: "500"}, {path: "../../../public/fonts/epilogue-700.ttf", weight: "700"}], variable: "--font-taxi-body", display: "swap", preload: false});
export default async function PublicLayout({children}: {children: React.ReactNode}) {
  const content = await readContent();
  const name=content.published["company.name"]??"Falak Rides";
  const structuredData={"@context":"https://schema.org","@graph":[
    {"@type":"Organization","@id":absoluteUrl("/#organization"),name,url:absoluteUrl("/"),logo:{"@type":"ImageObject",url:absoluteUrl("/images/falak-ride-logo.png")},description:content.published["company.description"]??"Private transportation across Makkah, Madinah and Jeddah.",email:content.published["contact.email"]??"falakrides56@gmail.com",telephone:content.published["contact.phone"]??"+966 56 769 1683",areaServed:["Makkah","Madinah","Jeddah"]},
    {"@type":"WebSite","@id":absoluteUrl("/#website"),url:absoluteUrl("/"),name,publisher:{"@id":absoluteUrl("/#organization")}},
  ]};
  return <PublicContent initial={content.published} catalog={content.catalog!} revision={content.publishedAt}><JsonLd data={structuredData}/><div className={`public-site ${heading.variable} ${body.variable}`}><Header/>{children}<BookingPopup/></div></PublicContent>;
}
