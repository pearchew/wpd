import type { ChartMarker, ChartPoint, ChartSeries } from "@/components/PerformanceChart";
import type { FundData, View } from "./fund";

export interface ChartSpec {
  data: ChartPoint[];
  series: ChartSeries[];
  markers: ChartMarker[];
  mode: "index" | "usd";
  note?: string;
}

const PAPER_LINES = ["#6a8caf", "#a05a8c", "#4f9a8f", "#8a6d3b"];

/** What the Home page chart draws in each view. */
export function chartFor(d: FundData, view: View): ChartSpec {
  if (view === "real") {
    return {
      mode: "index",
      data: d.dates.map((date, i) => ({ date, fund: d.fundIndex[i], spy: d.spyIndex[i] })),
      series: [
        { key: "fund", label: "Fund", color: "var(--accent)", width: 2.5 },
        { key: "spy", label: "SPY", color: "var(--muted)", width: 1.5 },
      ],
      markers: d.events.real,
    };
  }
  if (view === "combined") {
    return {
      mode: "index",
      data: d.dates.map((date, i) => ({
        date,
        fund: d.fundIndex[i],
        combined: d.combinedIndex[i],
        spy: d.spyIndex[i],
      })),
      series: [
        { key: "fund", label: "Real", color: "var(--ink)", width: 2.5 },
        { key: "combined", label: "Combined (scaled)", color: "var(--accent)", dashed: true, width: 2.5 },
        { key: "spy", label: "SPY", color: "var(--muted)", width: 1.5 },
      ],
      markers: [...d.events.real, ...d.events.paper],
      note: "Combined adds paper derivatives scaled to position size: futures by contract % move × a fixed slice of the fund, options by per-share P&L × shares actually held (or a slice when the underlying isn't held).",
    };
  }
  return paperChart(d);
}

export function paperChart(d: FundData): ChartSpec {
  const start = d.tl.paper.base.findIndex((b) => b > 0);
  const from = start < 0 ? 0 : start;
  const tickers = Object.keys(d.tl.paper.pnlByTicker);
  return {
    mode: "usd",
    data: d.dates.slice(from).map((date, k) => {
      const i = k + from;
      const row: ChartPoint = { date, equity: d.tl.paper.equity[i] };
      for (const t of tickers) row[`pnl_${t}`] = d.tl.paper.pnlByTicker[t][i] ?? 0;
      return row;
    }),
    series: [
      { key: "equity", label: "Paper equity", color: "var(--accent)", width: 2.5 },
      ...tickers.map((t, i) => ({
        key: `pnl_${t}`,
        label: `${t.length > 8 ? `${t.slice(0, 3)} put` : t} P&L`,
        color: PAPER_LINES[i % PAPER_LINES.length],
        width: 1.5,
      })),
    ],
    markers: d.events.paper,
    note: "Paper equity starts from the margin and premium posted. Lines show each contract's $ P&L. No real capital.",
  };
}
