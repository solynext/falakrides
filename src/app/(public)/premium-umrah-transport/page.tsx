import type {Metadata} from "next";
import Link from "next/link";
import PublicPage from "@/components/layout/public-page";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import {pageMetadata} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Premium Umrah Transport | Private SUV & Family Transfers | Falak Ride",
  description: "Explore the listed premium vehicle preference for private Umrah transport. Confirm the exact vehicle, passenger and luggage fit, availability and fare in SAR.",
  path: "/premium-umrah-transport",
  image: "/images/reference/gmc.webp",
});

export default async function PremiumUmrahTransport() {
  const {published, catalog} = await readContent();
  const {vehicles} = websiteFromValues(published);
  const premiumOptions = (catalog?.vehicles ?? []).filter(vehicle => vehicle.category.toLowerCase() === "premium");
  const premiumPackages = vehicles.filter(vehicle => vehicle.visible && (vehicle.category.toLowerCase() === "premium" || vehicle.slug === "gmc"));

  return <PublicPage title="Premium Umrah Transport and Private Vehicle Options" description="Review the listed premium vehicle preference and request a confirmed option for your route and party.">
    <SeoBreadcrumbs items={[{label: "Premium Umrah Transport"}]}/>
    <div className="seo-content">
      <section aria-labelledby="premium-choice-heading">
        <h2 id="premium-choice-heading">A premium vehicle preference for your itinerary</h2>
        <p>The website&apos;s package catalog lists a GMC Yukon XL as a premium private-transfer preference. Share your route, travel date, passenger count and luggage details so the team can confirm whether an appropriate vehicle is available for your journey.</p>
        {premiumPackages.map(vehicle => <article className="seo-fare-card" key={vehicle.id}>
          <h3>{vehicle.name}</h3>
          <p>{vehicle.description}</p>
          <Link href={`/packages/${vehicle.slug}`}>View {vehicle.name} package details</Link>
        </article>)}
        {premiumOptions.map(vehicle => <p key={vehicle.id ?? vehicle.name}>{vehicle.name}: {vehicle.passengers} passengers and {vehicle.bags} bags listed. These catalog details are examples; confirm actual capacity and luggage fit with the team.</p>)}
      </section>

      <section aria-labelledby="premium-planning-heading">
        <h2 id="premium-planning-heading">Plan a private airport or intercity ride</h2>
        <p>Include the exact pickup and drop-off addresses, date, preferred pickup time, passenger count and luggage. For an airport pickup, share your flight details and hotel address. For a journey between the holy cities, list each leg and any planned stops.</p>
        <p>Compare <Link href="/routes">published route fares</Link> where the route and vehicle match. If the exact option is not listed, <strong>contact us for a quote</strong> and confirm the full fare in SAR before accepting.</p>
      </section>

      <section aria-labelledby="premium-next-heading">
        <h2 id="premium-next-heading">Compare other vehicle preferences</h2>
        <p>Review the <Link href="/vehicles">fleet and vehicle catalog</Link> to compare listed categories, then ask the team to confirm the actual model, capacity, availability and luggage fit for your date.</p>
        <div className="seo-actions"><Link className="taxi-button" href="/book-a-ride?vehicle=GMC%20Yukon%20XL">Request a premium vehicle quote</Link><Link className="taxi-text-link" href="/umrah-taxi-prices">View Umrah taxi price information</Link></div>
      </section>
    </div>
  </PublicPage>;
}
