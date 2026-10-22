import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Byline } from "@/components/Face";
import { PaperCard } from "@/components/PaperCard";
import { PriceChart } from "@/components/PriceChart";
import { Prose } from "@/components/Prose";
import { VerdictPill, ViewPill } from "@/components/Verdict";
import { VoteTable } from "@/components/VoteTable";
import { researchDocs } from "@/lib/data";
import { fmtDate } from "@/lib/dates";
import { getFundData } from "@/lib/fund";
import { money, price as fmtPrice, signedPct, slugify, tone } from "@/lib/format";
import { computeVerdict, voteHistory } from "@/lib/verdict";

// Pre-built at deploy time, then refreshed hourly so prices and the position stay current.
export const revalidate = 3600;

export function generateStaticParams() {
  return researchDocs()
    .filter((d) => d.front.status === "published")
    .map((d) => ({ ticker: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const doc = researchDocs().find((d) => d.slug === ticker);
  return { title: doc ? doc.front.name : "Research" };
}

export default async function AssetPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: slug } = await params;
  const d = await getFundData();
  const doc = [...d.research.values()].find((x) => x.slug === slug);
  if (!doc || doc.front.status !== "published") notFound();
  const f = doc.front;

  const closes = d.closes[f.ticker] ?? [];
  const currency = d.instruments.get(f.ticker)?.currency ?? d.meta.reportingCurrency;
  const price = closes[closes.length - 1];
  const result = computeVerdict(d.votes, f.ticker, f.author);
  const history = voteHistory(d.votes, f.ticker);
  const paper = d.paper.find((p) => p.ticker === f.ticker);
  const held = d.real.find((h) => h.ticker === f.ticker);
  const kind = d.instruments.get(f.ticker)?.kind;

  // Chart from our first purchase (or launch, for assets we only research).
  const buyDate = tradeStart(d, f.ticker);
  const startIdx = Math.max(0, buyDate ? d.dates.indexOf(buyDate) : 0);
  // Too few days since purchase to draw a line: show the lead-up from the full history instead.
  const sparse = d.dates.length - startIdx < 5;
  const full = d.fullCloses[f.ticker] ?? [];
  const series = sparse
    ? d.allDates.slice(-60).map((date, i, arr) => ({ date, price: full[full.length - arr.length + i] }))
    : d.dates.slice(startIdx).map((date, i) => ({ date, price: closes[i + startIdx] }));
  const buy = buyDate ? { date: buyDate, price: closes[startIdx] } : undefined;

  const title = f.ticker.length > 8 ? f.name : `${f.name} (${f.ticker})`;

  return (
    <main className="page" data-view={paper ? "paper" : "real"}>
      <div className="asset-head">
        <p className="breadcrumb">
          <Link href="/research">← Research</Link> / <Link href={`/research?class=${slugify(f.assetClass)}`}>{f.assetClass}</Link>
        </p>
        <h1>{title}</h1>
        <p className="muted" style={{ margin: "8px 0 14px" }}>
          {[f.exchange, kind && KIND_LABEL[kind], `${f.assetClass}${paper ? " (paper)" : ""}`].filter(Boolean).join(" · ")}
        </p>
        <Byline initials={f.author} prefix="Research by" center />
        <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>
          {f.published && `Published ${fmtDate(f.published, true)} · `}Updated {fmtDate(f.updated, true)}
        </p>
      </div>

      <p className="thesis">{f.thesis}</p>

      <div className="tiles">
        <div className="tile">
          <div className="tile-label">View</div>
          <div className="tile-value" style={{ fontSize: "1.4rem", paddingTop: 6 }}><ViewPill view={f.view} /></div>
          <div className="tile-sub">{f.conviction ? `${f.conviction} conviction` : ""}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Price</div>
          <div className="tile-value">{price !== undefined ? fmtPrice(price, currency) : "—"}</div>
          <div className="tile-sub">{fmtDate(d.asOf)} close</div>
        </div>
        <div className="tile">
          <div className="tile-label">Strategy</div>
          <div className="tile-value" style={{ fontSize: "1.1rem", paddingTop: 8 }}>{f.strategy?.family ?? "—"}</div>
          <div className="tile-sub">{f.strategy?.holding ?? ""}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Committee verdict</div>
          <div className="tile-value" style={{ fontSize: "1.4rem", paddingTop: 6 }}><VerdictPill verdict={result.verdict} /></div>
          <div className="tile-sub">{result.counts.Include} Include · {result.counts.Watch} Watch · {result.counts.Reject} Reject</div>
        </div>
      </div>

      {f.keyNumbers && f.keyNumbers.length > 0 && (
        <div className="stat-row key-numbers" style={{ marginTop: 20 }}>
          {f.keyNumbers.map((k) => (
            <div className="stat" key={k.label}>
              <div className="tile-label">{k.label}</div>
              <div className="tile-value" style={{ fontSize: "1.3rem" }}>
                {k.value}
                {k.unit && <span className="unit"> {k.unit}</span>}
              </div>
              {(k.asOf || k.source) && (
                <div className="tile-sub">{[k.asOf && `as of ${fmtDate(k.asOf, true)}`, k.source].filter(Boolean).join(" · ")}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {f.strategy && (
        <section className="section">
          <div className="section-head"><h2>Strategy</h2><p className="sub">{f.strategy.family}</p></div>
          <dl className="strategy">
            <dt>Rule</dt>
            <dd>{f.strategy.rule}</dd>
            {f.strategy.entry && (<><dt>Entry trigger</dt><dd>{f.strategy.entry}</dd></>)}
            {f.strategy.exit && (<><dt>Exit rule</dt><dd>{f.strategy.exit}</dd></>)}
            {f.strategy.holding && (<><dt>Holding period</dt><dd>{f.strategy.holding}</dd></>)}
            {f.strategy.papers && (<><dt>Source paper(s)</dt><dd>{f.strategy.papers}</dd></>)}
          </dl>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Price {buy ? "since purchase" : "history"}</h2>
        </div>
        <PriceChart data={series} buy={buy} currency={currency} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Position and P&amp;L</h2>
          <p className="sub">{held || paper ? "From the trade ledger" : "Not held: research only"}</p>
        </div>
        {held && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="left">Book</th>
                  <th>Entry date</th>
                  <th>Avg cost</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Value</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="left">Real</td>
                  <td>{fmtDate(held.entryDate, true)}</td>
                  <td>{money(held.avgCost)}</td>
                  <td>{held.qty.toFixed(4)}</td>
                  <td>{fmtPrice(held.price, currency)}</td>
                  <td>{money(held.value)}</td>
                  <td className={tone(held.returnPct)}>{signedPct(held.returnPct)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {paper && <PaperCard p={paper} />}
      </section>

      <section className="section">
        <Prose source={doc.body} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Committee</h2>
          <p className="sub">Latest vote per person decides the verdict. Changes of mind stay visible.</p>
        </div>
        <VoteTable votes={history} />
      </section>

      {f.model && (
        <section className="section">
          <a className="button" href={f.model} download>⬇ Download the Excel model</a>
        </section>
      )}
    </main>
  );
}

const KIND_LABEL: Record<string, string> = { stock: "Stock", etf: "ETF", future: "Future", option: "Option" };

function tradeStart(d: Awaited<ReturnType<typeof getFundData>>, ticker: string): string | undefined {
  const pos = d.tl.final.positions.get(`real:${ticker}`) ?? d.tl.final.positions.get(`paper:${ticker}`);
  return pos ? d.dates.find((x) => x >= pos.firstDate) : undefined;
}
