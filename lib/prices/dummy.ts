import { bsPrice } from "../calc/options";
import { daysBetween, lastTradingDayOnOrBefore, toISO, tradingDays } from "../dates";
import type { Instrument } from "../schemas";
import type { PriceBook } from "./types";

/**
 * Deterministic fake market data, used until Supabase is plugged in.
 *
 * Every series is a seeded random walk driven by two shared factors (equity
 * market, rates), so correlations look believable. Each series starts on
 * DUMMY_START and never depends on the end date, so extending the end date
 * only appends new days and old prices never change.
 */
export const DUMMY_START = "2026-06-01";
/** Bump to get a different (but still deterministic) fake market. */
const seed = (): string => process.env.DUMMY_SEED ?? "s156";
const RATE = 0.04;
const SIGMA_MARKET = 0.16;
const SIGMA_RATES = 0.065;

interface Params {
  s0: number;
  mu: number;
  betaM: number;
  betaR: number;
  idio: number;
}

const P = (s0: number, mu: number, betaM: number, betaR: number, idio: number): Params => ({
  s0, mu, betaM, betaR, idio,
});

const STOCK_PARAMS: Record<string, Params> = {
  SPY: P(650, 0.09, 1.0, 0, 0.008),
  MSFT: P(515, 0.14, 1.1, 0, 0.14),
  NVDA: P(185, 0.3, 1.5, 0, 0.3),
  JPM: P(290, 0.1, 1.0, 0, 0.15),
  NEE: P(82, -0.02, 0.45, 0.55, 0.16),
  JNJ: P(160, 0.06, 0.4, 0, 0.12),
  CAT: P(410, 0.1, 1.2, 0, 0.18),
  COST: P(960, 0.1, 0.7, 0, 0.14),
  XOM: P(112, 0.1, 0.6, 0, 0.17),
  GLD: P(310, 0.16, -0.05, 0.9, 0.12),
  IEF: P(96, 0.04, -0.05, 1.0, 0.012),
  LQD: P(108, 0.045, 0.1, 1.05, 0.025),
  USO: P(72, 0.02, 0.5, 0, 0.3),
};

const FUTURE_CARRY: Record<string, { yield: number; scale: number }> = {
  // futures = underlying × scale × e^{(r − yield)·T}; a high convenience yield gives backwardation
  MES: { yield: 0.013, scale: 10 },
  MCL: { yield: 0.09, scale: 1 },
};

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normals(seed: string, n: number): number[] {
  const r = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = Math.max(r(), 1e-12);
    out.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()));
  }
  return out;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** The last trading day we should have data for, today's date unless overridden. */
export function dummyEndDate(): string {
  return lastTradingDayOnOrBefore(process.env.DUMMY_AS_OF ?? toISO(new Date()));
}

export function generateDummyBook(
  instruments: Instrument[],
  end: string = dummyEndDate(),
): PriceBook {
  const dates = tradingDays(DUMMY_START, end);
  const n = dates.length;
  const zM = normals(`${seed()}:factor:market`, n);
  const zR = normals(`${seed()}:factor:rates`, n);
  const dt = 1 / 252;

  const base: Record<string, number[]> = {};
  for (const [ticker, p] of Object.entries(STOCK_PARAMS)) {
    const z = normals(`${seed()}:idio:${ticker}`, n);
    const out: number[] = [];
    let price = p.s0;
    for (let i = 0; i < n; i++) {
      const ret =
        (p.mu - 0.5 * (p.betaM * SIGMA_MARKET) ** 2) * dt +
        p.betaM * SIGMA_MARKET * Math.sqrt(dt) * zM[i] +
        p.betaR * SIGMA_RATES * Math.sqrt(dt) * zR[i] +
        p.idio * Math.sqrt(dt) * z[i];
      if (i > 0) price *= Math.exp(ret);
      out.push(price);
    }
    base[ticker] = out;
  }

  const closes: Record<string, number[]> = {};
  const years = (i: number, expiry: string) => Math.max(daysBetween(dates[i], expiry), 0) / 365;

  for (const inst of instruments) {
    if (base[inst.ticker]) {
      closes[inst.ticker] = base[inst.ticker].map(round2);
    } else if (inst.kind === "future" && inst.underlying && inst.expiry) {
      const carry = FUTURE_CARRY[inst.ticker] ?? { yield: 0.02, scale: inst.underlying_scale ?? 1 };
      const under = base[inst.underlying];
      if (!under) throw new Error(`dummy data: no underlying series for ${inst.ticker}`);
      closes[inst.ticker] = under.map((s, i) =>
        round2(s * carry.scale * Math.exp((RATE - carry.yield) * years(i, inst.expiry!))),
      );
    } else if (inst.kind === "option" && inst.underlying && inst.expiry && inst.strike) {
      const under = base[inst.underlying];
      if (!under) throw new Error(`dummy data: no underlying series for ${inst.ticker}`);
      closes[inst.ticker] = under.map((s, i) => {
        // implied vol rises when the underlying falls, with a little noise
        const iv = Math.min(0.45, Math.max(0.1, 0.17 - 0.9 * (s / under[0] - 1) + 0.01 * Math.sin(i / 3)));
        return round2(
          bsPrice({
            spot: s, strike: inst.strike!, t: years(i, inst.expiry!), rate: RATE, vol: iv,
            type: inst.option_type ?? "put",
          }),
        );
      });
    } else {
      throw new Error(`dummy data: don't know how to price ${inst.ticker}`);
    }
  }

  return { dates, closes, fx: {}, source: "dummy" };
}
