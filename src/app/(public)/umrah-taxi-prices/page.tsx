import type {Metadata} from "next";
import Link from "next/link";
import PublicPage from "@/components/layout/public-page";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import {readContent} from "@/features/content/store";
import {pageMetadata} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Umrah Taxi Prices in Saudi Arabia | Routes, Vehicles & Quotes | Falak Ride",
  description: "Compare published Umrah taxi route fares in SAR, review listed vehicle options and request a quote when your route or vehicle is not priced.",
  path: "/umrah-taxi-prices",
  image: "/images/reference/hero-transfer.png",
});

function formatFare(fare: number | null, maxFare?: number | null) {
  if (fare === null) return "Contact us for a quote";
  const minimum = `SAR ${fare.toLocaleString("en-SA", {maximumFractionDigits: 2})}`;
  return maxFare !== null && maxFare !== undefined && maxFare > fare
    ? `${minimum}–SAR ${maxFare.toLocaleString("en-SA", {maximumFractionDigits: 2})}`
    : minimum;
}

export default async function UmrahTaxiPrices() {
  const {catalog} = await readContent();
  const fares = [...(catalog?.fares ?? [])].sort((a, b) => a.route.localeCompare(b.route) || (a.vehicleId ?? "").localeCompare(b.vehicleId ?? ""));
  const routes = new Map<string, typeof fares>();
  for (const fare of fares) routes.set(fare.route, [...(routes.get(fare.route) ?? []), fare]);

  return <PublicPage title="Umrah Taxi Prices and Vehicle Fare Guide" description="See published route fares where available and learn what details to share when requesting a private taxi quote.">
    <SeoBreadcrumbs items={[{label: "Umrah Taxi Prices"}]}/>
    <div className="seo-content">
      <section aria-labelledby="published-fares-heading">
        <h2 id="published-fares-heading">Published private taxi route fares</h2>
        <p>Prices below come from active fare records in the current catalog. A fare applies only to the route and vehicle combination shown. Confirm availability, luggage fit, itinerary details and the complete quote in SAR with the team before booking.</p>
        {routes.size ? <div className="seo-fare-list">{[...routes.entries()].map(([route, options]) => <article className="seo-fare-card" key={route}>
          <h3>{route}</h3>
          {options.map((option, index) => {
            const vehicle = catalog?.vehicles.find(item => item.id === option.vehicleId);
            return <p key={`${option.vehicleId ?? "vehicle"}-${index}`}><strong>{vehicle?.name ?? "Private transfer"}: {formatFare(option.fare, option.maxFare)}</strong>{vehicle ? ` · ${vehicle.passengers} passengers, ${vehicle.bags} bags listed` : ""}</p>;
          })}
        </article>)}</div> : <p><strong>Contact us for a quote.</strong> Share the route, date, passenger count and luggage to ask for current pricing.</p>}
      </section>

      <section aria-labelledby="quote-factors-heading">
        <h2 id="quote-factors-heading">What to include in a taxi price request</h2>
        <ul>
          <li>Exact pickup and destination, including airport or hotel details.</li>
          <li>Travel date, preferred pickup time, and whether you need one-way or return travel.</li>
          <li>Passenger and luggage counts, plus any planned stops.</li>
          <li>Your preferred vehicle, if you have one; ask the team to confirm its availability and fit.</li>
          <li>The full quote in SAR and what the fare includes before you accept.</li>
        </ul>
      </section>

      <section aria-labelledby="vehicle-fare-heading">
        <h2 id="vehicle-fare-heading">Compare vehicle preferences</h2>
        <p>Vehicle preference and trip details affect which fare is relevant. Review the <Link href="/vehicles">listed fleet and capacities</Link> or explore <Link href="/packages">transport packages</Link>. Images and example capacities do not guarantee the exact vehicle; confirm the final selection with the team.</p>
        <p>For a premium option, see <Link href="/premium-umrah-transport">premium Umrah transport</Link>. For route-specific information, visit <Link href="/routes">Umrah routes and transfer prices</Link>.</p>
      </section>

      <section aria-labelledby="price-cta-heading">
        <h2 id="price-cta-heading">Request a route quote</h2>
        <p>If your exact route or vehicle is not listed, the team can review your itinerary and provide a quote. No unlisted fare is assumed.</p>
        <Link className="taxi-button" href="/book-a-ride">Request a quote</Link>
      </section>
    </div>
  </PublicPage>;
}
