import type { Metadata } from "next";
import {siteOrigin} from "@/lib/seo";
import "./globals.css";
import "@/components/ui/x-button.css";
import {UnsavedChangesProvider} from "@/components/forms/unsaved-changes";
export const metadata: Metadata = {
 metadataBase: new URL(siteOrigin()),
 title: "Makkah & Madinah Taxi | Airport Transfers | Falak Rides",
 description: "Plan private transportation across Makkah, Madinah and Jeddah. Explore vehicles and request airport, Umrah and Ziyarat rides with Falak Rides.",
};
export default function RootLayout({children}: {children:React.ReactNode}) {return <html lang="en"><body><UnsavedChangesProvider>{children}</UnsavedChangesProvider></body></html>}
