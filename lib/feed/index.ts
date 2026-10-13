/** One interface in front of whichever free price API we end up using. */
export interface FeedClose {
  symbol: string;
  date: string;
  close: number;
}

export interface PriceFeed {
  /** Daily closes for each symbol: the latest `days` trading days (default 5). */
  fetchCloses(symbols: string[], days?: number): Promise<FeedClose[]>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Twelve Data. The free plan allows 8 credits a minute and one credit per
 * symbol, so symbols go in batches of 8 with a pause between batches.
 * Check that it covers every ticker (especially futures and options) before relying on it.
 */
export class TwelveDataFeed implements PriceFeed {
  constructor(private apiKey: string, private batch = 8, private pauseMs = 61_000) {}

  async fetchCloses(symbols: string[], days = 5): Promise<FeedClose[]> {
    const out: FeedClose[] = [];
    for (let i = 0; i < symbols.length; i += this.batch) {
      if (i > 0) await sleep(this.pauseMs);
      const group = symbols.slice(i, i + this.batch);
      const url = new URL("https://api.twelvedata.com/time_series");
      url.searchParams.set("symbol", group.join(","));
      url.searchParams.set("interval", "1day");
      url.searchParams.set("outputsize", String(days));
      url.searchParams.set("apikey", this.apiKey);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
      const json = (await res.json()) as Record<string, unknown>;
      // One symbol returns the series itself; several return { SYMBOL: series }.
      const bySymbol: Record<string, TwelveSeries> = group.length === 1 ? { [group[0]]: json as TwelveSeries } : (json as Record<string, TwelveSeries>);
      for (const sym of group) {
        const s = bySymbol[sym];
        if (!s || s.status === "error" || !s.values) continue; // reported as stale by the job
        for (const v of s.values) out.push({ symbol: sym, date: v.datetime.slice(0, 10), close: Number(v.close) });
      }
    }
    return out;
  }
}

interface TwelveSeries {
  status?: string;
  values?: { datetime: string; close: string }[];
}

export function getFeed(): PriceFeed {
  const key = process.env.PRICE_API_KEY;
  if (!key) throw new Error("PRICE_API_KEY is not set");
  return new TwelveDataFeed(key);
}
