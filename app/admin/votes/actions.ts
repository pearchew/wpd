"use server";

import { revalidatePath } from "next/cache";
import { changeBranch, commitToChange, readFiles } from "@/lib/admin/change";
import { repoConfig } from "@/lib/admin/config";
import { requireSession } from "@/lib/admin/session";
import { parseInstruments } from "@/lib/admin/trades";
import { CONVICTIONS, VOTES, VOTES_PREFIX, type VoteInput, appendVote, parseVotes, toVote } from "@/lib/admin/votes";
import { researchDocs } from "@/lib/data";
import { toISO } from "@/lib/dates";
import { getTeam } from "@/lib/team";
import { computeVerdict } from "@/lib/verdict";

export type VoteSaveResult =
  | { ok: true; pr: { number: number; url: string }; verdict: string }
  | { ok: false; error: string; dryRun?: string };

/** Append the signed-in member's vote to data/votes.csv: in the open vote change if there is one, else a new one. */
export async function saveVote(input: VoteInput, pr?: number): Promise<VoteSaveResult> {
  const session = await requireSession();
  const member = getTeam().find((t) => t.initials === session.initials);
  if (!member) return { ok: false, error: `${session.initials} is not in team.csv, so it can't vote.` };
  if (!VOTES.includes(input?.vote) || !CONVICTIONS.includes(input?.conviction)) return { ok: false, error: "Pick a vote and a conviction." };
  if ((input.note ?? "").length > 300) return { ok: false, error: "Keep the note under 300 characters." };

  const cfg = repoConfig();
  const branch = cfg && pr ? await changeBranch(cfg, VOTES_PREFIX, pr) : undefined;
  if (cfg && pr && !branch) return { ok: false, error: `Pull request #${pr} is closed or wasn't opened from this form. Reload the page.` };

  const [votesCsv, instCsv] = await readFiles(cfg, branch, ["data/votes.csv", "data/instruments.csv"]);
  if (!votesCsv || !instCsv) return { ok: false, error: "Couldn't read votes.csv or instruments.csv." };

  const vote = toVote(input, member.initials, toISO(new Date()));
  if (!parseInstruments(instCsv).some((i) => i.ticker === vote.ticker)) {
    return { ok: false, error: `${vote.ticker} isn't in the asset list, so it can't be voted on yet.` };
  }
  const existing = parseVotes(votesCsv);
  const author = researchDocs().find((d) => d.front.ticker === vote.ticker)?.front.author;
  const before = computeVerdict(existing, vote.ticker, author).verdict;
  const after = computeVerdict([...existing, vote], vote.ticker, author).verdict;
  const next = appendVote(votesCsv, vote);

  if (!cfg) {
    return { ok: false, error: "Saving to GitHub isn't set up yet (GITHUB_TOKEN and GITHUB_REPO). This is the file that would be committed.", dryRun: next };
  }

  try {
    const what = `${member.initials} ${vote.vote} on ${vote.ticker} (${vote.conviction})`;
    const opened = await commitToChange(cfg, session, {
      prefix: VOTES_PREFIX,
      branch,
      pr,
      files: [{ path: "data/votes.csv", text: next }],
      message: `Record vote: ${what}`,
      title: `Votes: ${what}`,
      body: [
        "New rows for `data/votes.csv`.",
        "",
        `- **${member.name}** votes **${vote.vote}** on **${vote.ticker}**, ${vote.conviction.toLowerCase()} conviction${vote.note ? `: ${vote.note}` : ""}`,
        `- Verdict on ${vote.ticker}: ${before} → **${after}**`,
        "",
        `Cast from the vote form by @${session.login}. Votes cast before this is merged are added here.`,
      ].join("\n"),
    });
    revalidatePath("/admin");
    return { ok: true, pr: opened, verdict: after };
  } catch (e) {
    console.error("saveVote", e);
    return { ok: false, error: `GitHub refused the change: ${(e as Error).message}` };
  }
}
