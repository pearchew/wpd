import type { Metadata } from "next";
import Link from "next/link";
import { Face } from "@/components/Face";
import { ResearchCardView } from "@/components/ResearchCardView";
import { getFundData, researchCards } from "@/lib/fund";
import { ASSET_CLASSES } from "@/lib/schemas";
import { slugify } from "@/lib/format";

export const metadata: Metadata = { title: "Research" };

const tabs = ASSET_CLASSES.map((c) => ({ cls: c, slug: slugify(c), label: c === "Derivatives" ? "Derivatives (Paper)" : c }));

export default async function ResearchIndex({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; author?: string }>;
}) {
  const sp = await searchParams;
  const d = await getFundData();
  const active = tabs.find((t) => t.slug === sp.class) ?? tabs[0];
  const author = d.team.some((t) => t.initials === sp.author) ? sp.author : undefined;
  const all = researchCards(d);

  const href = (cls: string, a?: string) => `/research?class=${cls}${a ? `&author=${a}` : ""}`;
  const cards = all
    .filter((c) => c.assetClass === active.cls && (!author || c.author === author))
    .sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <main className="page">
      <section className="hero" style={{ paddingBottom: 24 }}>
        <h1>Research</h1>
        <p className="tagline" style={{ marginBottom: 0 }}>Every position, the analysis behind it, and who wrote it.</p>
      </section>

      <nav className="tabs" aria-label="Asset class">
        {tabs.map((t) => (
          <Link key={t.slug} href={href(t.slug, author)} aria-current={t.slug === active.slug ? "page" : undefined}>
            {t.label} <span className="muted">{all.filter((c) => c.assetClass === t.cls && (!author || c.author === author)).length}</span>
          </Link>
        ))}
      </nav>

      <div className="filter-row">
        <span>Author</span>
        <Link className="chip plain" href={href(active.slug)} aria-current={!author ? "true" : undefined}>All</Link>
        {d.team.map((p) => (
          <Link key={p.initials} className="chip" href={href(active.slug, p.initials)} aria-current={author === p.initials ? "true" : undefined}>
            <Face initials={p.initials} size={20} /> {p.name}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="empty">No {active.label.toLowerCase()} research{author ? " by this author" : ""} yet.</p>
      ) : (
        <div className="card-grid">
          {cards.map((c) => (
            <ResearchCardView key={c.ticker} c={c} />
          ))}
        </div>
      )}
    </main>
  );
}
