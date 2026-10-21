import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Byline } from "@/components/Face";
import { PaperCard } from "@/components/PaperCard";
import { PriceChart } from "@/components/PriceChart";
import { Prose } from "@/components/Prose";
import { ConclusionPill, VerdictPill } from "@/components/Verdict";
import { VoteTable } from "@/components/VoteTable";
import { researchDocs } from "@/lib/data";
import { fmtDate } from "@/lib/dates";
import { getFundData } from "@/lib/fund";
import { money, signedPct, slugify, tone } from "@/lib/format";
import { computeVerdict, voteHistory } from "@/lib/verdict";

// Pre-built at deploy time, then refreshed hourly so prices and upside stay current.
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
  const price = closes[closes.length - 1];
  const upside = f.fairValue && price ? f.fairValue / price - 1 : undefined;
  const result = computeVerdict(d.votes, f.ticker, f.author);
  const history = voteHistory(d.votes, f.ticker);
  const paper = d.paper.find((p) => p.ticker === f.ticker);

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
        <p className="muted" style={{ margin: "8px 0 14px" }}>{f.assetClass}{paper ? " (paper)" : ""} · {f.method}</p>
        <Byline initials={f.author} prefix="Research by" center />
        <p className="muted" style={{ fontSize: "0.85rem", margin: "4px 0 0" }}>Updated {fmtDate(f.updated, true)}</p>
        <p style={{ margin: "10px 0 0" }}>Author&rsquo;s conclusion <ConclusionPill conclusion={f.conclusion} /></p>
      </div>

      <p className="thesis">{f.thesis}</p>

      <div className="tiles">
        <div className="tile">
          <div className="tile-label">Fair value</div>
          <div className="tile-value">{f.fairValue !== undefined ? money(f.fairValue) : "—"}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Price</div>
          <div className="tile-value">{price !== undefined ? money(price) : "—"}</div>
          <div className="tile-sub">{fmtDate(d.asOf)} close</div>
        </div>
        <div className="tile">
          <div className="tile-label">Upside</div>
          <div className={`tile-value ${upside !== undefined ? tone(upside) : ""}`}>{upside !== undefined ? signedPct(upside) : "—"}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Committee verdict</div>
          <div className="tile-value" style={{ fontSize: "1.4rem", paddingTop: 6 }}><VerdictPill verdict={result.verdict} /></div>
          <div className="tile-sub">{result.counts.Include} Include · {result.counts.Watch} Watch · {result.counts.Reject} Reject</div>
        </div>
      </div>

      {f.keyOutputs && f.keyOutputs.length > 0 && (
        <div className="stat-row" style={{ marginTop: 20 }}>
          {f.keyOutputs.map((k) => (
            <div className="stat" key={k.label}>
              <div className="tile-label">{k.label}</div>
              <div className="tile-value" style={{ fontSize: "1.3rem" }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Price {buy ? "since purchase" : "history"}</h2>
          <p className="sub">{f.fairValue !== undefined && "Fair value drawn as a line"}</p>
        </div>
        <PriceChart data={series} fairValue={f.fairValue} buy={buy} />
      </section>

      <section className="section">
        <Prose source={doc.body} />
        {f.sellTrigger && (
          <div className="callout">
            <span className="pixel">Sell trigger</span>
            {f.sellTrigger}
          </div>
        )}
      </section>

      {paper && (
        <section className="section">
          <div className="section-head"><h2>Live paper position</h2></div>
          <PaperCard p={paper} />
        </section>
      )}

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

function tradeStart(d: Awaited<ReturnType<typeof getFundData>>, ticker: string): string | undefined {
  const pos = d.tl.final.positions.get(`real:${ticker}`) ?? d.tl.final.positions.get(`paper:${ticker}`);
  return pos ? d.dates.find((x) => x >= pos.firstDate) : undefined;
}
