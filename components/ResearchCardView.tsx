import Link from "next/link";
import { Byline } from "./Face";
import { ConclusionPill, VerdictPill } from "./Verdict";
import { fmtDate } from "@/lib/dates";
import type { ResearchCard } from "@/lib/fund";
import { signedPct, tone } from "@/lib/format";
import { displayTicker } from "@/lib/team";

const fmt = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`);

export function ResearchCardView({ c }: { c: ResearchCard }) {
  if (c.status === "in-progress") {
    return (
      <div className="rcard wip">
        <div className="rcard-head">
          <h3>{c.name}</h3>
          <span className="ticker">{displayTicker(c.ticker)}</span>
        </div>
        <div className="meta">{c.method}</div>
        <p style={{ margin: "8px 0" }}><em>Analysis in progress</em></p>
        {c.price !== undefined && <div className="meta">Last close {fmt(c.price)}</div>}
        <Byline initials={c.author} prefix="started by" />
      </div>
    );
  }
  return (
    <Link href={`/research/${c.ticker.toLowerCase()}`} className="rcard">
      <div className="rcard-head">
        <h3>{c.name}</h3>
        <span className="ticker">{displayTicker(c.ticker)}</span>
      </div>
      <div className="meta">
        {c.method} · Conclusion <ConclusionPill conclusion={c.conclusion} />
      </div>
      <div className="fv">
        <span>
          Fair value <b>{c.fairValue !== undefined ? fmt(c.fairValue) : "—"}</b> · price <b>{c.price !== undefined ? fmt(c.price) : "—"}</b>
        </span>
        {c.upside !== undefined && <span className={tone(c.upside)}>{signedPct(c.upside, 0)}</span>}
        <VerdictPill verdict={c.verdict} />
      </div>
      <Byline initials={c.author} prefix="by" />
      <div className="meta">Updated {fmtDate(c.updated, true)}</div>
    </Link>
  );
}
