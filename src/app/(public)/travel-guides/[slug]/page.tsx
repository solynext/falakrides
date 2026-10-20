import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import PublicPage from "@/components/layout/public-page";
import SeoBreadcrumbs from "@/components/public/seo-breadcrumbs";
import JsonLd from "@/components/seo/json-ld";
import {travelGuide} from "@/features/seo/travel-guides";
import {absoluteImageUrl, absoluteUrl, pageMetadata} from "@/lib/seo";

type Props = {params: Promise<{slug: string}>};
const markdownLink = /\[([^\]]+)\]\((\/[^)]+)\)/g;

function paragraph(text: string) {
  const children: React.ReactNode[] = [];
  let previous = 0;
  for (const match of text.matchAll(markdownLink)) {
    const index = match.index ?? 0;
    if (index > previous) children.push(text.slice(previous, index));
    children.push(<Link key={`${match[2]}-${index}`} href={match[2]}>{match[1]}</Link>);
    previous = index + match[0].length;
  }
  if (previous < text.length) children.push(text.slice(previous));
  return children;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const guide = travelGuide(slug);
  if (!guide) return pageMetadata({title: "Travel Guide | Falak Ride", description: "Practical Umrah transport planning information.", path: `/travel-guides/${slug}`});
  return pageMetadata({title: `${guide.title} | Falak Ride`, description: guide.description, path: `/travel-guides/${guide.slug}`, image: "/images/reference/hero-umrah.webp"});
}

export default async function TravelGuidePage({params}: Props) {
  const {slug} = await params;
  const guide = travelGuide(slug);
  if (!guide) notFound();
  const currentUrl = absoluteUrl(`/travel-guides/${guide.slug}`);

  return <>
    <JsonLd data={{"@context": "https://schema.org", "@type": "Article", "@id": `${currentUrl}#article`, headline: guide.title, description: guide.description, image: absoluteImageUrl("/images/reference/hero-umrah.webp"), mainEntityOfPage: currentUrl, publisher: {"@id": absoluteUrl("/#organization")}}}/>
    <PublicPage title={guide.title} description={guide.excerpt}>
      <SeoBreadcrumbs items={[{label: "Travel Guides", href: "/travel-guides"}, {label: guide.title}]}/>
      <article className="seo-content seo-guide-article">
        {guide.sections.map(section => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((text, index) => <p key={index}>{paragraph(text)}</p>)}
          {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
        </section>)}
        <section aria-labelledby="guide-next-steps">
          <h2 id="guide-next-steps">Related booking pages</h2>
          <ul className="seo-related-links">{guide.links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
        </section>
      </article>
    </PublicPage>
  </>;
}
