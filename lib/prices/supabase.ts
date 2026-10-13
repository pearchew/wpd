import { createClient } from "@supabase/supabase-js";
import type { PriceBook, PriceStore } from "./types";

/**
 * Reads the `prices` and `fx` tables written by the daily job (see
 * supabase/schema.sql). Uses the service-role key server-side only.
 */
export class SupabasePriceStore implements PriceStore {
  private db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  private async page<T>(table: string, cols: string, from: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.db
        .from(table)
        .select(cols)
        .gte("date", from)
        .order("date", { ascending: true })
        .range(offset, offset + 999);
      if (error) throw new Error(`supabase ${table}: ${error.message}`);
      rows.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  async load(from: string): Promise<PriceBook> {
    const [prices, fx] = await Promise.all([
      this.page<{ date: string; ticker: string; close: number }>("prices", "date,ticker,close", from),
      this.page<{ date: string; pair: string; rate: number }>("fx", "date,pair,rate", from),
    ]);
    const dates = [...new Set(prices.map((r) => r.date))].sort();
    const idx = new Map(dates.map((d, i) => [d, i]));
    const fill = (rows: { date: string; key: string; v: number }[]) => {
      const out: Record<string, number[]> = {};
      for (const r of rows) {
        (out[r.key] ??= new Array(dates.length).fill(NaN))[idx.get(r.date) ?? -1] = r.v;
      }
      for (const arr of Object.values(out)) {
        // carry the previous close forward over gaps (flagged in job_runs)
        for (let i = 1; i < arr.length; i++) if (Number.isNaN(arr[i])) arr[i] = arr[i - 1];
      }
      return out;
    };
    return {
      dates,
      closes: fill(prices.map((r) => ({ date: r.date, key: r.ticker, v: Number(r.close) }))),
      fx: fill(fx.map((r) => ({ date: r.date, key: r.pair, v: Number(r.rate) }))),
      source: "supabase",
    };
  }
}
