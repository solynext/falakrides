"use client";

import {useContentValue} from "@/features/content/public-content";
import "./social-links.css";

export default function SocialLinks() {
  const facebook = useContentValue("contact.facebook", "").trim() || "https://www.facebook.com/profile.php?id=61573320659090";
  const savedInstagram = useContentValue("contact.instagram", "").trim();
  const instagram = !savedInstagram || /^https:\/\/(?:www\.)?instagram\.com\/alfalakrides\/?$/i.test(savedInstagram)
    ? "https://www.instagram.com/falakrides/" : savedInstagram;
  const linkedin = useContentValue("contact.linkedin", "").trim() || "https://www.linkedin.com/company/145242047/";
  const tiktok = useContentValue("contact.tiktok", "").trim() || "https://www.tiktok.com/@al.falak.rides";
  const youtube = useContentValue("contact.youtube", "").trim() || "https://www.youtube.com/@FalakRides";

  function socialLink(label: string, url: string, domain: string) {
    let valid = false;
    try {const parsed = new URL(url); valid = parsed.protocol === "https:" && (parsed.hostname === domain || parsed.hostname.endsWith("." + domain));} catch { /* Profile is not configured yet. */ }
    const network = label.toLowerCase();
    const icons: Record<string, React.ReactNode> = {
      facebook: <path fill="currentColor" d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.4A23 23 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9Z"/>,
      instagram: <g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></g>,
      linkedin: <g fill="currentColor"><circle cx="5" cy="5" r="2"/><path d="M3 9h4v12H3zm7 0h4v1.6c.8-1.2 1.9-1.9 3.5-1.9 3 0 3.5 2 3.5 5V21h-4v-6.5c0-1.5-.3-2.3-1.4-2.3-1.2 0-1.6.9-1.6 2.3V21h-4Z"/></g>,
      tiktok: <path fill="currentColor" d="M14 2h3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.7V16a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3Z"/>,
      youtube: <><path fill="currentColor" d="M21.6 6.2c-.2-.9-.9-1.6-1.8-1.8C18.2 4 12 4 12 4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 7.8 2 12 2 12s0 4.2.4 5.8c.2.9.9 1.6 1.8 1.8C5.8 20 12 20 12 20s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8C22 16.2 22 12 22 12s0-4.2-.4-5.8Z"/><path fill="#e71923" d="m10 8 6 4-6 4Z"/></>,
    };
    const content = <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">{icons[network]}</svg>;
    return valid ? <a className={`contact-social-button contact-social-${network}`} href={url} target="_blank" rel="noopener noreferrer" title={`${label} (opens in a new tab)`} aria-label={`${label} (opens in a new tab)`}>{content}</a> : null;
  }

  return <div className="contact-popup-social"><span>Stay connected</span><nav aria-label="Social media">{socialLink("Facebook", facebook, "facebook.com")}{socialLink("Instagram", instagram, "instagram.com")}{socialLink("LinkedIn", linkedin, "linkedin.com")}{socialLink("TikTok", tiktok, "tiktok.com")}{socialLink("YouTube", youtube, "youtube.com")}</nav></div>;
}
