import type {Metadata} from "next";
import Link from "next/link";
import PublicPage from "@/components/layout/public-page";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import {travelGuides} from "@/features/seo/travel-guides";
import {pageMetadata} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Umrah Travel Guides | Taxi, Routes and Airport Transfers | Falak Ride",
  description: "Practical guides to Umrah taxi bookings, Saudi Arabia route fares, airport pickups, vehicle choices and private Makkah to Madinah transfers.",
  path: "/travel-guides",
  image: "/images/reference/hero-umrah.webp",
});

export default function TravelGuides() {
  return <PublicPage title="Umrah Travel and Taxi Guides" description="Plan private airport transfers, intercity journeys and vehicle choices with practical booking checklists.">
    <SeoBreadcrumbs items={[{label: "Travel Guides"}]}/>
    <div className="seo-guide-grid">
      {travelGuides.map(guide => <article className="seo-guide-card" key={guide.slug}>
        <h2><Link href={`/travel-guides/${guide.slug}`}>{guide.title}</Link></h2>
        <p>{guide.excerpt}</p>
        <Link className="taxi-text-link" href={`/travel-guides/${guide.slug}`}>Read this guide</Link>
      </article>)}
    </div>
  </PublicPage>;
}
