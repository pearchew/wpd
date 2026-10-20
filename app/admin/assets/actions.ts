"use server";

import { revalidatePath } from "next/cache";
import { ASSETS_PREFIX, type AssetInput, KIND_LABEL, appendInstrumentRow, assetProblems, instrumentRow, toInstrument } from "@/lib/admin/assets";
import { changeBranch, commitToChange, readFiles } from "@/lib/admin/change";
import { repoConfig } from "@/lib/admin/config";
import { requireSession } from "@/lib/admin/session";
import { parseInstruments } from "@/lib/admin/trades";
import { meta } from "@/lib/data";
import { toISO } from "@/lib/dates";
import { checkInstruments } from "@/lib/instrumentChecks";

export type AssetSaveResult =
  | { ok: true; pr: { number: number; url: string }; ticker: string }
  | { ok: false; error: string; problems?: string[]; dryRun?: string };

/** Append one asset to data/instruments.csv: in the open asset change if there is one, else a new one. */
export async function saveAsset(input: AssetInput, pr?: number): Promise<AssetSaveResult> {
  const session = await requireSession();
  const cfg = repoConfig();
  const branch = cfg && pr ? await changeBranch(cfg, ASSETS_PREFIX, pr) : undefined;
  if (cfg && pr && !branch) return { ok: false, error: `Pull request #${pr} is closed or wasn't opened from this form. Reload the page.` };

  const [csv] = await readFiles(cfg, branch, ["data/instruments.csv"]);
  if (!csv) return { ok: false, error: "Couldn't read instruments.csv." };
  let existing;
  try {
    existing = parseInstruments(csv);
  } catch (e) {
    return { ok: false, error: `The current instruments.csv doesn't parse: ${(e as Error).message}` };
  }

  const fields = assetProblems(input, existing, toISO(new Date()));
  if (Object.keys(fields).length) {
    return { ok: false, error: "Some fields need fixing.", problems: Object.entries(fields).map(([k, v]) => `${k}: ${v}`) };
  }
  const row = instrumentRow(input);
  const errors = checkInstruments([...existing, toInstrument(row)], meta().benchmark);
  if (errors.length) return { ok: false, error: "This asset would fail the site's checks.", problems: errors };

  const next = appendInstrumentRow(csv, row);
  if (!cfg) {
    return { ok: false, error: "Saving to GitHub isn't set up yet (GITHUB_TOKEN and GITHUB_REPO). This is the file that would be committed.", dryRun: next };
  }

  try {
    const what = `${row.ticker} (${row.name}, ${KIND_LABEL[input.kind].toLowerCase()})`;
    const opened = await commitToChange(cfg, session, {
      prefix: ASSETS_PREFIX,
      branch,
      pr,
      files: [{ path: "data/instruments.csv", text: next }],
      message: `Add asset ${what}`,
      title: `Assets: add ${what}`,
      body: [
        "New rows for `data/instruments.csv`, checked against the instrument rules before committing.",
        "",
        "```",
        Object.values(row).join(","),
        "```",
        "",
        "**After merging**, load price history before anyone trades it: `npm run db:backfill`, or Vercel → Settings → Cron Jobs → Run. Until then the trade form won't offer a buy in it.",
        "",
        `Added from the asset form by @${session.login}. Assets added before this is merged are added here.`,
      ].join("\n"),
    });
    revalidatePath("/admin");
    return { ok: true, pr: opened, ticker: row.ticker };
  } catch (e) {
    console.error("saveAsset", e);
    return { ok: false, error: `GitHub refused the change: ${(e as Error).message}` };
  }
}
