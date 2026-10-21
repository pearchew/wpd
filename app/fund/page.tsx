import type { Metadata } from "next";
import Link from "next/link";
import { VoteTable } from "@/components/VoteTable";
import { getFundData } from "@/lib/fund";
import { displayTicker } from "@/lib/team";
import { voteHistory } from "@/lib/verdict";

export const metadata: Metadata = { title: "Fund Rules" };

const RULES = [
  "Asset class targets once invested: equities 35–65%, fixed income 15–35%, commodities and gold 5–25%, cash 0–15%. Rebalance quarterly, or sooner if a class leaves its band.",
  "No position above 20%, and no theme above 40%: positions that move together count together.",
  "Every report ends in the author's own conclusion: Buy, Watch or Avoid. Avoid reports are published too.",
  "Every report has bear, base and bull values with probabilities, a reverse DCF for stocks, and a bear case written by a teammate.",
  "Include needs 2 of 3 votes, and the author's vote alone never carries it.",
  "A measurable sell trigger (a price, a thesis metric or a date) is written at entry. When it fires, the position is sold unless 2 of 3 vote to keep it.",
  "Any position down 20% from entry gets a re-vote, and every exit gets a short post-mortem.",
  "No trade under about $5. Derivatives stay on the paper book.",
];

export default async function FundRules({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; voter?: string; all?: string }>;
}) {
  const sp = await searchParams;
  const d = await getFundData();

  const tickers = [...new Set(d.votes.map((v) => v.ticker))].sort();
  const filtered = voteHistory(d.votes).filter(
    (v) => (!sp.ticker || v.ticker === sp.ticker) && (!sp.voter || v.voter === sp.voter),
  );
  const shown = sp.all ? filtered : filtered.slice(0, 12);

  return (
    <main className="page">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1>Fund Rules</h1>
        <p className="tagline" style={{ marginBottom: 0 }}>How the fund decides what to own.</p>
      </section>

      <section className="section" id="committee">
        <div className="rules-grid">
          <div>
            <h3>House rules</h3>
            <ul>{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <h3>Decision thresholds</h3>
            <ul>
              <li><b>Include</b> if the probability-weighted fair value is at least 15% above price and the bear case loses no more than 30% (stocks), or it lowers volatility or raises Sharpe at a 10% weight (bonds, gold).</li>
              <li><b>Watch</b> at 0–15% upside.</li>
              <li><b>Reject</b> if fair value is below price, or the risk case fails.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Vote history</h2>
          <p className="sub">Newest first. A change of mind is a new vote, so the old ones stay visible.</p>
        </div>
        <form className="filter-form" method="get" action="/fund">
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
            <Link href={`/fund?all=1${sp.ticker ? `&ticker=${sp.ticker}` : ""}${sp.voter ? `&voter=${sp.voter}` : ""}`}>
              Show all {filtered.length} votes →
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
