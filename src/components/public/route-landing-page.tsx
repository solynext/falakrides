import Link from "next/link";
import PublicPage from "@/components/layout/public-page";
import JsonLd from "@/components/seo/json-ld";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import {readContent} from "@/features/content/store";
import type {RouteLanding} from "@/features/seo/landing-pages";
import {absoluteUrl} from "@/lib/seo";

function normalize(value: string) {
  return value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function routeParts(route: string) {
  return route.split(/\s*(?:→|â†’|->)\s*/).map(normalize);
}

function fareLabel(fare: number | null, maxFare?: number | null) {
  if (fare === null) return "Contact us for a quote";
  const minimum = `SAR ${fare.toLocaleString("en-SA", {maximumFractionDigits: 2})}`;
  if (maxFare !== null && maxFare !== undefined && maxFare > fare) return `${minimum}–SAR ${maxFare.toLocaleString("en-SA", {maximumFractionDigits: 2})}`;
  return minimum;
}

export default async function RouteLandingPage({page}: {page: RouteLanding}) {
  const {catalog, published} = await readContent();
  const matchedFares = (catalog?.fares ?? []).filter(item => {
    const [from, to = ""] = routeParts(item.route);
    return from.includes(page.routeFrom) && to.includes(page.routeTo);
  });
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
          <ul>{page.planning.map(item => <li key={item}>{item}</li>)}</ul>
        </section>

        <section aria-labelledby="route-fare-heading">
          <h2 id="route-fare-heading">Vehicle and fare options</h2>
          {matchedFares.length ? <>
            <p>These are published active fare records that match this route. Confirm the vehicle, availability, luggage fit and full trip details with the team before booking.</p>
            <div className="seo-fare-list">{matchedFares.map((item, index) => {
              const vehicle = catalog?.vehicles.find(candidate => candidate.id === item.vehicleId);
              return <article className="seo-fare-card" key={`${item.route}-${item.vehicleId ?? index}`}>
                <h3>{vehicle?.name ?? "Private transfer"}</h3>
                <p><strong>{fareLabel(item.fare, item.maxFare)}</strong></p>
                {vehicle && <p>{vehicle.passengers} passengers · {vehicle.bags} bags listed. Confirm the actual vehicle and luggage fit with the team.</p>}
              </article>;
            })}</div>
          </> : <p>No fare is published for this exact route and vehicle combination. <strong>Contact us for a quote.</strong> Include the route, date, passenger count and luggage so the team can review your request.</p>}
          <p>For other trips, compare <Link href="/routes">currently published routes and fares</Link> or read <Link href="/umrah-taxi-prices">how Umrah taxi prices are quoted</Link>.</p>
        </section>

        <section aria-labelledby="route-booking-heading">
          <h2 id="route-booking-heading">How to book this transfer</h2>
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
