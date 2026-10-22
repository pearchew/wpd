import Link from "next/link";
import { Face } from "./Face";
import { VerdictPill, ViewPill } from "./Verdict";
import type { ResearchCard } from "@/lib/fund";
import { ASSET_CLASSES } from "@/lib/schemas";
import { displayTicker, getMember } from "@/lib/team";


export function ResearchTeaser({ cards }: { cards: ResearchCard[] }) {
  return (
    <div>
      {ASSET_CLASSES.map((cls, i) => {
        const items = cards.filter((c) => c.assetClass === cls && c.status === "published").sort((a, b) => a.ticker.localeCompare(b.ticker));
        return (
          <details className="teaser" key={cls} open={i === 0}>
            <summary>
              {cls === "Derivatives" ? "Derivatives (paper)" : cls}
              <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>{items.length}</span>
            </summary>
            {items.length === 0 && <p className="empty">Nothing here yet.</p>}
            {items.map((c) =>
              c.status === "published" ? (
                <Link key={c.ticker} href={`/research/${c.ticker.toLowerCase()}`} className="teaser-line">
                  <b>{displayTicker(c.ticker)}</b>
                  <span>{c.view && <><ViewPill view={c.view} />{" "}</>}{c.thesis}</span>
                  <span className="muted">{c.strategy}</span>
                  <VerdictPill verdict={c.verdict} />
                  <span className="by"><Face initials={c.author} size={20} /> by {getMember(c.author)?.name ?? c.author}</span>
                </Link>
              ) : (
                <div key={c.ticker} className="teaser-line wip">
                  <b>{displayTicker(c.ticker)}</b>
                  <span>Analysis in progress</span>
                  <span />
                  <span />
                  <span className="by"><Face initials={c.author} size={20} /> by {getMember(c.author)?.name ?? c.author}</span>
                </div>
              ),
            )}
          </details>
        );
      })}
    </div>
  );
}
