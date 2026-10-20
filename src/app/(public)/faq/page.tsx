import {ContentText} from "@/features/content/public-content";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import PublicPage from "@/components/layout/public-page";
import {FaqSection} from "@/components/public/sections";
import {pageMetadata} from "@/lib/seo";
export const metadata = pageMetadata({title:"Frequently Asked Questions | Falak Rides",description:"Answers about booking private taxis, airport transfers, vehicle choices, fares, Ziyarat and cancellations.",path:"/faq",image:"/images/reference/faq-hd.webp"});
export default async function Faq() {const {published}=await readContent();const {copy:c}=websiteFromValues(published);return <PublicPage title={c.faqPageTitle} description={<ContentText id="ui.faq.1" fallback="Answers about booking private taxis, airport transfers, vehicle choices, fares, Ziyarat and cancellations."/>} ><FaqSection full/></PublicPage>;}
