/** Daily closes for every instrument, aligned to one shared list of trading dates. */
export interface PriceBook {
  /** ascending trading dates */
  dates: string[];
  /** ticker → close per date index (forward-filled; NaN before the first quote) */
  closes: Record<string, number[]>;
  /** pair like "GBPUSD" → rate per date index */
  fx: Record<string, number[]>;
  source: "dummy" | "supabase";
}

export interface PriceStore {
  load(from: string): Promise<PriceBook>;
}
