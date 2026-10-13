/**
 * Confirms the Supabase project is wired up: tables exist, how much data is
 * in them, and whether every instrument has recent closes.
 *
 *   npm run db:check
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { instruments } from "../lib/data";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first (see .env.example).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let failed = false;
for (const table of ["prices", "fx", "nav_snapshots", "job_runs"]) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) {
    failed = true;
    console.log(`✗ ${table}: ${error.message}${error.code === "42P01" ? " (run supabase/schema.sql)" : ""}`);
  } else {
    console.log(`✓ ${table}: ${count} rows`);
  }
}

if (!failed) {
  const { data } = await db.from("prices").select("ticker,date").order("date", { ascending: false }).limit(5000);
  const latest = new Map<string, string>();
  for (const r of data ?? []) if (!latest.has(r.ticker)) latest.set(r.ticker, r.date);
  console.log("\nLatest close per instrument:");
  for (const i of instruments()) {
    console.log(`  ${latest.has(i.ticker) ? "✓" : "✗"} ${i.ticker.padEnd(16)} ${latest.get(i.ticker) ?? "no prices (run npm run db:backfill)"}`);
  }
  const { data: runs } = await db.from("job_runs").select("date,status,error").order("id", { ascending: false }).limit(3);
  if (runs?.length) console.log("\nLast job runs:", runs.map((r) => `${r.date} ${r.status}${r.error ? ` (${r.error})` : ""}`).join(" | "));
}
process.exit(failed ? 1 : 0);
