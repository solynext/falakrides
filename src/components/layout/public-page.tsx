import {readContent} from "@/features/content/store";
import {photo} from "@/utils/images";
import Footer from "./footer";
import WhatsAppChat from "@/components/shared/whatsapp-chat";
export default async function PublicPage({title, description, children, hideBanner = false}: {title: React.ReactNode; description: React.ReactNode; children: React.ReactNode; hideBanner?: boolean}) {
  const {published}=await readContent();
  const bannerImage=published["layout.bannerImage"]??"/images/reference/hero-umrah.webp";
  const banner=bannerImage ? photo(bannerImage) : "";
  return <><main id="main">{!hideBanner && <section className="taxi-page-banner" style={{backgroundImage:`linear-gradient(90deg,#36501cc9,#36501cad)${banner ? `,url("${banner}")` : ""}`}}><div className="taxi-container"><h1>{title}</h1><p>{description}</p></div></section>}<div className="taxi-container taxi-page-content">{children}</div></main><Footer/><WhatsAppChat/></>;
}
