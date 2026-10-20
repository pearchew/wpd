import { Analysts } from "@/components/Analysts";
import { HeroTiles, viewLabel } from "@/components/HeroTiles";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ViewToggle } from "@/components/ViewToggle";
import { chartFor } from "@/lib/charts";
import { getFundData, parseView } from "@/lib/fund";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const d = await getFundData();
  // No ?view= means Real, so a fresh visit never lands on paper numbers by accident.
  // With no paper positions there is nothing to toggle, so the toggle and the other views disappear.
  const hasPaper = d.paper.length > 0;
  const view = hasPaper ? parseView((await searchParams).view) : "real";
  const chart = chartFor(d, view);

  const chartTitle =
    view === "paper" ? "Paper equity curve" : view === "combined" ? "Real vs combined vs SPY" : "Fund vs SPY";
  const chartSub = view === "paper" ? "Dollar P&L, starting from margin posted" : "Both indexed to 100 at launch";

  return (
    <main className="page" data-view={view}>
      <section className="hero">
        <h1>Fund performance</h1>
        {/* The capital label is the subtitle; on the paper view it keeps the amber "no real capital" warning. */}
        <p className={`tagline${view === "paper" ? " paper" : ""}`}>{viewLabel(d, view)}</p>
        {hasPaper && <ViewToggle view={view} />}
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
          <h2>Our analysts</h2>
        </div>
        <Analysts team={d.team} />
      </section>
    </main>
  );
}
