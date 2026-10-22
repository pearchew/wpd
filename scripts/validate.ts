/**
 * Pre-deploy validation. Runs as `prebuild`, so a bad CSV row or frontmatter
 * typo fails the build and Vercel keeps serving the previous deployment.
 */
import fs from "node:fs";
import path from "node:path";
import { instruments, meta, researchDocs, team, trades, votes } from "../lib/data";
import { checkInstruments } from "../lib/instrumentChecks";
import { getPriceBook } from "../lib/prices";
import { checkLedger, fxLookup } from "../lib/tradeChecks";

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

if (inst) checkInstruments(inst, m?.benchmark).forEach(fail);

const known = new Set(inst?.map((i) => i.ticker));
const voters = new Set(people?.map((p) => p.initials));

/** Rows in another currency are checked at the same exchange rates the site uses, so only then is the price book loaded. */
async function checkTrades() {
  if (!(ledger && inst && m)) return;
  const foreign = ledger.some((t) => t.currency !== m.reportingCurrency);
  const fx = foreign ? fxLookup(await getPriceBook(), m.reportingCurrency) : undefined;
  checkLedger(ledger, inst, m, undefined, fx).errors.forEach(fail);
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

checkTrades()
  .catch((e) => fail(`trades.csv: couldn't load exchange rates: ${e instanceof Error ? e.message : String(e)}`))
  .then(() => {
    if (errors.length) {
      console.error(`\nValidation failed (${errors.length}):\n${errors.map((e) => `  ✗ ${e}`).join("\n")}\n`);
      process.exit(1);
    }
    console.log(
      `Validation passed: ${inst?.length} instruments, ${ledger?.length} trades, ${voteRows?.length} votes, ${docs?.length} research files.`,
    );
  });
