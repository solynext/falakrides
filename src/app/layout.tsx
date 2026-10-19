import type { Metadata } from "next";
import "./globals.css";
import "@/components/ui/x-button.css";
import {UnsavedChangesProvider} from "@/components/forms/unsaved-changes";
export const metadata: Metadata = {
 title: "Falak Rides | Private Rides, Umrah & Airport Transfers in Saudi Arabia",
 description: "Plan private transportation across Makkah, Madinah and Jeddah. Explore vehicles and request airport, Umrah and Ziyarat rides with Falak Rides.",
 openGraph: {title:"Falak Rides — Your journey, made comfortable",description:"Private rides, airport transfers and Umrah transportation across Saudi Arabia.",type:"website"},
};
export default function RootLayout({children}: {children:React.ReactNode}) {return <html lang="en"><body><UnsavedChangesProvider>{children}</UnsavedChangesProvider></body></html>}
