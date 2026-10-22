import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { instruments, meta } from "@/lib/data";
import { getFeed } from "@/lib/feed";
import { getFundData } from "@/lib/fund";

/**
 * Daily job (Vercel cron, weekdays after the US close).
 * Fetches closes + FX, upserts them into Supabase, writes a NAV snapshot and
 * logs the run. Failures are logged and emailed to the owner.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const today = () => new Date().toISOString().slice(0, 10);

async function alert(subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  if (!key || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "WDP Fund <onboarding@resend.dev>", to: [to], subject, text }),
  }).catch(() => undefined);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase is not configured; the site is running on dummy data" }, { status: 503 });
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const runDate = today();

  try {
    const m = meta();
    const list = instruments();
    const feed = getFeed();

    const fxPairs = [...new Set(list.map((i) => i.currency).filter((c) => c !== m.reportingCurrency))];
    const fxSym = (c: string) => feed.fxSymbol(c, m.reportingCurrency);
    const symbols = [...new Set([...list.map((i) => i.feed_symbol), ...fxPairs.map(fxSym)])];
    const closes = await feed.fetchCloses(symbols);

    const priceRows = list.flatMap((i) =>
      closes
        .filter((c) => c.symbol === i.feed_symbol)
        .map((c) => ({ date: c.date, ticker: i.ticker, close: c.close, adj_close: null, currency: i.currency })),
    );
    const fxRows = fxPairs.flatMap((ccy) =>
      closes
        .filter((c) => c.symbol === fxSym(ccy))
        .map((c) => ({ date: c.date, pair: `${ccy}${m.reportingCurrency}`, rate: c.close })),
    );

    const missing = list.filter((i) => !priceRows.some((r) => r.ticker === i.ticker)).map((i) => i.ticker);

    if (priceRows.length) {
      const { error } = await db.from("prices").upsert(priceRows, { onConflict: "date,ticker" });
      if (error) throw new Error(`prices upsert: ${error.message}`);
    }
    if (fxRows.length) {
      const { error } = await db.from("fx").upsert(fxRows, { onConflict: "date,pair" });
      if (error) throw new Error(`fx upsert: ${error.message}`);
    }

    // Recompute from the stored closes so the snapshot matches what the site shows.
    const d = await getFundData();
    const last = d.dates.length - 1;
    const spy = d.closes[m.benchmark]?.[last] ?? null;
    const { error: navErr } = await db.from("nav_snapshots").upsert(
      [
        { date: d.asOf, book: "real", nav: d.nav, spy_close: spy, combined_nav: d.navCombined },
        { date: d.asOf, book: "paper", nav: d.tl.paper.equity[last], spy_close: spy, combined_nav: null },
      ],
      { onConflict: "date,book" },
    );
    if (navErr) throw new Error(`nav_snapshots upsert: ${navErr.message}`);

    const status = missing.length ? "partial" : "ok";
    const note = missing.length ? `no close for: ${missing.join(", ")} (previous close carried forward)` : null;
    await db.from("job_runs").insert({ date: runDate, status, error: note });
    if (missing.length) await alert("WDP Fund: daily job partial", note!);
    return NextResponse.json({ status, prices: priceRows.length, fx: fxRows.length, missing });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("job_runs").insert({ date: runDate, status: "failed", error: message });
    await alert("WDP Fund: daily job FAILED", message);
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
