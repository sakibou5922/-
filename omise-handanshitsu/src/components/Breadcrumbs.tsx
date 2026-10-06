import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "./JsonLd";

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "トップ", href: "/" }, ...items];
  return (
    <nav className="breadcrumbs" aria-label="現在地">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.href),
          })),
        }}
      />
      <ol>
        {all.map((c, i) => (
          <li key={c.href}>
            {i === all.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.href}>{c.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
