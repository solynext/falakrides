import {ContentText} from "@/features/content/public-content";
import PublicPage from "@/components/layout/public-page";
import Link from "next/link";
import Icon from "@/components/ui/icon";
import {pageMetadata} from "@/lib/seo";

export const metadata = pageMetadata({title:"Policies | Falak Rides",description:"Privacy, terms, refunds and cancellation information.",path:"/policies"});

export default function Page() {
  return <PublicPage title={<ContentText id="ui.policies.1" fallback="Policies"/>} description={<ContentText id="ui.policies.12" fallback="Privacy, terms, refunds and cancellation information."/>} >
    <div className="policies-layout">
      <div className="policy-cards">
        <article className="policy-card">
          <span className="policy-icon"><Icon name="shield" size={25}/></span>
          <h2><ContentText id="ui.policies.2" fallback="Privacy policy"/></h2>
          <p><ContentText id="ui.policies.3" fallback="Learn how your details are handled when preparing a request."/></p>
          <Link href="/privacy"><ContentText id="ui.policies.4" fallback="Read the privacy notice"/><Icon size={18}/></Link>
        </article>
        <article className="policy-card">
          <span className="policy-icon"><Icon name="check" size={25}/></span>
          <h2><ContentText id="ui.policies.5" fallback="Terms of service"/></h2>
          <p><ContentText id="ui.policies.6" fallback="Review how requests, quotes and confirmations work."/></p>
          <Link href="/terms"><ContentText id="ui.policies.7" fallback="Read the terms"/><Icon size={18}/></Link>
        </article>
      </div>
      <section className="policy-refunds" aria-labelledby="refunds-heading">
        <div className="policy-refunds-title"><span className="policy-icon"><Icon name="clock" size={25}/></span><h2 id="refunds-heading"><ContentText id="ui.policies.8" fallback="Refunds and cancellations"/></h2></div>
        <div className="policy-refunds-content">
          <p><ContentText id="ui.policies.9" fallback="A standard refund and cancellation schedule has not been published. Ask our team for the applicable terms before accepting a quote or making a payment."/></p>
          <p><ContentText id="ui.policies.10" fallback="If your plans change, contact support with your reference and travel date. Refund amounts, charges and processing times require confirmation."/></p>
          <Link className="button" href="/contact"><ContentText id="ui.policies.11" fallback="Contact support"/><Icon size={18}/></Link>
        </div>
      </section>
    </div>
  </PublicPage>;
}
