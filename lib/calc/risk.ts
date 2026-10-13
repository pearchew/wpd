const TRADING_DAYS = 252;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

export function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(-n));
  const mb = mean(b.slice(-n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[a.length - n + i] - ma) * (b[b.length - n + i] - mb);
  return s / (n - 1);
}

export const annualVol = (r: number[]): number => Math.sqrt(covariance(r, r) * TRADING_DAYS);

export function sharpe(dailyReturns: number[], riskFreeAnnual: number): number {
  const sd = Math.sqrt(covariance(dailyReturns, dailyReturns));
  if (!sd) return 0;
  return ((mean(dailyReturns) - riskFreeAnnual / TRADING_DAYS) / sd) * Math.sqrt(TRADING_DAYS);
}

export interface RiskBreakdown {
  vols: number[];
  corr: number[][];
  portfolioVol: number;
  weightedAvgVol: number;
  /** weighted-average asset vol minus portfolio vol (annualised) */
  diversificationBenefit: number;
  /** each asset's share of portfolio variance (sums to 1) */
  riskShare: number[];
}

/** `returns[i]` is asset i's daily return series; `weights` are fractions of NAV. */
export function riskBreakdown(weights: number[], returns: number[][]): RiskBreakdown {
  const n = weights.length;
  const cov = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => covariance(returns[i], returns[j]) * TRADING_DAYS),
  );
  const vols = cov.map((row, i) => Math.sqrt(row[i]));
  const corr = cov.map((row, i) => row.map((c, j) => (vols[i] && vols[j] ? c / (vols[i] * vols[j]) : 0)));

  const sigmaW = cov.map((row) => row.reduce((s, c, j) => s + c * weights[j], 0));
  const variance = weights.reduce((s, w, i) => s + w * sigmaW[i], 0);
  const portfolioVol = Math.sqrt(Math.max(variance, 0));
  const weightedAvgVol = weights.reduce((s, w, i) => s + Math.abs(w) * vols[i], 0);
  return {
    vols,
    corr,
    portfolioVol,
    weightedAvgVol,
    diversificationBenefit: weightedAvgVol - portfolioVol,
    riskShare: weights.map((w, i) => (variance ? (w * sigmaW[i]) / variance : 0)),
  };
}
