import BrandLogo from "@/components/ui/brand-logo";
import {ContentText} from "@/features/content/public-content";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import Link from "next/link";
import Icon from "@/components/ui/icon";
import StayInTouch from "@/components/public/stay-in-touch";
import "./footer.css";

export default async function Footer() {
  const {published} = await readContent();
  const {copy: c, services} = websiteFromValues(published);
  const phone = published["contact.phone"] ?? "+966 56 769 1683";
  const email = published["contact.email"] ?? "falakrides56@gmail.com";
  const name = published["company.name"] ?? "Falak Rides";
  const ziyarat = services.find(service => service.visible && service.slug.includes("ziyarat"));

  return <><StayInTouch/><footer className="taxi-footer">
    <div className="taxi-container">
      <div className="taxi-footer-main">
        <div className="taxi-footer-intro">
          <Link className="taxi-footer-brand" href="/" aria-label={`${name} home`}>
            <BrandLogo size={48} name={name}/>
            <small>{c.footerTagline}</small>
          </Link>
          <p className="taxi-footer-description"><ContentText id="company.description" fallback="Private transportation across Makkah, Madinah and Jeddah."/></p>
        </div>
        <div className="taxi-footer-navigation">
          <nav aria-label="Explore">
            <Link href="/"><Icon name="home" size={17}/>{c.navHome}</Link>
            <Link href="/services"><Icon name="car" size={17}/>{c.navServices}</Link>
            {ziyarat && <Link href={`/services/${ziyarat.slug}`}><Icon name="pin" size={17}/>{ziyarat.title}</Link>}
            <Link href="/packages"><Icon name="bag" size={17}/>{c.navPackages}</Link>
            <Link href="/gallery">{c.navGallery}</Link>
          </nav>
          <nav aria-label="Company">
            <Link href="/about"><Icon name="user" size={17}/>{c.navAbout}</Link>
            <Link href="/contact"><Icon name="mail" size={17}/>{c.navContact}</Link>
          </nav>
          <div className="taxi-footer-contact">
            <span>{c.footerConnect}</span>
            <a href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={20}/>{phone}</a>
            <a href={`mailto:${email}`}><Icon name="mail" size={20}/>{email}</a>
          </div>
        </div>
      </div>
      <div className="taxi-footer-bottom">
        <span>© {new Date().getFullYear()} {name}. {c.footerRights}</span>
        <nav aria-label="Legal">
          <Link href="/terms"><Icon name="file" size={16}/><ContentText id="ui.components-layout-footer.3" fallback="Terms and Conditions"/></Link>
          <Link href="/privacy"><Icon name="lock" size={16}/><ContentText id="ui.components-layout-footer.4" fallback="Privacy Policy"/></Link>
          <Link href="/policies"><Icon name="shield" size={16}/><ContentText id="ui.components-layout-footer.5" fallback="Booking Policies"/></Link>
        </nav>
      </div>
    </div>
  </footer></>;
}
