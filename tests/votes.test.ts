import { describe, expect, it } from "vitest";
import { appendVote, parseVotes, toVote } from "@/lib/admin/votes";
import { computeVerdict } from "@/lib/verdict";

const CSV = "date,ticker,voter,vote,conviction,note\n2026-10-12,MSFT,A,Include,High,Placeholder vote\n2026-10-12,MSFT,B,Watch,Medium,\n";

describe("vote rows", () => {
  it("appends the member's vote in the file's column order, quoting notes with commas", () => {
    const v = toVote({ ticker: "msft", vote: "Include", conviction: "Low", note: " Cloud, then AI " }, "C", "2026-10-20");
    const next = appendVote(CSV, v);
    expect(next.split("\n").at(-2)).toBe('2026-10-20,MSFT,C,Include,Low,"Cloud, then AI"');
    expect(parseVotes(next).at(-1)).toEqual(v);
  });

  it("changes the verdict the way the committee rules say", () => {
    const votes = parseVotes(CSV);
    const c = toVote({ ticker: "MSFT", vote: "Include", conviction: "Medium", note: "" }, "C", "2026-10-20");
    expect(computeVerdict(votes, "MSFT", "A").verdict).toBe("Watch");
    expect(computeVerdict([...votes, c], "MSFT", "A").verdict).toBe("Include");
    // The author's Include alone never carries it: B (author) + A here is fine, but A alone with author A is not.
    const onlyAuthor = parseVotes("date,ticker,voter,vote,conviction,note\n2026-10-12,JNJ,A,Include,High,\n2026-10-12,JNJ,B,Watch,High,\n");
    expect(computeVerdict(onlyAuthor, "JNJ", "A").verdict).toBe("Watch");
  });

  it("refuses a vote that isn't one of the three", () => {
    expect(() => toVote({ ticker: "MSFT", vote: "Buy" as never, conviction: "High", note: "" }, "A", "2026-10-20")).toThrow();
  });
});
