import type { Metadata } from "next";
import Link from "next/link";
import { Face } from "@/components/Face";
import { PaperCard } from "@/components/PaperCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Prose } from "@/components/Prose";
import { VoteTable } from "@/components/VoteTable";
import { paperChart } from "@/lib/charts";
import { checkinDocs } from "@/lib/data";
import { addMonthsISO, fmtDate } from "@/lib/dates";
import { getFundData } from "@/lib/fund";
import { money, signedMoney, tone } from "@/lib/format";
import { coverage, displayTicker } from "@/lib/team";
import { voteHistory } from "@/lib/verdict";

export const metadata: Metadata = { title: "Inside the Fund" };

const RULES = [
  "No position above 25%.",
  "At least three asset classes.",
  "Include needs 2 of 3 votes, and the owner's vote alone never carries it.",
  "No trade under about $5.",
  "A sell trigger is written at entry.",
];

export default async function InsideTheFund({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; voter?: string; all?: string }>;
}) {
  const sp = await searchParams;
  const d = await getFundData();
  const chart = paperChart(d);
  const checkins = checkinDocs();
  const postMortem = checkins.find((c) => c.front.type === "post-mortem");
  const weekly = checkins.filter((c) => c.front.type === "weekly");
  const covered = coverage();

  const tickers = [...new Set(d.votes.map((v) => v.ticker))].sort();
  const filtered = voteHistory(d.votes).filter(
    (v) => (!sp.ticker || v.ticker === sp.ticker) && (!sp.voter || v.voter === sp.voter),
  );
  const shown = sp.all ? filtered : filtered.slice(0, 12);

  const p = d.tl.paper;
  const last = p.pnl.length - 1;
  const postMortemDue = addMonthsISO(d.launch, 1);

  return (
    <main className="page">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1>Inside the Fund</h1>
        <p className="tagline" style={{ marginBottom: 0 }}>The paper book, the committee&apos;s decisions and the team.</p>
      </section>

      <section className="section" data-view="paper" id="paper-book">
        <div className="section-head">
          <h2>Paper book</h2>
        </div>
        <div className="paper-band">
          <strong>Paper — not real capital.</strong>
          <span>
            {money(p.base[last], 0)} posted as margin and premium · equity {money(p.equity[last], 0)} ·{" "}
            <span className={tone(p.pnl[last])}>{signedMoney(p.pnl[last], 0)} P&L</span>
          </span>
        </div>
        <PerformanceChart data={chart.data} series={chart.series} markers={chart.markers} mode="usd" note={chart.note} />
        <div className="stack" style={{ marginTop: 24 }}>
          {d.paper.map((pos) => (
            <PaperCard key={pos.ticker} p={pos} />
          ))}
        </div>
      </section>

      <section className="section" id="committee">
        <div className="section-head">
          <h2>Investment committee</h2>
        </div>
        <div className="rules-grid">
          <div>
            <h3>House rules</h3>
            <ul>{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <h3>Decision thresholds</h3>
            <ul>
              <li><b>Include</b> if fair value is at least 15% above price (stocks), or it lowers volatility or raises Sharpe at a 10% weight (bonds, gold).</li>
              <li><b>Watch</b> at 0–15% upside.</li>
              <li><b>Reject</b> if fair value is below price, or the risk case fails.</li>
            </ul>
          </div>
        </div>

        <h3 style={{ margin: "36px 0 12px" }}>Vote history</h3>
        <form className="filter-form" method="get" action="/fund#committee">
          <label>
            Asset{" "}
            <select name="ticker" defaultValue={sp.ticker ?? ""}>
              <option value="">All</option>
              {tickers.map((t) => <option key={t} value={t}>{displayTicker(t)}</option>)}
            </select>
          </label>
          <label>
            Voter{" "}
            <select name="voter" defaultValue={sp.voter ?? ""}>
              <option value="">All</option>
              {d.team.map((t) => <option key={t.initials} value={t.initials}>{t.name}</option>)}
            </select>
          </label>
          <button className="button" type="submit">Filter</button>
        </form>
        <VoteTable votes={shown} showTicker empty="No votes match." />
        {!sp.all && filtered.length > shown.length && (
          <p style={{ marginTop: 12 }}>
            <Link href={`/fund?all=1${sp.ticker ? `&ticker=${sp.ticker}` : ""}${sp.voter ? `&voter=${sp.voter}` : ""}#committee`}>
              Show all {filtered.length} votes →
            </Link>
          </p>
        )}

        <h3 style={{ margin: "36px 0 8px" }}>Weekly check-ins</h3>
        {weekly.length === 0 && <p className="empty">No check-ins yet.</p>}
        {weekly.map((c) => (
          <details className="checkin" key={c.slug}>
            <summary>
              <span className="muted">{fmtDate(c.front.date, true)}</span>
              <b>{c.front.title}</b>
            </summary>
            <Prose source={c.body} />
          </details>
        ))}

        <h3 style={{ margin: "36px 0 8px" }}>Post-mortem</h3>
        {postMortem ? (
          <details className="checkin" open>
            <summary>
              <span className="muted">{fmtDate(postMortem.front.date, true)}</span>
              <b>{postMortem.front.title}</b>
            </summary>
            <Prose source={postMortem.body} />
          </details>
        ) : (
          <p className="empty">Month-one post-mortem due {fmtDate(postMortemDue, true)}.</p>
        )}
      </section>

      <section className="section" id="team">
        <div className="section-head">
          <h2>The team</h2>
        </div>
        <div className="team-grid">
          {d.team.map((m) => (
            <div className="member" key={m.initials}>
              <Face initials={m.initials} size={128} />
              <h3>{m.name}</h3>
              <p className="muted" style={{ margin: 0, maxWidth: 280 }}>{m.bio}</p>
              <ul>
                {(covered[m.initials] ?? []).map((t) => {
                  const published = d.research.get(t)?.front.status === "published";
                  return (
                    <li key={t}>
                      {published ? <Link href={`/research/${t.toLowerCase()}`}>{displayTicker(t)}</Link> : <span className="muted">{displayTicker(t)}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
