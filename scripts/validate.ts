/**
 * Pre-deploy validation. Runs as `prebuild`, so a bad CSV row or frontmatter
 * typo fails the build and Vercel keeps serving the previous deployment.
 */
import fs from "node:fs";
import path from "node:path";
import { instruments, meta, researchDocs, team, trades, votes } from "../lib/data";

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function guarded<T>(label: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    fail(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

const m = guarded("data/meta.json", meta);
const inst = guarded("data/instruments.csv", instruments);
const ledger = guarded("data/trades.csv", trades);
const voteRows = guarded("data/votes.csv", votes);
const people = guarded("data/team.csv", team);
const docs = guarded("content/research", researchDocs);

if (inst) {
  const seen = new Set<string>();
  for (const i of inst) {
    if (seen.has(i.ticker)) fail(`instruments.csv: duplicate ticker ${i.ticker}`);
    seen.add(i.ticker);
    if (i.kind === "future" && !(i.underlying && i.expiry && i.margin)) {
      fail(`instruments.csv: future ${i.ticker} needs underlying, expiry and margin`);
    }
    if (i.kind === "option" && !(i.underlying && i.expiry && i.strike && i.option_type)) {
      fail(`instruments.csv: option ${i.ticker} needs underlying, expiry, strike and option_type`);
    }
    if (i.underlying && !inst.some((x) => x.ticker === i.underlying)) {
      fail(`instruments.csv: ${i.ticker} underlying ${i.underlying} is not an instrument`);
    }
  }
  if (m && !seen.has(m.benchmark)) fail(`meta.json: benchmark ${m.benchmark} is not in instruments.csv`);
}

const known = new Set(inst?.map((i) => i.ticker));
const voters = new Set(people?.map((p) => p.initials));

if (ledger && inst && m) {
  const qty = new Map<string, number>();
  const cost = new Map<string, number>();
  let cash = 0;
  const ordered = ledger.map((t, i) => ({ t, row: i + 2 })).sort((a, b) => a.t.date.localeCompare(b.t.date) || a.row - b.row);

  for (const { t, row } of ordered) {
    const at = `trades.csv row ${row}`;
    const cashRow = ["deposit", "withdrawal", "fee"].includes(t.action);
    if (!cashRow && !known.has(t.ticker)) fail(`${at}: unknown ticker ${t.ticker}`);
    if (cashRow && !(t.price && t.price > 0)) fail(`${at}: ${t.action} needs the amount in the price column`);
    if (["buy", "sell"].includes(t.action) && !(t.shares && t.shares > 0 && t.price && t.price > 0)) {
      fail(`${at}: ${t.action} needs positive shares and price`);
    }
    if (t.action === "split" && !(t.shares && t.shares > 0)) fail(`${at}: split needs the ratio in the shares column`);

    const i = inst.find((x) => x.ticker === t.ticker);
    if (t.book === "real" && i && (i.kind === "future" || i.kind === "option")) {
      fail(`${at}: ${t.ticker} is a derivative, so it must be a paper trade`);
    }
    if (t.book === "paper" && t.action === "buy" && i) {
      const hasSlice = !!t.notional_slice;
      const hasUnderlying = i.kind === "option" && i.underlying;
      if (!hasSlice && !hasUnderlying) fail(`${at}: paper buy needs notional_slice for the Combined view`);
    }

    const key = `${t.book}:${t.ticker}`;
    const sign = t.action === "buy" ? 1 : t.action === "sell" ? -1 : 0;
    if (sign) {
      const q = (qty.get(key) ?? 0) + sign * (t.shares ?? 0);
      if (t.book === "real" && q < -1e-9) fail(`${at}: sells more ${t.ticker} than is held`);
      qty.set(key, q);
      cost.set(key, (cost.get(key) ?? 0) + sign * (t.shares ?? 0) * (t.price ?? 0));
      if (t.book === "real") cash += -sign * (t.shares ?? 0) * (t.price ?? 0) - t.fees;
    }
    if (t.book === "real") {
      if (t.action === "deposit") cash += t.price ?? 0;
      if (t.action === "withdrawal" || t.action === "fee") cash -= t.price ?? 0;
      if (t.action === "dividend") cash += t.shares ? t.shares * (t.price ?? 0) : (t.price ?? 0);
    }
  }
  if (cash < -0.005) fail(`trades.csv: cash goes negative (${cash.toFixed(2)}); a deposit or sale is missing`);

  // 25% cap, measured on cost basis so validation never depends on the price feed
  const realKeys = [...qty.keys()].filter((k) => k.startsWith("real:") && (qty.get(k) ?? 0) > 1e-9);
  const capApplies = realKeys.length >= 4; // a cap is meaningless with fewer than four holdings
  const invested = realKeys.reduce((s, k) => s + (cost.get(k) ?? 0), 0);
  const total = invested + Math.max(cash, 0);
  for (const k of realKeys) {
    const w = (cost.get(k) ?? 0) / total;
    if (capApplies && w > m.maxPositionWeight) {
      fail(`${k.slice(5)} is ${(w * 100).toFixed(1)}% of the fund at cost, over the ${(m.maxPositionWeight * 100).toFixed(0)}% cap`);
    }
  }
}

if (voteRows) {
  voteRows.forEach((v, i) => {
    if (!known.has(v.ticker)) fail(`votes.csv row ${i + 2}: unknown ticker ${v.ticker}`);
    if (!voters.has(v.voter)) fail(`votes.csv row ${i + 2}: unknown voter ${v.voter}`);
  });
}

if (docs && inst) {
  for (const d of docs) {
    const at = `content/research/${d.slug}.mdx`;
    const i = inst.find((x) => x.ticker === d.front.ticker);
    if (!i) fail(`${at}: ticker ${d.front.ticker} is not in instruments.csv`);
    else if (i.asset_class !== d.front.assetClass) fail(`${at}: assetClass ${d.front.assetClass} disagrees with instruments.csv (${i.asset_class})`);
    if (d.slug !== d.front.ticker.toLowerCase()) fail(`${at}: file name must be the lower-case ticker`);
    if (!voters.has(d.front.author)) fail(`${at}: author ${d.front.author} is not in team.csv`);
    if (d.front.status === "published" && d.front.model) {
      if (!fs.existsSync(path.join(process.cwd(), "public", d.front.model))) {
        fail(`${at}: model file public${d.front.model} does not exist`);
      }
    }
  }
}

if (errors.length) {
  console.error(`\nValidation failed (${errors.length}):\n${errors.map((e) => `  ✗ ${e}`).join("\n")}\n`);
  process.exit(1);
}
console.log(
  `Validation passed: ${inst?.length} instruments, ${ledger?.length} trades, ${voteRows?.length} votes, ${docs?.length} research files.`,
);
