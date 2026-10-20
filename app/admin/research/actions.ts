"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import { repoConfig } from "@/lib/admin/config";
import { type CommitFile, commitFiles, getPull, markReady, openPull, readFile } from "@/lib/admin/github";
import {
  BRANCH_PREFIX,
  MODEL_MAX_BYTES,
  type NewAsset,
  type ReportDraft,
  modelPath,
  problems,
  reportPath,
  slugFor,
  toMdx,
  withInstrument,
} from "@/lib/admin/report";
import { requireSession } from "@/lib/admin/session";
import { toISO } from "@/lib/dates";
import { getTeam } from "@/lib/team";

export interface SavePayload {
  draft: ReportDraft;
  body: string;
  /** "draft" keeps the pull request as a GitHub draft; "submit" marks it ready for review. */
  mode: "draft" | "submit";
  isNew: boolean;
  pr?: number;
  newAsset?: NewAsset;
}

export type SaveResult =
  | { ok: true; pr: { number: number; url: string; draft: boolean } }
  | { ok: false; error: string; fields?: Partial<Record<string, string>>; dryRun?: { path: string; text: string }[] };

export async function saveReport(form: FormData): Promise<SaveResult> {
  const session = await requireSession();
  let p: SavePayload;
  try {
    p = JSON.parse(String(form.get("payload")));
  } catch {
    return { ok: false, error: "The form data didn't arrive intact. Reload the page and try again." };
  }

  const draft: ReportDraft = { ...p.draft, updated: toISO(new Date()) };
  // The person who starts a report is its author; later edits, by anyone, keep that byline.
  if (p.isNew && !p.pr) draft.author = session.initials;
  if (!getTeam().some((t) => t.initials === draft.author)) {
    return { ok: false, error: `Author ${draft.author} is not in team.csv.` };
  }

  const upload = form.get("model");
  const file = upload instanceof File && upload.size > 0 ? upload : undefined;
  if (file) {
    if (file.size > MODEL_MAX_BYTES) return { ok: false, error: "The model file is over 4 MB." };
    if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) return { ok: false, error: "The model must be an Excel or CSV file." };
    draft.model = modelPath(draft.ticker, file.name);
  }

  const fields = problems(draft);
  if (Object.keys(fields).length) return { ok: false, error: "Some fields need fixing.", fields };

  // Catch anything the site's MDX renderer would choke on now, not in the Vercel build log.
  try {
    await serialize(p.body, { mdxOptions: { remarkPlugins: [remarkGfm] } });
  } catch (e) {
    return { ok: false, error: `The write-up can't be rendered: ${(e as Error).message}` };
  }

  const ticker = draft.ticker.trim().toUpperCase();
  const mdxPath = reportPath(ticker);
  const files: CommitFile[] = [{ path: mdxPath, text: toMdx(draft, p.body) }];

  const cfg = repoConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "Saving to GitHub isn't set up yet (GITHUB_TOKEN and GITHUB_REPO). Here is the file that would have been committed.",
      dryRun: files.map((f) => ({ path: f.path, text: "text" in f ? f.text : "" })),
    };
  }

  try {
    let branch: string;
    let pull: Awaited<ReturnType<typeof getPull>> | undefined;
    if (p.pr) {
      pull = await getPull(cfg, p.pr);
      if (pull.state !== "open" || !pull.branch.startsWith(BRANCH_PREFIX)) {
        return { ok: false, error: `Pull request #${p.pr} is closed or wasn't opened from this form. Start a new edit.` };
      }
      branch = pull.branch;
    } else {
      const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
      branch = `${BRANCH_PREFIX}${slugFor(ticker).replace(/[^a-z0-9-]/g, "-")}-${session.initials.toLowerCase()}-${stamp}`;
      if (p.isNew && (await readFile(cfg, mdxPath, cfg.base)) !== undefined) {
        return { ok: false, error: `There is already a report for ${ticker}. Edit that one instead.` };
      }
    }

    // The research page needs the ticker in instruments.csv, with the same asset class.
    const ref = pull ? branch : cfg.base;
    const csv = (await readFile(cfg, "data/instruments.csv", ref)) ?? "";
    const rows = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true }).data;
    const row = rows.find((r) => r.ticker?.trim() === ticker);
    if (row) {
      const cls = row.asset_class?.trim();
      if (cls && cls !== draft.assetClass) {
        return { ok: false, error: `${ticker} is listed as ${cls} in instruments.csv.`, fields: { assetClass: `Must be ${cls}` } };
      }
    } else if (p.newAsset) {
      files.push({ path: "data/instruments.csv", text: withInstrument(csv, draft, p.newAsset) });
    } else {
      return { ok: false, error: `${ticker} isn't in the asset list yet.`, fields: { ticker: "Unknown ticker" } };
    }
    if (file) files.push({ path: `public${draft.model}`, bytes: Buffer.from(await file.arrayBuffer()) });

    const email = session.id ? `${session.id}+${session.login}@users.noreply.github.com` : `${session.login}@users.noreply.github.com`;
    await commitFiles(cfg, {
      branch,
      message: `${p.isNew ? "Add" : "Update"} ${ticker} research (${draft.status})`,
      files,
      author: { name: session.name, email },
    });

    if (!pull) {
      const who = getTeam().find((t) => t.initials === draft.author)?.name ?? draft.author;
      const opened = await openPull(cfg, {
        branch,
        draft: p.mode === "draft",
        title: `Research: ${ticker}, ${draft.name.trim()} (${who})`,
        body: [
          `${p.isNew ? "New" : "Updated"} research report for **${ticker}**, ${draft.status === "published" ? "to publish" : "in progress"}.`,
          "",
          `- Fair value: ${draft.fairValue || "not set"}`,
          `- Method: ${draft.method}`,
          `- Thesis: ${draft.thesis}`,
          files.length > 1 ? `- Also changes: ${files.slice(1).map((f) => `\`${f.path}\``).join(", ")}` : "",
          "",
          `Opened from the research form by @${session.login}. Edit it there: \`/admin/research/edit?pr=<this number>\`.`,
        ]
          .filter((l) => l !== "")
          .join("\n"),
      });
      revalidatePath("/admin");
      return { ok: true, pr: { number: opened.number, url: opened.url, draft: opened.draft } };
    }

    if (p.mode === "submit" && pull.draft) await markReady(cfg, pull.nodeId);
    revalidatePath("/admin");
    return { ok: true, pr: { number: pull.number, url: pull.url, draft: p.mode === "submit" ? false : pull.draft } };
  } catch (e) {
    console.error("saveReport", e);
    return { ok: false, error: `GitHub refused the change: ${(e as Error).message}` };
  }
}
