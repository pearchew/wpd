/** Black-Scholes pricing, Greeks and implied volatility. */

export type OptionType = "call" | "put";

const SQRT_2PI = Math.sqrt(2 * Math.PI);
export const pdf = (x: number): number => Math.exp(-0.5 * x * x) / SQRT_2PI;

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
export function cdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const c = 1 - pdf(x) * poly;
  return x >= 0 ? c : 1 - c;
}

export interface BsInput {
  spot: number;
  strike: number;
  /** years to expiry */
  t: number;
  rate: number;
  vol: number;
  type: OptionType;
  /** continuous dividend yield */
  q?: number;
}

function d1d2({ spot, strike, t, rate, vol, q = 0 }: BsInput) {
  const sd = vol * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (rate - q + 0.5 * vol * vol) * t) / sd;
  return { d1, d2: d1 - sd };
}

export function bsPrice(i: BsInput): number {
  const { spot, strike, t, rate, type, q = 0 } = i;
  if (t <= 0) return Math.max(type === "call" ? spot - strike : strike - spot, 0);
  const { d1, d2 } = d1d2(i);
  const df = Math.exp(-rate * t);
  const fq = Math.exp(-q * t);
  return type === "call"
    ? spot * fq * cdf(d1) - strike * df * cdf(d2)
    : strike * df * cdf(-d2) - spot * fq * cdf(-d1);
}

export interface Greeks {
  delta: number;
  /** per calendar day, per share */
  theta: number;
  /** per 1 vol point (0.01), per share */
  vega: number;
}

export function bsGreeks(i: BsInput): Greeks {
  const { spot, strike, t, rate, vol, type, q = 0 } = i;
  if (t <= 0) return { delta: 0, theta: 0, vega: 0 };
  const { d1, d2 } = d1d2(i);
  const df = Math.exp(-rate * t);
  const fq = Math.exp(-q * t);
  const delta = type === "call" ? fq * cdf(d1) : -fq * cdf(-d1);
  const decay = -(spot * fq * pdf(d1) * vol) / (2 * Math.sqrt(t));
  const thetaYear =
    type === "call"
      ? decay - rate * strike * df * cdf(d2) + q * spot * fq * cdf(d1)
      : decay + rate * strike * df * cdf(-d2) - q * spot * fq * cdf(-d1);
  return { delta, theta: thetaYear / 365, vega: (spot * fq * pdf(d1) * Math.sqrt(t)) / 100 };
}

/** Bisection implied vol; returns NaN when the price is outside no-arbitrage bounds. */
export function impliedVol(price: number, i: Omit<BsInput, "vol">): number {
  let lo = 0.01;
  let hi = 3;
  if (price < bsPrice({ ...i, vol: lo }) || price > bsPrice({ ...i, vol: hi })) return NaN;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    if (bsPrice({ ...i, vol: mid }) > price) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
