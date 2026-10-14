import { AllocationRisk } from "@/components/AllocationRisk";
import { HeroTiles, viewLabel } from "@/components/HeroTiles";
import { HoldingsTable } from "@/components/HoldingsTable";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ResearchTeaser } from "@/components/ResearchTeaser";
import { ViewToggle } from "@/components/ViewToggle";
import { WinnersLosers } from "@/components/WinnersLosers";
import { chartFor } from "@/lib/charts";
import { allocation, getFundData, parseView, researchCards } from "@/lib/fund";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const d = await getFundData();
  // No ?view= means Real, so a fresh visit never lands on paper numbers by accident.
  // With no paper positions there is nothing to toggle, so the toggle and the other views disappear.
  const hasPaper = d.paper.length > 0;
  const view = hasPaper ? parseView((await searchParams).view) : "real";
  const chart = chartFor(d, view);
  const alloc = allocation(d, view);
  const cards = researchCards(d);

  const chartTitle =
    view === "paper" ? "Paper equity curve" : view === "combined" ? "Real vs combined vs SPY" : "Fund vs SPY";
  const chartSub = view === "paper" ? "Dollar P&L, starting from margin posted" : "Both indexed to 100 at launch";

  return (
    <main className="page" data-view={view}>
      <section className="hero">
        <h1>WDP Fund</h1>
        <p className="tagline">Conviction backed by fundamentals.</p>
        {hasPaper && <ViewToggle view={view} />}
        <p className={`view-label${view === "paper" ? " paper" : ""}`}>{viewLabel(d, view)}</p>
        <HeroTiles d={d} view={view} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{chartTitle}</h2>
          <p className="sub">{chartSub}</p>
        </div>
        {chart.data.length < 2 ? (
          <p className="empty">The chart starts once there are two days of history. Check back after tomorrow&apos;s close.</p>
        ) : (
          <PerformanceChart data={chart.data} series={chart.series} markers={chart.markers} mode={chart.mode} note={chart.note} />
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Winners and losers</h2>
          <p className="sub">
            {view === "paper" ? "Ranked by return on margin" : "Ranked by return since purchase"}, with dollar contribution
          </p>
        </div>
        <WinnersLosers d={d} view={view} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Holdings</h2>
          <p className="sub">Click a ticker for the full write-up</p>
        </div>
        <HoldingsTable d={d} view={view} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Allocation and risk</h2>
        </div>
        <AllocationRisk d={d} a={alloc} view={view} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Research</h2>
          <p className="sub">One line per asset. Open a write-up for the model, the risks and the votes.</p>
        </div>
        <ResearchTeaser cards={cards} />
      </section>
    </main>
  );
}
