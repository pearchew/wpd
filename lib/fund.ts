import { cache } from "react";
import { instruments, meta, researchDocs, team, trades, votes } from "./data";
import {
  buildTimeline,
  dailyReturns,
  dateIndexOnOrBefore,
  firstTradeDate,
  indexTo100,
  instrumentMap,
  positionPnl,
  twrIndex,
  type Ctx,
  type Position,
  type Timeline,
} from "./calc/ledger";
import { bsGreeks, bsPrice, impliedVol } from "./calc/options";
import { annualVol, riskBreakdown, sharpe } from "./calc/risk";
import { daysBetween } from "./dates";
import { getPriceBook, usingDummyPrices } from "./prices";
import type { AssetClass, Instrument, Meta, TeamMember, Vote } from "./schemas";
import { computeVerdict, type Verdict } from "./verdict";
import type { ResearchDoc } from "./data";

export type View = "real" | "combined" | "paper";
export const parseView = (v: string | string[] | undefined): View => {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "paper" || s === "combined" ? s : "real";
};

export interface ResearchInfo {
  status: "published" | "in-progress";
  author: string;
  thesis: string;
  method: string;
  fairValue?: number;
}

/** One line in the winners/losers grid and the holdings table. */
export interface HoldingRow {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  book: "real" | "paper";
  kind: Instrument["kind"];
  qty: number;
  price: number;
  value: number;
  weight: number;
  returnPct: number;
  /** $ contribution since purchase (realised + unrealised + dividends) */
  pnl: number;
  spark: number[];
  research?: ResearchInfo;
  verdict: Verdict;
  upside?: number;
}

export interface PaperRow extends HoldingRow {
  kind: "future" | "option";
  multiplier: number;
  entry: number;
  margin: number;
  returnOnMargin: number;
  notional: number;
  leverage: number;
  scaledPnl: number;
  slice?: number;
  callDays: string[];
  // futures
  basis?: number;
  rollYieldAnnual?: number;
  structure?: "contango" | "backwardation";
  expiry?: string;
  // options
  modelPrice?: number;
  impliedVol?: number;
  greeks?: { delta: number; theta: number; vega: number };
  attribution?: { total: number; delta: number; theta: number; vega: number; other: number };
  strike?: number;
  optionType?: "call" | "put";
}

export interface ChartEvent {
  date: string;
  label: string;
}

export interface FundData {
  meta: Meta;
  dummy: boolean;
  asOf: string;
  launch: string;
  nav: number;
  navCombined: number;
  fundReturn: number;
  combinedReturn: number;
  spyReturn: number;
  dates: string[];
  fundIndex: number[];
  combinedIndex: number[];
  spyIndex: number[];
  tl: Timeline;
  /** close series per ticker, aligned to `dates` */
  closes: Record<string, number[]>;
  real: HoldingRow[];
  paper: PaperRow[];
  cash: number;
  research: Map<string, ResearchDoc>;
  team: TeamMember[];
  votes: Vote[];
  instruments: Map<string, Instrument>;
  events: { real: ChartEvent[]; paper: ChartEvent[] };
  /** undefined until there are enough days of history to mean anything */
  fundSharpe?: number;
  spySharpe?: number;
  /** full close history per ticker (including days before launch), aligned to `allDates` */
  fullCloses: Record<string, number[]>;
  allDates: string[];
}

function downsample(xs: number[], max = 40): number[] {
  if (xs.length <= max) return xs;
  const step = (xs.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => xs[Math.round(i * step)]);
}

export const getFundData = cache(async (): Promise<FundData> => {
  const m = meta();
  const list = instruments();
  const imap = instrumentMap(list);
  const ledger = trades();
  const prices = await getPriceBook();
  const ctx: Ctx = { instruments: imap, prices, meta: m };

  const launch = m.launchDate ?? firstTradeDate(ledger);
  const tl = buildTimeline(ledger, ctx, launch);
  const n = tl.dates.length;
  const offset = prices.dates.length - n;
  const asOf = tl.dates[n - 1];

  const fundIndex = twrIndex(tl.realNav, tl.flows);
  const combinedIndex = twrIndex(tl.combinedNav, tl.flows);
  const spyAll = prices.closes[m.benchmark];
  if (!spyAll) throw new Error(`benchmark ${m.benchmark} has no prices`);
  const spyIndex = indexTo100(spyAll.slice(offset));

  const docs = new Map(researchDocs().map((d) => [d.front.ticker, d]));
  const voteRows = votes();

  const researchInfo = (ticker: string): ResearchInfo | undefined => {
    const d = docs.get(ticker);
    return d && {
      status: d.front.status, author: d.front.author, thesis: d.front.thesis,
      method: d.front.method, fairValue: d.front.fairValue,
    };
  };

  const base = (pos: Position, inst: Instrument, price: number) => {
    const doc = docs.get(pos.ticker);
    const verdict = computeVerdict(voteRows, pos.ticker, doc?.front.author).verdict;
    const fv = doc?.front.status === "published" ? doc.front.fairValue : undefined;
    const startIdx = dateIndexOnOrBefore(prices.dates, pos.firstDate);
    return {
      ticker: pos.ticker,
      name: inst.name,
      assetClass: inst.asset_class,
      book: pos.book,
      kind: inst.kind,
      qty: pos.qty,
      price,
      research: researchInfo(pos.ticker),
      verdict,
      upside: fv ? fv / price - 1 : undefined,
      // Right after a purchase there is nothing to draw yet, so show the lead-up instead.
      spark: downsample(prices.closes[pos.ticker].slice(prices.dates.length - startIdx < 5 ? -30 : startIdx)),
    };
  };

  const last = prices.dates.length - 1;
  const nav = tl.realNav[n - 1];
  const real: HoldingRow[] = [];
  const paper: PaperRow[] = [];

  for (const pos of tl.final.positions.values()) {
    const inst = imap.get(pos.ticker);
    if (!inst) throw new Error(`unknown ticker in ledger: ${pos.ticker}`);
    const price = prices.closes[pos.ticker][last];

    if (pos.book === "real") {
      if (pos.qty === 0) continue;
      const value = pos.qty * price;
      real.push({
        ...base(pos, inst, price),
        value,
        weight: value / nav,
        returnPct: price / pos.avg - 1,
        pnl: positionPnl(pos, price) + pos.dividends,
      });
      continue;
    }

    // ---- paper positions -------------------------------------------------
    const pnl = positionPnl(pos, price);
    const margin =
      inst.kind === "future" ? pos.peakQty * (inst.margin ?? 0) : pos.peakQty * pos.multiplier * pos.entryPrice;
    const notional = Math.abs(pos.qty) * pos.multiplier * price;
    const row: PaperRow = {
      ...base(pos, inst, price),
      kind: inst.kind as "future" | "option",
      multiplier: pos.multiplier,
      value: pos.qty * pos.multiplier * price,
      weight: pos.scale ? (pos.slice ?? 0) / nav : 0,
      returnPct: pos.entryPrice ? (price / pos.entryPrice - 1) * Math.sign(pos.qty || 1) : 0,
      pnl,
      entry: pos.avg || pos.entryPrice,
      margin,
      returnOnMargin: margin ? pnl / margin : 0,
      notional,
      leverage: margin ? notional / margin : 0,
      scaledPnl: tl.overlay.length ? pnl * (pos.scale ?? 0) : 0,
      slice: pos.slice,
      callDays: tl.paper.callDays[pos.ticker] ?? [],
      expiry: inst.expiry,
    };

    if (inst.underlying) {
      const under = prices.closes[inst.underlying];
      if (inst.kind === "future" && inst.expiry) {
        const spot = under[last] * (inst.underlying_scale ?? 1);
        const t = Math.max(daysBetween(asOf, inst.expiry), 1) / 365;
        row.basis = price - spot;
        row.rollYieldAnnual = -(price / spot - 1) / t;
        row.structure = price >= spot ? "contango" : "backwardation";
      }
      if (inst.kind === "option" && inst.expiry && inst.strike) {
        const type = inst.option_type ?? "put";
        const rf = m.riskFreeRate;
        const T = (idx: number) => daysBetween(prices.dates[idx], inst.expiry!) / 365;
        const at = (idx: number) => ({
          spot: under[idx], strike: inst.strike!, t: T(idx), rate: rf, type,
        });
        const iv = impliedVol(price, at(last));
        const realised = annualVol(dailyReturns(under.slice(Math.max(0, last - 20), last + 1)));
        row.optionType = type;
        row.strike = inst.strike;
        row.impliedVol = iv;
        row.modelPrice = bsPrice({ ...at(last), vol: Math.max(realised, 0.08) });
        if (!Number.isNaN(iv)) {
          row.greeks = bsGreeks({ ...at(last), vol: iv });
          const prev = last - 1;
          const ivPrev = impliedVol(prices.closes[pos.ticker][prev], at(prev));
          if (!Number.isNaN(ivPrev)) {
            const g = bsGreeks({ ...at(prev), vol: ivPrev });
            const size = pos.qty * pos.multiplier;
            const days = daysBetween(prices.dates[prev], prices.dates[last]);
            const total = size * (price - prices.closes[pos.ticker][prev]);
            const d = size * g.delta * (under[last] - under[prev]);
            const th = size * g.theta * days;
            const v = size * g.vega * (iv - ivPrev) * 100;
            row.attribution = { total, delta: d, theta: th, vega: v, other: total - d - th - v };
          }
        }
      }
    }
    paper.push(row);
  }

  real.sort((a, b) => b.weight - a.weight);

  // ---- chart markers ------------------------------------------------------
  const eventMap = (book: "real" | "paper"): ChartEvent[] => {
    const byDate = new Map<string, string[]>();
    for (const t of ledger) {
      if (t.book !== book || !["buy", "sell"].includes(t.action) || t.date <= launch) continue;
      byDate.set(t.date, [...(byDate.get(t.date) ?? []), `${t.action === "buy" ? "Buy" : "Sell"} ${t.ticker}`]);
    }
    return [...byDate.entries()].map(([date, labels]) => ({
      date,
      label: labels.length > 2 ? "Rebalance" : labels.join(", "),
    }));
  };

  const fundRets = dailyReturns(fundIndex);
  const spyRets = dailyReturns(spyIndex);

  return {
    meta: m,
    dummy: usingDummyPrices(),
    asOf,
    launch,
    nav,
    navCombined: tl.combinedNav[n - 1],
    fundReturn: fundIndex[n - 1] / 100 - 1,
    combinedReturn: combinedIndex[n - 1] / 100 - 1,
    spyReturn: spyIndex[n - 1] / 100 - 1,
    dates: tl.dates,
    fundIndex,
    combinedIndex,
    spyIndex,
    tl,
    closes: Object.fromEntries(Object.entries(prices.closes).map(([k, v]) => [k, v.slice(offset)])),
    real,
    paper,
    cash: tl.cash[n - 1],
    research: docs,
    team: team(),
    votes: voteRows,
    instruments: imap,
    events: { real: eventMap("real"), paper: eventMap("paper") },
    fundSharpe: fundRets.length >= 20 ? sharpe(fundRets, m.riskFreeRate) : undefined,
    spySharpe: fundRets.length >= 20 ? sharpe(spyRets, m.riskFreeRate) : undefined,
    fullCloses: prices.closes,
    allDates: prices.dates,
  };
});

// ---------------------------------------------------------------------------
// View-dependent selections
// ---------------------------------------------------------------------------

/** Home-page lists only show positions we have published research on. */
export const hasActiveResearch = (r: HoldingRow): boolean => r.research?.status === "published";

/** What the winners/losers grid ranks, by view. */
export function rankedRows(d: FundData, view: View): HoldingRow[] {
  const real = d.real;
  const paperScaled: HoldingRow[] = d.paper.map((p) => ({
    ...p,
    pnl: p.scaledPnl,
    returnPct: p.returnPct,
  }));
  const paperOwn: HoldingRow[] = d.paper.map((p) => ({ ...p, returnPct: p.returnOnMargin }));
  const rows = view === "real" ? real : view === "combined" ? [...real, ...paperScaled] : paperOwn;
  return rows.filter(hasActiveResearch).sort((a, b) => b.returnPct - a.returnPct);
}

export interface Allocation {
  slices: { label: string; value: number }[];
  assets: { ticker: string; weight: number; riskShare: number; vol: number }[];
  corr: { tickers: string[]; matrix: number[][] };
  portfolioVol: number;
  weightedAvgVol: number;
  diversificationBenefit: number;
  sharpe?: number;
  spySharpe?: number;
  note: string;
}

export function allocation(d: FundData, view: View): Allocation {
  interface A { ticker: string; weight: number; rets: number[]; cls: string }
  const assets: A[] = [];
  const sliceMap = new Map<string, number>();
  const add = (k: string, v: number) => sliceMap.set(k, (sliceMap.get(k) ?? 0) + v);

  const retsFor = (ticker: string, sign = 1): number[] => {
    // Asset-level risk uses the last ~6 months of closes, including days before launch.
    return dailyReturns(d.fullCloses[ticker].slice(-126)).map((r) => r * sign);
  };

  if (view !== "paper") {
    for (const r of d.real) {
      assets.push({ ticker: r.ticker, weight: r.weight, rets: retsFor(r.ticker), cls: r.assetClass });
      add(r.assetClass, r.weight);
    }
    if (d.cash > 0.005) add("Cash", d.cash / d.nav);
  }
  if (view === "combined") {
    for (const p of d.paper) {
      if (!p.slice) continue;
      const w = p.slice / d.nav;
      assets.push({ ticker: p.ticker, weight: w, rets: retsFor(p.ticker, Math.sign(p.qty) || 1), cls: "Derivatives" });
      add("Derivatives (scaled)", w);
    }
  }
  if (view === "paper") {
    const total = d.paper.reduce((s, p) => s + p.notional, 0) || 1;
    for (const p of d.paper) {
      const w = p.notional / total;
      assets.push({ ticker: p.ticker, weight: w, rets: retsFor(p.ticker, Math.sign(p.qty) || 1), cls: "Derivatives" });
      add(p.ticker, w);
    }
  }

  assets.sort((a, b) => b.weight - a.weight);
  const rb = riskBreakdown(assets.map((a) => a.weight), assets.map((a) => a.rets));
  return {
    slices: [...sliceMap.entries()].map(([label, value]) => ({ label, value })),
    assets: assets.map((a, i) => ({
      ticker: a.ticker, weight: a.weight, riskShare: rb.riskShare[i], vol: rb.vols[i],
    })),
    corr: { tickers: assets.map((a) => a.ticker), matrix: rb.corr },
    portfolioVol: rb.portfolioVol,
    weightedAvgVol: rb.weightedAvgVol,
    diversificationBenefit: rb.diversificationBenefit,
    sharpe: view === "paper" ? undefined : view === "combined" ? (d.combinedIndex.length > 20 ? sharpe(dailyReturns(d.combinedIndex), d.meta.riskFreeRate) : undefined) : d.fundSharpe,
    spySharpe: view === "paper" ? undefined : d.spySharpe,
    note:
      view === "paper"
        ? "Exposure is notional (price × multiplier), not capital."
        : view === "combined"
          ? "Includes paper derivatives, scaled to position size."
          : "Weights and risk contribution of real holdings.",
  };
}

// ---------------------------------------------------------------------------
// Research helpers
// ---------------------------------------------------------------------------

export interface ResearchCard {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  method: string;
  status: "published" | "in-progress";
  author: string;
  updated: string;
  thesis: string;
  fairValue?: number;
  price?: number;
  upside?: number;
  verdict: Verdict;
  held: boolean;
}

export function researchCards(d: FundData): ResearchCard[] {
  return [...d.research.values()].map(({ front }) => {
    const series = d.closes[front.ticker];
    const price = series?.[series.length - 1];
    const verdict = computeVerdict(d.votes, front.ticker, front.author).verdict;
    const pub = front.status === "published";
    return {
      ticker: front.ticker,
      name: front.name,
      assetClass: front.assetClass,
      method: front.method,
      status: front.status,
      author: front.author,
      updated: front.updated,
      thesis: front.thesis,
      fairValue: pub ? front.fairValue : undefined,
      price,
      upside: pub && front.fairValue && price ? front.fairValue / price - 1 : undefined,
      verdict,
      held: [...d.real, ...d.paper].some((h) => h.ticker === front.ticker),
    };
  });
}

