import {ContentText} from "@/features/content/public-content";
import PublicPage from "@/components/layout/public-page";
import Link from "next/link";
import Image from "next/image";
import {photo} from "@/utils/images";
import {SectionHeading} from "@/components/public/sections";
import {readContent} from "@/features/content/store";
import {pageMetadata} from "@/lib/seo";
import "./offers.css";

export const metadata = pageMetadata({title:"Travel Offers | Falak Rides",description:"Published travel offers and private transportation packages from Falak Rides.",path:"/offers",image:"/images/reference/hero-family.webp"});

export default async function Offers() {
  const {catalog} = await readContent();
  return <PublicPage hideBanner title={<ContentText id="ui.offers.1" fallback="Travel Offers"/>} description={<ContentText id="ui.offers.2" fallback="Explore published offers or ask our team for a quote tailored to your itinerary."/>}>
    <SectionHeading label={<ContentText id="ui.offers.3" fallback="Plan Your Journey"/>}><em><ContentText id="ui.offers.4" fallback="Current"/></em>{" "}<ContentText id="ui.offers.5" fallback="Travel Offers"/></SectionHeading>
    <div className="taxi-offer-list">
      {catalog!.offers.length ? catalog!.offers.map(offer => <article className="taxi-offer-card" key={offer.id}>
        {offer.image && <div className="taxi-offer-image"><Image src={photo(offer.image, 900)} alt={offer.title} width={900} height={600} sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 33vw"/>{offer.discountPercent > 0 && <strong className="taxi-offer-discount">{offer.discountPercent}% OFF</strong>}</div>}
        <div className="taxi-offer-content">
          {!offer.image && offer.discountPercent > 0 && <strong className="taxi-offer-discount taxi-offer-discount-inline">{offer.discountPercent}% OFF</strong>}
          <h3>{offer.title}</h3>
          <p className="taxi-offer-route">{offer.route}</p>
          {offer.validUntil !== "9999-12-31" && <p className="taxi-offer-valid"><ContentText id="ui.offers.6" fallback="Valid until "/>{offer.validUntil}</p>}
          <p className="taxi-offer-terms">{offer.terms}</p>
          <Link className="taxi-button" href="/book-a-ride"><ContentText id="ui.offers.7" fallback="Ask About This Offer"/></Link>
        </div>
      </article>) : <article className="taxi-offer-card taxi-offer-empty">
        <div className="taxi-offer-content"><h3><ContentText id="ui.offers.8" fallback="A Quote for Your Journey"/></h3><p><ContentText id="ui.offers.9" fallback="No special offers are currently published. Share your route and travel dates for a current quote, or explore our suggested Umrah transport itineraries."/></p><Link className="taxi-button" href="/packages"><ContentText id="ui.offers.10" fallback="Explore Packages"/></Link></div>
      </article>}
    </div>
  </PublicPage>;
}
