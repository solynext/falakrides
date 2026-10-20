import type {Metadata} from "next";

const FALLBACK_ORIGIN = "https://falak-ride.vercel.app";
const DEFAULT_IMAGE = "/images/header-background.jpg";

function normalizeOrigin(value?: string) {
  const candidate = value?.trim();
  if (!candidate) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    url.protocol = "https:";
    return url.origin;
  } catch {
    return "";
  }
}

export function siteOrigin() {
  return normalizeOrigin(
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ) || FALLBACK_ORIGIN;
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteOrigin()}/`).toString();
}

export function absoluteImageUrl(image: string) {
  if (/^https:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return absoluteUrl(image);
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=1200&q=85`;
}

export function publicPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/locations/jeddah-airport-jed-b4dd7"
    ? "/locations/jeddah-airport"
    : normalized;
}

export function pageMetadata({title,description,path,image = DEFAULT_IMAGE}: {title:string;description:string;path:string;image?:string}): Metadata {
  const canonical = absoluteUrl(publicPath(path));
  const imageUrl = absoluteImageUrl(image);
  return {
    title, description,
    alternates: {canonical},
    openGraph: {title, description, url: canonical, images: [{url: imageUrl}], type: "website"},
    twitter: {card: "summary_large_image", title, description, images: [imageUrl]},
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
