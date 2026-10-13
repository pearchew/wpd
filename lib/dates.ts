/** Small UTC-date helpers. Dates are always ISO `YYYY-MM-DD` strings. */

export const toISO = (d: Date): string => d.toISOString().slice(0, 10);
export const fromISO = (s: string): Date => new Date(`${s}T00:00:00Z`);

export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export const daysBetween = (a: string, b: string): number =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

/** US market holidays for 2026 (dummy-data calendar only; the real feed is the source of truth). */
const US_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
]);

export function isTradingDay(s: string): boolean {
  const dow = fromISO(s).getUTCDay();
  return dow !== 0 && dow !== 6 && !US_HOLIDAYS_2026.has(s);
}

/** Every trading day from `from` to `to`, inclusive. */
export function tradingDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (isTradingDay(d)) out.push(d);
  return out;
}

export function lastTradingDayOnOrBefore(s: string): string {
  let d = s;
  while (!isTradingDay(d)) d = addDays(d, -1);
  return d;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Nov 13" or "Nov 13, 2026" */
export function fmtDate(s: string, withYear = false): string {
  const d = fromISO(s);
  const base = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return withYear ? `${base}, ${d.getUTCFullYear()}` : base;
}

export function addMonthsISO(s: string, n: number): string {
  const d = fromISO(s);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toISO(d);
}
