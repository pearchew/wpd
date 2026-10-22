import type { Metadata } from "next";
import { AllocationRisk } from "@/components/AllocationRisk";
import { HoldingsTable } from "@/components/HoldingsTable";
import { viewLabel } from "@/components/HeroTiles";
import { ResearchTeaser } from "@/components/ResearchTeaser";
import { ViewToggle } from "@/components/ViewToggle";
import { WinnersLosers } from "@/components/WinnersLosers";
import { allocation, getFundData, parseView, researchCards } from "@/lib/fund";

export const metadata: Metadata = { title: "Inside the Fund" };
// Without paper trades this page is built once at deploy; rebuild it at least hourly so new closes show.
export const revalidate = 3600;

export default async function InsideTheFund({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const d = await getFundData();
  // Same rule as Home: Real unless ?view= says otherwise, and only when there is a paper book.
  const hasPaper = d.paper.length > 0;
  const view = hasPaper ? parseView((await searchParams).view) : "real";
  const alloc = allocation(d, view);
  const cards = researchCards(d);

  return (
    <main className="page" data-view={view}>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1>Inside the Fund</h1>
        <p className="tagline">What the fund owns and how each position is doing.</p>
        {hasPaper && <ViewToggle view={view} base="/inside" />}
        <p className={`view-label${view === "paper" ? " paper" : ""}`}>{viewLabel(d, view)}</p>
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
