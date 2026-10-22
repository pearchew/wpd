/**
 * One-off history load. The daily job only fetches the last few days, so run
 * this once after creating the tables to fill in everything since launch.
 *
 *   npm run db:backfill            # history from 30 days before launch to today
 *   npm run db:backfill -- 400     # or a specific number of trading days
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Prices come from Yahoo Finance
 * (no key); with PRICE_FEED=twelvedata it uses Twelve Data, whose free plan allows 8 symbols a minute.
 */
import { createClient } from "@supabase/supabase-js";
import { firstTradeDate } from "../lib/calc/ledger";
import { instruments, meta, trades } from "../lib/data";
import { getFeed } from "../lib/feed";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first (see .env.example).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const m = meta();
const list = instruments();
const ledger = trades();
const launch =
  m.launchDate ?? (ledger.length ? firstTradeDate(ledger) : new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10));
// ~30 days of history before launch gives the risk numbers something to start from
const defaultDays = Math.ceil(((Date.now() - Date.parse(launch)) / 86_400_000) * (5 / 7)) + 25;
const days = Number(process.argv[2]) || defaultDays;

const fxPairs = [...new Set(list.map((i) => i.currency).filter((c) => c !== m.reportingCurrency))];
const feed = getFeed();
const fxSym = (c: string) => feed.fxSymbol(c, m.reportingCurrency);
const symbols = [...new Set([...list.map((i) => i.feed_symbol), ...fxPairs.map(fxSym)])];
console.log(`Fetching ${days} trading days for ${symbols.length} symbols...`);

const closes = await feed.fetchCloses(symbols, days);

const priceRows = list.flatMap((i) =>
  closes.filter((c) => c.symbol === i.feed_symbol).map((c) => ({ date: c.date, ticker: i.ticker, close: c.close, adj_close: null, currency: i.currency })),
);
const fxRows = fxPairs.flatMap((ccy) =>
  closes.filter((c) => c.symbol === fxSym(ccy)).map((c) => ({ date: c.date, pair: `${ccy}${m.reportingCurrency}`, rate: c.close })),
);

async function upsert(table: string, rows: object[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`✓ ${table}: ${rows.length} rows`);
}

await upsert("prices", priceRows, "date,ticker");
if (fxRows.length) await upsert("fx", fxRows, "date,pair");

const missing = list.filter((i) => !priceRows.some((r) => r.ticker === i.ticker)).map((i) => i.ticker);
if (missing.length) console.log(`\n✗ No data returned for: ${missing.join(", ")}\n  Check their feed_symbol in data/instruments.csv, or whether your price API covers them.`);
