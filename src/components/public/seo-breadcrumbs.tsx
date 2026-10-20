import Link from "next/link";
import JsonLd from "@/components/seo/json-ld";
import {absoluteUrl} from "@/lib/seo";

type Crumb = {label: string; href?: string};

export default function SeoBreadcrumbs({items}: {items: Crumb[]}) {
  const crumbs = [{label: "Home", href: "/"}, ...items];
  return <>
    <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
      <ol>{crumbs.map((item, index) => <li key={`${item.label}-${index}`}>
        {item.href && index < crumbs.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
      </li>)}</ol>
    </nav>
    <JsonLd data={{"@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((item, index) => ({"@type": "ListItem", position: index + 1, name: item.label, ...(item.href ? {item: absoluteUrl(item.href)} : {})}))}}/>
  </>;
}
