"use server";

import { revalidatePath } from "next/cache";
import { changeBranch, commitToChange } from "@/lib/admin/change";
import { repoConfig } from "@/lib/admin/config";
import { deleteSources } from "@/lib/admin/deleteSources";
import { DELETE_PREFIX, type Selection, describePlan, planDeletion } from "@/lib/admin/deletions";
import { type CommitFile, listDir } from "@/lib/admin/github";
import { localFile } from "@/lib/admin/load";
import { requireSession } from "@/lib/admin/session";

export type DeleteResult =
  | { ok: true; pr: { number: number; url: string }; summary: string }
  | { ok: false; error: string; problems?: string[]; dryRun?: { path: string; text?: string }[] };

/** Delete the selection (and everything that cascades from it) in a pull request: the open delete change if there is one. */
export async function deleteItems(selection: Selection, reason: string, pr?: number): Promise<DeleteResult> {
  const session = await requireSession();
  const cfg = repoConfig();
  const branch = cfg && pr ? await changeBranch(cfg, DELETE_PREFIX, pr) : undefined;
  if (cfg && pr && !branch) return { ok: false, error: `Pull request #${pr} is closed or wasn't opened from this page. Reload the page.` };

  const src = await deleteSources(cfg, branch);
  if (!src) return { ok: false, error: "Couldn't read the data files." };
  const plan = planDeletion(src, selection);
  if (plan.empty) return { ok: false, error: "Nothing is selected." };
  if (plan.errors.length) return { ok: false, error: "This deletion would fail the site's checks.", problems: plan.errors };

  // Only remove files that are really there: a model a report links to may never have been uploaded.
  const present = async (path: string) => {
    const dir = path.slice(0, path.lastIndexOf("/"));
    const name = path.slice(path.lastIndexOf("/") + 1);
    return cfg ? (await listDir(cfg, dir, branch ?? cfg.base)).includes(name) : localFile(path) !== undefined;
  };
  const removals = (await Promise.all(plan.removeFiles.map(async (p) => ((await present(p)) ? p : undefined)))).filter(
    (p): p is string => Boolean(p),
  );
  const files: CommitFile[] = [...plan.files, ...removals.map((path) => ({ path, remove: true as const }))];
  const summary = describePlan(plan);

  if (!cfg) {
    return {
      ok: false,
      error: "Saving to GitHub isn't set up yet (GITHUB_TOKEN and GITHUB_REPO). These are the changes that would be committed.",
      dryRun: [...plan.files, ...removals.map((path) => ({ path }))],
    };
  }

  try {
    const cascade = [
      ...plan.assets.filter((a) => a.because).map((a) => `${a.ticker} (built on ${a.because})`),
      ...plan.reports.filter((r) => r.because).map((r) => `the ${r.ticker} report`),
      ...(plan.trades.some((t) => t.because) ? [`${plan.trades.filter((t) => t.because).length} trade(s) in deleted assets`] : []),
      ...(plan.votes.some((v) => v.because) ? [`${plan.votes.filter((v) => v.because).length} vote(s) on deleted assets`] : []),
    ];
    const opened = await commitToChange(cfg, session, {
      prefix: DELETE_PREFIX,
      branch,
      pr,
      files,
      message: `Delete ${summary}`,
      title: `Delete: ${summary}`,
      body: [
        `Deletes ${summary}. The remaining data passes the instrument and ledger checks.`,
        "",
        reason.trim() ? `**Why:** ${reason.trim().slice(0, 500)}` : "",
        cascade.length ? `**Also removed because they depend on a deleted asset:** ${cascade.join("; ")}.` : "",
        "",
        ...plan.trades.map((t) => `- trades.csv: \`${t.line}\``),
        ...plan.votes.map((v) => `- votes.csv: \`${v.line}\``),
        ...removals.map((p) => `- removes \`${p}\``),
        "",
        `Opened from the delete page by @${session.login}. Close this pull request without merging to cancel; nothing is removed until it's merged.`,
      ]
        .filter((l, i, a) => l !== "" || a[i - 1] !== "")
        .join("\n"),
    });
    revalidatePath("/admin");
    return { ok: true, pr: opened, summary };
  } catch (e) {
    console.error("deleteItems", e);
    return { ok: false, error: `GitHub refused the change: ${(e as Error).message}` };
  }
}
