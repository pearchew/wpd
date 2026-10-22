import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { instruments } from "../data";
import { getFundData } from "../fund";
import { getTeam } from "../team";
import type { RepoConfig } from "./config";
import { readFile } from "./github";

/** What the research form needs to know about the rest of the site. Plain data, so it can cross to the client. */
export interface FormContext {
  assets: { ticker: string; name: string; assetClass: string; currency: string }[];
  prices: Record<string, number>;
  team: { initials: string; name: string; avatar: string }[];
  reports: string[];
}

export async function formContext(cfg: RepoConfig | undefined, ref?: string): Promise<FormContext> {
  const d = await getFundData();
  let assets = instruments().map((i) => ({ ticker: i.ticker, name: i.name, assetClass: i.asset_class as string, currency: i.currency }));
  // On a pull request branch the asset list may already include a ticker that branch added.
  if (cfg && ref) {
    const csv = await readFile(cfg, "data/instruments.csv", ref);
    if (csv) {
      assets = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true }).data.map((r) => ({
        ticker: r.ticker?.trim() ?? "",
        name: r.name?.trim() ?? "",
        assetClass: r.asset_class?.trim() ?? "",
        currency: r.currency?.trim() || "USD",
      }));
    }
  }
  const prices: Record<string, number> = {};
  for (const [t, series] of Object.entries(d.closes)) {
    const last = series?.[series.length - 1];
    if (last) prices[t] = last;
  }
  return {
    assets: assets.filter((a) => a.ticker !== "SPY"),
    prices,
    team: getTeam().map((t) => ({ initials: t.initials, name: t.name, avatar: t.avatar })),
    reports: [...d.research.keys()].map((k) => k.toUpperCase()),
  };
}

/** A file from this deployment's own copy of the repo, by repo-relative path. */
export function localFile(rel: string): string | undefined {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

/** A report file from this deployment's own copy of the repo. */
export function localReport(slug: string): string | undefined {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "content/research", `${slug}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}
