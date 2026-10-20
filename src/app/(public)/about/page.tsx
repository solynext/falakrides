import type {Metadata} from "next";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import PublicPage from "@/components/layout/public-page";
import {BookingSteps, Introduction, WhyChooseUs} from "@/components/public/sections";
import {pageMetadata} from "@/lib/seo";
export const metadata: Metadata = pageMetadata({title:"About Us | Falak Rides",description:"Get to know Falak Rides and arrange private airport transfers, Umrah transportation, and Ziyarat journeys across Saudi Arabia.",path:"/about",image:"/images/reference/hero-umrah.webp"});
export default async function About() {const {published}=await readContent();const {copy:c}=websiteFromValues(published);return <PublicPage title={c.navAbout} description={c.aboutDescription}><Introduction/><WhyChooseUs/><BookingSteps/></PublicPage>;}
