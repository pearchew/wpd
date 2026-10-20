import type { Instrument } from "./schemas";

/**
 * The instruments.csv rules `npm run validate` enforces, as a pure function so the add-asset form
 * can run the same checks before anything is committed.
 */
export function checkInstruments(inst: Instrument[], benchmark?: string): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const i of inst) {
    if (seen.has(i.ticker)) errors.push(`instruments.csv: duplicate ticker ${i.ticker}`);
    seen.add(i.ticker);
    if (i.kind === "future" && !(i.underlying && i.expiry && i.margin)) {
      errors.push(`instruments.csv: future ${i.ticker} needs underlying, expiry and margin`);
    }
    if (i.kind === "option" && !(i.underlying && i.expiry && i.strike && i.option_type)) {
      errors.push(`instruments.csv: option ${i.ticker} needs underlying, expiry, strike and option_type`);
    }
    if (i.underlying && !inst.some((x) => x.ticker === i.underlying)) {
      errors.push(`instruments.csv: ${i.ticker} underlying ${i.underlying} is not an instrument`);
    }
  }
  if (benchmark && !seen.has(benchmark)) errors.push(`meta.json: benchmark ${benchmark} is not in instruments.csv`);
  return errors;
}
