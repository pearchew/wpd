import type { Vote } from "./schemas";

export type Verdict = "Include" | "Watch" | "Reject" | "Unvoted";

export interface VerdictResult {
  verdict: Verdict;
  /** each voter's latest vote on the asset */
  latest: Vote[];
  counts: Record<"Include" | "Watch" | "Reject", number>;
}

/** Each voter's most recent vote per ticker; later rows win ties on the same date. */
export function latestVotes(votes: Vote[], ticker: string): Vote[] {
  const byVoter = new Map<string, Vote>();
  votes
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.ticker === ticker)
    .sort((a, b) => a.v.date.localeCompare(b.v.date) || a.i - b.i)
    .forEach(({ v }) => byVoter.set(v.voter, v));
  return [...byVoter.values()];
}

/**
 * Committee rules: Include needs 2 of 3 votes and the owner's vote alone never
 * carries it (so at least one Include must come from someone other than the
 * research author). Two Rejects reject. Everything else is Watch.
 */
export function computeVerdict(votes: Vote[], ticker: string, owner?: string): VerdictResult {
  const latest = latestVotes(votes, ticker);
  const counts = { Include: 0, Watch: 0, Reject: 0 };
  for (const v of latest) counts[v.vote]++;
  const nonOwnerIncludes = latest.filter((v) => v.vote === "Include" && v.voter !== owner).length;

  let verdict: Verdict = "Watch";
  if (latest.length === 0) verdict = "Unvoted";
  else if (counts.Include >= 2 && nonOwnerIncludes >= 1) verdict = "Include";
  else if (counts.Reject >= 2) verdict = "Reject";
  return { verdict, latest, counts };
}

/** Vote history for one ticker (or all), newest first. */
export function voteHistory(votes: Vote[], ticker?: string): Vote[] {
  return votes
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => !ticker || v.ticker === ticker)
    .sort((a, b) => b.v.date.localeCompare(a.v.date) || b.i - a.i)
    .map(({ v }) => v);
}
