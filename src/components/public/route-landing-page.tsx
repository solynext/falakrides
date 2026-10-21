import Link from "next/link";
import PublicPage from "@/components/layout/public-page";
import JsonLd from "@/components/seo/json-ld";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import {readContent} from "@/features/content/store";
import type {RouteLanding} from "@/features/seo/landing-pages";
import {absoluteUrl} from "@/lib/seo";

import {matchingRouteFares, fareLabel} from "@/features/seo/route-fares";

export default async function RouteLandingPage({page}: {page: RouteLanding}) {
  const {catalog, published} = await readContent();
  const matchedFares = matchingRouteFares(catalog, page.routeFrom, page.routeTo);
  const vehicles = catalog?.vehicles ?? [];
  const contact = published["contact.phone"] ?? "+966 56 769 1683";
  const whatsapp = `https://wa.me/${contact.replace(/\D/g, "")}?text=${encodeURIComponent(`Please quote a private transfer from ${page.pickup} to ${page.destination}.`)}`;
  const currentUrl = absoluteUrl(page.path);

  return <>
    <JsonLd data={{"@context": "https://schema.org", "@type": "Service", "@id": `${currentUrl}#service`, url: currentUrl, name: page.h1, serviceType: "Private taxi transfer", description: page.description, areaServed: [page.pickup, page.destination], provider: {"@id": absoluteUrl("/#organization")}}}/>
    <PublicPage title={page.h1} description={page.intro}>
      <SeoBreadcrumbs items={[{label: "Routes", href: "/routes"}, {label: page.h1}]}/>
      <div className="seo-content">
        <section aria-labelledby="route-planning-heading">
          <h2 id="route-planning-heading">Plan your {page.pickup} to {page.destination} ride</h2>
          <p>{page.intro}</p>
          <p>{page.journey}</p>
          <ul>{page.planning.map(item => <li key={item}>{item}</li>)}</ul>
        </section>

        <section aria-labelledby="route-pickup-heading">
          <h2 id="route-pickup-heading">Pickup and drop-off information</h2>
          <ul>{page.pickupInformation.map(item => <li key={item}>{item}</li>)}</ul>
        </section>

        <section aria-labelledby="route-fare-heading">
          <h2 id="route-fare-heading">Vehicle options and published fares in SAR</h2>
          {matchedFares.length ? <>
            <p>These published fares match the pickup and destination in the direction shown. They are for the listed vehicle and a one-way transfer; they are not a per-person ticket price. A return journey or extra stops require a separate quote.</p>
            <div className="seo-fare-list">{matchedFares.map((item, index) => {
              const vehicle = catalog?.vehicles.find(candidate => candidate.id === item.vehicleId);
              return <article className="seo-fare-card" key={`${item.route}-${item.vehicleId ?? index}`}>
                <h3>{vehicle?.name ?? "Private transfer"}</h3>
                <p>{page.pickup} to {page.destination}</p>
                <p><strong>{fareLabel(item.fare, item.maxFare)}</strong></p>
                {vehicle && <p>{vehicle.category}: up to {vehicle.passengers} passengers and {vehicle.bags} bags listed. Confirm the actual vehicle and luggage fit with the team.</p>}
              </article>;
            })}</div>
          </> : <p>No fare is published for this exact route and vehicle combination. <strong>Contact us for a quote.</strong> Include the route, date, passenger count and luggage so the team can review your request.</p>}
          <p>Confirm the total fare and what it covers before accepting: ask about airport parking, waiting time, additional stops, taxes and any other charges. A published price range needs an exact quote for your request. Vehicle availability and the final price require team confirmation.</p>
          {vehicles.filter(vehicle => !matchedFares.some(fare => fare.vehicleId === vehicle.id)).length > 0 && <>
            <h3>Other listed vehicle preferences</h3>
            <p>These vehicles are in the public fleet catalog; availability on this route must be confirmed. No vehicle-specific fare is published here for them.</p>
            <ul>{vehicles.filter(vehicle => !matchedFares.some(fare => fare.vehicleId === vehicle.id)).map(vehicle => <li key={vehicle.id ?? vehicle.name}>{vehicle.name} ({vehicle.category}): up to {vehicle.passengers} passengers and {vehicle.bags} bags listed; request a quote.</li>)}</ul>
          </>}
          <p>For other trips, compare <Link href="/routes">currently published routes and fares</Link> or read <Link href="/umrah-taxi-prices">how Umrah taxi prices are quoted</Link>.</p>
        </section>

        <section aria-labelledby="route-booking-heading">
          <h2 id="route-booking-heading">How to book this transfer</h2>
          <p>Use Saudi Arabia time (UTC+3) for your pickup. Submitting the form creates a pending request; your ride is confirmed only after the team confirms it.</p>
          <ol>{page.booking.map(item => <li key={item}>{item}</li>)}</ol>
          <div className="seo-actions">
            <Link className="taxi-button" href={`/book-a-ride?pickup=${encodeURIComponent(page.pickup)}&destination=${encodeURIComponent(page.destination)}`}>Request this ride</Link>
            <a className="taxi-text-link" href={whatsapp} target="_blank" rel="noopener noreferrer">Ask for a WhatsApp quote</a>
          </div>
        </section>

        <section aria-labelledby="route-related-heading">
          <h2 id="route-related-heading">Related route and travel information</h2>
          <ul className="seo-related-links">{page.related.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        </section>
      </div>
    </PublicPage>
  </>;
}
