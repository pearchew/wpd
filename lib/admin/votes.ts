import Papa from "papaparse";
import { type Vote, VoteSchema } from "../schemas";

/** Every pull request the vote form opens lives on a branch starting with this. */
export const VOTES_PREFIX = "admin/votes-";

export const VOTES = ["Include", "Watch", "Reject"] as const;
export const CONVICTIONS = ["High", "Medium", "Low"] as const;

export interface VoteInput {
  ticker: string;
  vote: Vote["vote"];
  conviction: Vote["conviction"];
  note: string;
}

/** The signed-in member's vote as a votes.csv row. The voter and date are never typed in. */
export const toVote = (v: VoteInput, voter: string, date: string): Vote =>
  VoteSchema.parse({ date, ticker: v.ticker.trim().toUpperCase(), voter, vote: v.vote, conviction: v.conviction, note: v.note.trim() });

/** votes.csv with `vote` appended, columns in the file's own order. */
export function appendVote(csv: string, vote: Vote): string {
  const fields = Papa.parse<string[]>(csv.split("\n")[0]).data[0] ?? [];
  const rec = vote as unknown as Record<string, string>;
  const line = Papa.unparse([fields.map((f) => rec[f.trim()] ?? "")], { header: false, newline: "\n" });
  return `${csv.replace(/\s*$/, "")}\n${line}\n`;
}

export function parseVotes(csv: string): Vote[] {
  return Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  }).data.map((r) => VoteSchema.parse(r));
}
