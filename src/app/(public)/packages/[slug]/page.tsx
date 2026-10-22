import type {Metadata} from "next";
import {notFound} from "next/navigation";
import PublicPage from "@/components/layout/public-page";
import JsonLd from "@/components/seo/json-ld";
import VehicleRouteDetails from "@/components/public/vehicle-route-details";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import {absoluteImageUrl, absoluteUrl, pageMetadata} from "@/lib/seo";

function packageDescription(slug: string, description: string) {
  return slug === "staria"
    ? "Explore Hyundai Staria private transfers and spacious family Umrah transportation itineraries across Makkah, Madinah and the listed airports."
    : description;
}

const packageSeo: Record<string, {title: string; description: string}> = {
  staria: {title: "Hyundai Staria Airport Transfer | Falak Rides", description: "Hyundai Staria packages with driver for airport, Umrah and Ziyarat transfers in Makkah and Madinah. Request a quote with Falak Rides."},
  hiace: {title: "Toyota Hiace Umrah Transport | Falak Rides", description: "Toyota Hiace packages with driver for airport, Umrah and Ziyarat transfers in Makkah and Madinah. Request a quote with Falak Rides."},
  gmc: {title: "GMC Yukon XL Private Transfer | Falak Rides", description: "GMC Yukon XL packages with driver for airport, Umrah and Ziyarat transfers in Makkah and Madinah. Request a quote with Falak Rides."},
  "camry-sonata": {title: "Camry & Sonata Taxi Packages | Falak Rides", description: "Camry and Sonata packages with driver for airport, Umrah and Ziyarat transfers in Makkah and Madinah. Request a quote with Falak Rides."},
};

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const {published} = await readContent();
  const vehicle = websiteFromValues(published).vehicles.find(item => item.slug === slug && item.visible);
  const name = vehicle?.name ?? "Vehicle";
  const seo = packageSeo[slug];
  const description = seo?.description ?? packageDescription(slug, vehicle?.description ?? "Private vehicle details from Falak Rides.");
  return pageMetadata({title: seo?.title ?? `${name} Details | ${published["company.name"] ?? "Falak Rides"}`, description, path: `/packages/${slug}`, image: vehicle?.image || "/images/reference/hero-family.webp"});
}

export default async function PackagePage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const {published} = await readContent();
  const {vehicles} = websiteFromValues(published);
  const vehicle = vehicles.find(item => item.slug === slug && item.visible);
  if (!vehicle) notFound();
  const description = packageDescription(slug, vehicle.description);

  return <>
    <JsonLd data={{"@context": "https://schema.org", "@type": "Service", "@id": absoluteUrl(`/packages/${slug}#service`), url: absoluteUrl(`/packages/${slug}`), name: `${vehicle.name} private transfers`, description, image: absoluteImageUrl(vehicle.image || "/images/reference/hero-family.webp"), provider: {"@id": absoluteUrl("/#organization")}}}/>
    <PublicPage title={`${vehicle.name} Details`} description={vehicle.description}>
      <VehicleRouteDetails vehicleName={vehicle.name}/>
    </PublicPage>
  </>;
}
