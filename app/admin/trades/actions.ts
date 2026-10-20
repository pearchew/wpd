"use server";

import { revalidatePath } from "next/cache";
import { repoConfig } from "@/lib/admin/config";
import { changeBranch, commitToChange, readFiles } from "@/lib/admin/change";
import { requireSession } from "@/lib/admin/session";
import {
  ACTION_LABEL,
  TRADES_PREFIX,
  type TradeInput,
  appendTrades,
  parseInstruments,
  parseTrades,
  toTrade,
  tradeProblems,
} from "@/lib/admin/trades";
import { meta } from "@/lib/data";
import { getFundData } from "@/lib/fund";
import { toISO } from "@/lib/dates";
import type { Trade } from "@/lib/schemas";
import { checkLedger } from "@/lib/tradeChecks";

export type TradeSaveResult =
  | { ok: true; pr: { number: number; url: string } }
  | { ok: false; error: string; problems?: string[]; dryRun?: string };

const describe = (t: Trade) =>
  t.action === "buy" || t.action === "sell"
    ? `${ACTION_LABEL[t.action].toLowerCase()} ${t.shares} ${t.ticker}`
    : t.action === "split"
      ? `${t.ticker} ${t.shares}-for-1 split`
      : `${ACTION_LABEL[t.action].toLowerCase()} $${t.price}${t.ticker !== "CASH" ? ` ${t.ticker}` : ""}`;

/** Append trade rows to data/trades.csv in a pull request: the open trade change if there is one, else a new one. */
export async function saveTrades(inputs: TradeInput[], pr?: number): Promise<TradeSaveResult> {
  const session = await requireSession();
  if (!Array.isArray(inputs) || inputs.length === 0) return { ok: false, error: "Add at least one trade." };
  if (inputs.length > 50) return { ok: false, error: "Up to 50 trades at a time." };

  const cfg = repoConfig();
  const today = toISO(new Date());

  const branch = cfg && pr ? await changeBranch(cfg, TRADES_PREFIX, pr) : undefined;
  if (cfg && pr && !branch) return { ok: false, error: `Pull request #${pr} is closed or wasn't opened from this form. Reload the page.` };

  // Check against the copy the rows will land on: the open change's branch, or main.
  const [tradesCsv, instCsv] = await readFiles(cfg, branch, ["data/trades.csv", "data/instruments.csv"]);
  if (!tradesCsv || !instCsv) return { ok: false, error: "Couldn't read trades.csv or instruments.csv." };

  let inst, existing;
  try {
    inst = parseInstruments(instCsv);
    existing = parseTrades(tradesCsv);
  } catch (e) {
    return { ok: false, error: `The current trades.csv or instruments.csv doesn't parse: ${(e as Error).message}` };
  }
  const known = new Set(inst.map((i) => i.ticker));
  const closes = (await getFundData()).closes;
  const priced = new Set(Object.keys(closes).filter((k) => closes[k]?.some((v) => v > 0)));
  const rowProblems = inputs.flatMap((t, i) =>
    Object.entries(tradeProblems(t, today, known, priced)).map(([k, v]) => `Trade ${i + 1}, ${k}: ${v}`),
  );
  if (rowProblems.length) return { ok: false, error: "Some trades need fixing.", problems: rowProblems };

  const rows = inputs.map((t) => toTrade(t, inst));
  const check = checkLedger([...existing, ...rows], inst, meta(), (i) =>
    i < existing.length ? `trades.csv row ${i + 2}` : `Trade ${i - existing.length + 1}`,
  );
  if (check.errors.length) return { ok: false, error: "These trades would fail the site's checks.", problems: check.errors };

  const next = appendTrades(tradesCsv, rows);
  if (!cfg) {
    return { ok: false, error: "Saving to GitHub isn't set up yet (GITHUB_TOKEN and GITHUB_REPO). This is the file that would be committed.", dryRun: next };
  }

  try {
    const summary = rows.map(describe).join(", ");
    const table = [
      "| Date | Action | Ticker | Shares | Price | Fees | Note |",
      "| --- | --- | --- | ---: | ---: | ---: | --- |",
      ...rows.map((t) => `| ${t.date} | ${t.action} | ${t.ticker} | ${t.shares ?? ""} | ${t.price ?? ""} | ${t.fees || ""} | ${t.note} |`),
    ].join("\n");
    const opened = await commitToChange(cfg, session, {
      prefix: TRADES_PREFIX,
      branch,
      pr,
      files: [{ path: "data/trades.csv", text: next }],
      message: `Record trades: ${summary}`,
      title: `Trades: ${summary}`,
      body: [
        `New rows for \`data/trades.csv\`, checked against the ledger rules before committing (cash after: $${check.cash.toFixed(2)}).`,
        "",
        table,
        "",
        `Recorded from the trade form by @${session.login}. More trades recorded before this is merged are added here.`,
      ].join("\n"),
    });
    revalidatePath("/admin");
    return { ok: true, pr: { number: opened.number, url: opened.url } };
  } catch (e) {
    console.error("saveTrades", e);
    return { ok: false, error: `GitHub refused the change: ${(e as Error).message}` };
  }
}
