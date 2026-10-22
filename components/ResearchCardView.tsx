import Link from "next/link";
import { Byline } from "./Face";
import { VerdictPill, ViewPill } from "./Verdict";
import { fmtDate } from "@/lib/dates";
import type { ResearchCard } from "@/lib/fund";
import { price } from "@/lib/format";
import { displayTicker } from "@/lib/team";

export function ResearchCardView({ c }: { c: ResearchCard }) {
  if (c.status === "in-progress") {
    return (
      <div className="rcard wip">
        <div className="rcard-head">
          <h3>{c.name}</h3>
          <span className="ticker">{displayTicker(c.ticker)}</span>
        </div>
        {c.strategy && <div className="meta">{c.strategy}</div>}
        <p style={{ margin: "8px 0" }}><em>Analysis in progress</em></p>
        {c.price !== undefined && <div className="meta">Last close {price(c.price, c.currency)}</div>}
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
        <ViewPill view={c.view} />
        {c.strategy && ` ${c.strategy}`}
      </div>
      <p className="rcard-thesis">{c.thesis}</p>
      <div className="fv">
        <span>
          Price <b>{c.price !== undefined ? price(c.price, c.currency) : "—"}</b>
        </span>
        <VerdictPill verdict={c.verdict} />
      </div>
      <Byline initials={c.author} prefix="by" />
      <div className="meta">Updated {fmtDate(c.updated, true)}</div>
    </Link>
  );
}
