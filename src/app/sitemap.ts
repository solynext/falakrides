import type {MetadataRoute} from "next";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";

export const dynamic = "force-dynamic";

const excludedMarker = /admin|api|login|checkout|draft|inactive/i;

function isPublicRecord(record: {slug: string; visible?: boolean; status?: string}) {
  return Boolean(record.slug.trim()) && record.visible !== false &&
    !excludedMarker.test(record.slug) && !excludedMarker.test(record.status ?? "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const paths = new Set([
    "/", "/about", "/gallery", "/contact", "/book-a-ride", "/services",
    "/routes", "/vehicles", "/offers", "/packages", "/faq", "/policies",
    "/privacy", "/terms",
  ]);

  try {
    // The standard fetcher loads published services, vehicle packages, and locations.
    const {published, catalog} = await readContent();
    const {services, vehicles} = websiteFromValues(published);
    const dynamicPaths = [
      ...services.filter(isPublicRecord).map(item => `/services/${encodeURIComponent(item.slug)}`),
      ...vehicles.filter(isPublicRecord).map(item => `/packages/${encodeURIComponent(item.slug)}`),
      ...(catalog?.locationCards ?? []).filter(isPublicRecord)
        .map(item => `/locations/${encodeURIComponent(item.slug)}`),
    ];
    dynamicPaths.forEach(path => paths.add(path));
  } catch (error) {
    console.error("Failed to fetch dynamic sitemap content; returning static pages.", error);
  }

  return Array.from(paths, path => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.3,
  }));
}
