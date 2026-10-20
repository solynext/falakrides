import type {Metadata} from "next";
import RouteLandingPage from "@/components/public/route-landing-page";
import {routeLanding} from "@/features/seo/landing-pages";
import {pageMetadata} from "@/lib/seo";
const page = routeLanding("madinah-to-jeddah-airport-transfer")!;
export const metadata: Metadata = pageMetadata({title: page.title, description: page.description, path: page.path, image: "/images/locations/jeddah-airport.jpg"});
export default function MadinahToJeddahAirportTransfer() {return <RouteLandingPage page={page}/>;}
