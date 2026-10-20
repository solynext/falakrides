import type {Metadata} from "next";
import RouteLandingPage from "@/components/public/route-landing-page";
import {routeLanding} from "@/features/seo/landing-pages";
import {pageMetadata} from "@/lib/seo";
const page = routeLanding("jeddah-airport-to-makkah-taxi")!;
export const metadata: Metadata = pageMetadata({title: page.title, description: page.description, path: page.path, image: "/images/reference/airport.webp"});
export default function JeddahAirportToMakkahTaxi() {return <RouteLandingPage page={page}/>;}
