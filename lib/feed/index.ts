/** One interface in front of whichever free price API we end up using. */
export interface FeedClose {
  symbol: string;
  date: string;
  close: number;
}

export interface PriceFeed {
  /** Daily closes for each symbol: the latest `days` trading days (default 5). */
  fetchCloses(symbols: string[], days?: number): Promise<FeedClose[]>;
  /** This provider's symbol for the rate of one `base` in `quote`, e.g. JPYUSD=X or JPY/USD. */
  fxSymbol(base: string, quote: string): string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Yahoo Finance's chart endpoint: no key, and it covers Jakarta (BMRI.JK), Korea (042660.KS),
 * COMEX contracts (MGCZ26.CMX, HGZ26.CMX), OCC option codes and FX (IDRUSD=X).
 * It is unofficial and can change or throttle without notice, so symbols go one at a time
 * with a short pause, and a symbol that fails is left out (the job reports it as missing).
 */
export class YahooFeed implements PriceFeed {
  constructor(private pauseMs = 400) {}

  fxSymbol(base: string, quote: string): string {
    return `${base}${quote}=X`;
  }

  async fetchCloses(symbols: string[], days = 5): Promise<FeedClose[]> {
    const out: FeedClose[] = [];
    let lastError: string | undefined;
    let failed = 0;
    // Calendar days that hold `days` trading days, with room for holidays.
    const span = Math.ceil(days * 1.5) + 7;
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - span * 86_400;
    for (const [i, symbol] of symbols.entries()) {
      if (i > 0) await sleep(this.pauseMs);
      const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
      url.searchParams.set("period1", String(period1));
      url.searchParams.set("period2", String(period2));
      url.searchParams.set("interval", "1d");
      try {
        const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (WDP Fund daily prices)" } });
        if (res.status === 404) continue; // unknown symbol: reported as missing by the job
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        out.push(...parseYahooChart(symbol, await res.json()).slice(-days));
      } catch (e) {
        failed++;
        lastError = `${symbol}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    // One bad symbol is reported as missing; every symbol failing means Yahoo is blocking us.
    if (symbols.length && failed === symbols.length) throw new Error(`Yahoo Finance failed for every symbol (last: ${lastError})`);
    return out;
  }
}

interface YahooChart {
  chart?: {
    result?: {
      meta?: { gmtoffset?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[] | null;
  };
}

/** One chart response → daily closes, dated in the exchange's own time zone. Empty bars are skipped. */
export function parseYahooChart(symbol: string, json: unknown): FeedClose[] {
  const r = (json as YahooChart).chart?.result?.[0];
  const stamps = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const offset = r?.meta?.gmtoffset ?? 0;
  const byDate = new Map<string, number>();
  stamps.forEach((ts, i) => {
    const close = closes[i];
    if (close === null || close === undefined || !Number.isFinite(close)) return;
    byDate.set(new Date((ts + offset) * 1000).toISOString().slice(0, 10), close);
  });
  return [...byDate].map(([date, close]) => ({ symbol, date, close }));
}

/**
 * Twelve Data. The free plan allows 8 credits a minute and one credit per
 * symbol, so symbols go in batches of 8 with a pause between batches.
 * Check that it covers every ticker (especially futures and options) before relying on it.
 */
export class TwelveDataFeed implements PriceFeed {
  constructor(private apiKey: string, private batch = 8, private pauseMs = 61_000) {}

  fxSymbol(base: string, quote: string): string {
    return `${base}/${quote}`;
  }

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

/** Yahoo by default; PRICE_FEED=twelvedata (with PRICE_API_KEY) switches back. */
export function getFeed(): PriceFeed {
  if (process.env.PRICE_FEED !== "twelvedata") return new YahooFeed();
  const key = process.env.PRICE_API_KEY;
  if (!key) throw new Error("PRICE_FEED=twelvedata needs PRICE_API_KEY");
  return new TwelveDataFeed(key);
}
