import type { PriceBook } from "../prices/types";
import type { Instrument, Meta, Trade } from "../schemas";

/**
 * Turns the trade ledger plus daily closes into holdings, cash, NAV and the
 * paper-book numbers. Holdings are never stored: they are always replayed
 * from trades.csv.
 */

export type Book = "real" | "paper";

export interface Position {
  ticker: string;
  book: Book;
  multiplier: number;
  /** signed quantity (shares, or contracts for derivatives) */
  qty: number;
  /** average entry price of the open quantity, fees included */
  avg: number;
  /** realised P&L in reporting currency, multiplier applied */
  realized: number;
  dividends: number;
  firstDate: string;
  /** largest absolute quantity ever held */
  peakQty: number;
  /** Combined view: paper $ P&L × scale = P&L of the fund's notional slice */
  scale?: number;
  /** $ of the fund this paper position represents (Combined view) */
  slice?: number;
  /** first entry price, for % moves */
  entryPrice: number;
}

export interface Flow {
  date: string;
  amount: number;
}

export interface LedgerResult {
  positions: Map<string, Position>;
  cash: number;
}

export interface Ctx {
  instruments: Map<string, Instrument>;
  prices: PriceBook;
  meta: Meta;
}

export const instrumentMap = (list: Instrument[]) => new Map(list.map((i) => [i.ticker, i]));

export function dateIndexOnOrBefore(dates: string[], date: string): number {
  let lo = 0;
  let hi = dates.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] <= date) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function fxRate(ctx: Ctx, ccy: string, i: number): number {
  const rep = ctx.meta.reportingCurrency;
  if (ccy === rep) return 1;
  const series = ctx.prices.fx[`${ccy}${rep}`];
  const r = series?.[i];
  if (r === undefined || Number.isNaN(r)) throw new Error(`no ${ccy}${rep} fx rate for ${ctx.prices.dates[i]}`);
  return r;
}

export function priceAt(ctx: Ctx, ticker: string, i: number): number {
  const p = ctx.prices.closes[ticker]?.[i];
  if (p === undefined || Number.isNaN(p)) {
    throw new Error(`no price for ${ticker} on ${ctx.prices.dates[i] ?? i}`);
  }
  return p;
}

const sortTrades = (trades: Trade[]) =>
  trades
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t.date.localeCompare(b.t.date) || a.i - b.i)
    .map((x) => x.t);

/** Mutates `state`: applies one ledger row. */
export function applyTrade(state: LedgerResult, t: Trade, ctx: Ctx, dayIdx: number): void {
  const inst = ctx.instruments.get(t.ticker);
  const fx = fxRate(ctx, t.currency, dayIdx);
  const shares = t.shares ?? 0;
  const price = t.price ?? 0;
  const fees = t.fees * fx;

  switch (t.action) {
    case "deposit":
      if (t.book === "real") state.cash += price * fx;
      return;
    case "withdrawal":
      if (t.book === "real") state.cash -= price * fx;
      return;
    case "fee":
      if (t.book === "real") state.cash -= price * fx;
      return;
    case "dividend": {
      const amount = (t.shares ? shares * price : price) * fx;
      if (t.book === "real") state.cash += amount;
      const pos = state.positions.get(`${t.book}:${t.ticker}`);
      if (pos) pos.dividends += amount;
      return;
    }
    case "split": {
      const pos = state.positions.get(`${t.book}:${t.ticker}`);
      if (pos && shares > 0) {
        pos.qty *= shares;
        pos.avg /= shares;
        pos.peakQty *= shares;
        pos.entryPrice /= shares;
      }
      return;
    }
    case "buy":
    case "sell": {
      const mult = inst?.multiplier ?? 1;
      const signed = t.action === "buy" ? shares : -shares;
      const key = `${t.book}:${t.ticker}`;
      let pos = state.positions.get(key);
      if (!pos) {
        pos = {
          ticker: t.ticker, book: t.book, multiplier: mult, qty: 0, avg: 0, realized: 0,
          dividends: 0, firstDate: t.date, peakQty: 0, entryPrice: price * fx,
        };
        state.positions.set(key, pos);
      }
      if (t.book === "real") state.cash += -signed * price * mult * fx - fees;

      const px = price * fx;
      const sameSide = pos.qty === 0 || Math.sign(pos.qty) === Math.sign(signed);
      if (sameSide) {
        const total = Math.abs(pos.qty) + Math.abs(signed);
        pos.avg = (Math.abs(pos.qty) * pos.avg + Math.abs(signed) * px + fees / mult) / total;
        if (pos.qty === 0) pos.entryPrice = px;
        pos.qty += signed;
        if (t.book === "paper" && t.notional_slice && pos.scale === undefined) {
          pos.slice = t.notional_slice;
          pos.scale = t.notional_slice / (Math.abs(signed) * mult * px);
        }
      } else {
        const closing = Math.min(Math.abs(signed), Math.abs(pos.qty));
        pos.realized += Math.sign(pos.qty) * closing * mult * (px - pos.avg) - fees;
        pos.qty += signed;
        if (pos.qty === 0) pos.avg = 0;
        else if (Math.sign(pos.qty) === Math.sign(signed)) pos.avg = px; // flipped sides
      }
      pos.peakQty = Math.max(pos.peakQty, Math.abs(pos.qty));
      return;
    }
  }
}

export function positionValue(pos: Position, price: number): number {
  return pos.qty * pos.multiplier * price;
}

/** Raw $ P&L (realised + unrealised) of a position, multiplier applied. */
export function positionPnl(pos: Position, price: number): number {
  return pos.realized + pos.qty * pos.multiplier * (price - pos.avg);
}

export interface Timeline {
  dates: string[];
  cash: number[];
  realNav: number[];
  /** external deposits minus withdrawals landing on each day */
  flows: number[];
  /** Σ scaled paper P&L, added to realNav for the Combined view */
  overlay: number[];
  combinedNav: number[];
  paper: {
    pnl: number[];
    /** cumulative margin / premium posted */
    base: number[];
    equity: number[];
    notional: number[];
    pnlByTicker: Record<string, number[]>;
    callDays: Record<string, string[]>;
    anyCallDays: string[];
  };
  /** final ledger state */
  final: LedgerResult;
}

export function firstTradeDate(trades: Trade[]): string {
  return trades.map((t) => t.date).sort()[0];
}

export function buildTimeline(trades: Trade[], ctx: Ctx, launch: string): Timeline {
  const all = sortTrades(trades);
  const dates = ctx.prices.dates.filter((d) => d >= launch);
  const offset = ctx.prices.dates.length - dates.length;
  const state: LedgerResult = { positions: new Map(), cash: 0 };

  const tl: Timeline = {
    dates, cash: [], realNav: [], flows: [], overlay: [], combinedNav: [],
    paper: {
      pnl: [], base: [], equity: [], notional: [], pnlByTicker: {}, callDays: {}, anyCallDays: [],
    },
    final: state,
  };

  let next = 0;
  let marginPosted = 0;
  const postedFor = new Set<string>();

  dates.forEach((date, k) => {
    const gi = k + offset; // index into the global price book
    let flow = 0;
    while (next < all.length && all[next].date <= date) {
      const t = all[next++];
      // Rows dated before the launch (if any) fold into the first day.
      applyTrade(state, t, ctx, gi);
      if (t.book === "real" && t.action === "deposit") flow += (t.price ?? 0) * fxRate(ctx, t.currency, gi);
      if (t.book === "real" && t.action === "withdrawal") flow -= (t.price ?? 0) * fxRate(ctx, t.currency, gi);
      if (t.book === "paper" && t.action === "buy") {
        const inst = ctx.instruments.get(t.ticker);
        const key = `${t.ticker}@${t.date}`;
        if (inst && !postedFor.has(key)) {
          postedFor.add(key);
          const q = t.shares ?? 0;
          marginPosted +=
            inst.kind === "future"
              ? q * (inst.margin ?? 0)
              : q * inst.multiplier * (t.price ?? 0) * fxRate(ctx, t.currency, gi);
        }
      }
    }

    let invested = 0;
    let rawPnl = 0;
    let scaled = 0;
    let notional = 0;
    let call = false;

    for (const pos of state.positions.values()) {
      const inst = ctx.instruments.get(pos.ticker);
      const px = pos.qty === 0 && pos.book === "real" ? 0 : priceAt(ctx, pos.ticker, gi);
      const fx = inst ? fxRate(ctx, inst.currency, gi) : 1;
      if (pos.book === "real") {
        invested += positionValue(pos, px * fx);
        continue;
      }
      const pnl = positionPnl(pos, px * fx);
      rawPnl += pnl;
      notional += Math.abs(pos.qty) * pos.multiplier * px * fx;
      (tl.paper.pnlByTicker[pos.ticker] ??= []).push(pnl);

      if (pos.scale !== undefined) scaled += pnl * pos.scale;
      else if (inst?.kind === "option" && inst.underlying) {
        const u = state.positions.get(`real:${inst.underlying}`);
        const perShare = pnl / (pos.peakQty * pos.multiplier);
        scaled += perShare * (u?.qty ?? 0);
      }

      if (inst?.kind === "future" && pos.qty !== 0) {
        const initial = Math.abs(pos.qty) * (inst.margin ?? 0);
        const maint = Math.abs(pos.qty) * (inst.maint_margin ?? inst.margin ?? 0);
        const unrealised = pos.qty * pos.multiplier * (px * fx - pos.avg);
        if (initial + unrealised < maint) {
          (tl.paper.callDays[pos.ticker] ??= []).push(date);
          call = true;
        }
      }
    }
    // Keep per-ticker series aligned even for tickers opened later.
    for (const [tk, arr] of Object.entries(tl.paper.pnlByTicker)) {
      while (arr.length < k + 1) arr.unshift(0);
    }

    tl.cash.push(state.cash);
    tl.realNav.push(state.cash + invested);
    tl.flows.push(flow);
    tl.overlay.push(scaled);
    tl.combinedNav.push(state.cash + invested + scaled);
    tl.paper.pnl.push(rawPnl);
    tl.paper.base.push(marginPosted);
    tl.paper.equity.push(marginPosted + rawPnl);
    tl.paper.notional.push(notional);
    if (call) tl.paper.anyCallDays.push(date);
  });

  return tl;
}

/**
 * Time-weighted return index (100 at the first day with capital), so deposits
 * and withdrawals never look like performance.
 */
export function twrIndex(nav: number[], flows: number[]): number[] {
  const out: number[] = [];
  let level = 100;
  let started = false;
  for (let i = 0; i < nav.length; i++) {
    if (!started) {
      if (nav[i] > 0) started = true;
      out.push(100);
      continue;
    }
    const prev = nav[i - 1];
    if (prev > 0) level *= (nav[i] - flows[i]) / prev;
    out.push(level);
  }
  return out;
}

export const indexTo100 = (series: number[]): number[] => series.map((v) => (v / series[0]) * 100);

export function dailyReturns(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) out.push(series[i] / series[i - 1] - 1);
  return out;
}
