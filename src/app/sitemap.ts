import type {MetadataRoute} from "next";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
export const dynamic = "force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.SITE_URL;if(!base)return [];const {published,catalog}=await readContent();const {services,vehicles}=websiteFromValues(published);const paths=["","/book-a-ride","/services","/routes","/vehicles","/offers","/packages","/gallery","/my-bookings","/about","/contact","/faq","/policies","/privacy","/terms",...services.filter(item=>item.visible).map(item=>`/services/${item.slug}`),...vehicles.filter(item=>item.visible).map(item=>`/packages/${item.slug}`),...(catalog?.locationCards||[]).map(location=>`/locations/${encodeURIComponent(location.slug)}`)];return paths.map(path=>({url:`${base.replace(/\/$/,"")}${path}`,changeFrequency:"monthly" as const,priority:path?0.3:1}));}
