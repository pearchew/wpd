import { describe, expect, it } from "vitest";
import { type Sources, describePlan, emptySelection, planDeletion } from "@/lib/admin/deletions";

const H_INST = "ticker,name,asset_class,currency,feed_symbol,kind,multiplier,underlying,underlying_scale,expiry,strike,option_type,margin,maint_margin";
const src = (over: Partial<Sources> = {}): Sources => ({
  instrumentsCsv: [
    H_INST,
    "MSFT,Microsoft,Equities,USD,MSFT,stock,1,,,,,,,",
    "NVDA,NVIDIA,Equities,USD,NVDA,stock,1,,,,,,,",
    "SPY,SPDR S&P 500 ETF (benchmark),Equities,USD,SPY,etf,1,,,,,,,",
    "MSFT261218P400,MSFT Dec 18 2026 400 put,Derivatives,USD,MSFT261218P00400000,option,100,MSFT,,2026-12-18,400,put,,",
  ].join("\n") + "\n",
  tradesCsv: [
    "date,book,ticker,action,shares,price,fees,currency,notional_slice,note",
    "2026-10-14,real,CASH,deposit,,100,,USD,,Starting capital",
    "2026-10-14,real,NVDA,buy,0.2245,222.69,0,USD,,Half",
    "2026-10-14,real,MSFT,buy,0.0931,536.98,0,USD,,Half",
  ].join("\n") + "\n",
  votesCsv: [
    "date,ticker,voter,vote,conviction,note",
    "2026-10-12,NVDA,A,Include,High,",
    "2026-10-12,MSFT,A,Include,High,",
    "2026-10-12,MSFT,B,Watch,Medium,",
  ].join("\n") + "\n",
  reports: [
    { slug: "msft", ticker: "MSFT", name: "Microsoft", model: "/models/msft-dcf.xlsx" },
    { slug: "nvda", ticker: "NVDA", name: "NVIDIA", model: "/models/shared.xlsx" },
  ],
  benchmark: "SPY",
  maxPositionWeight: 0.25,
  ...over,
});
const sel = (over: Partial<ReturnType<typeof emptySelection>>) => ({ ...emptySelection(), ...over });

describe("delete planner", () => {
  it("cascades an asset to its options, trades, votes, report and model", () => {
    const p = planDeletion(src(), sel({ assets: ["MSFT"] }));
    expect(p.errors).toEqual([]);
    expect(p.assets).toEqual([{ ticker: "MSFT" }, { ticker: "MSFT261218P400", because: "MSFT" }]);
    expect(p.trades.map((t) => [t.idx, t.because])).toEqual([[2, "MSFT"]]);
    expect(p.votes.map((v) => v.idx)).toEqual([1, 2]);
    expect(p.reports).toEqual([{ slug: "msft", ticker: "MSFT", because: "MSFT" }]);
    expect(p.removeFiles).toEqual(["content/research/msft.mdx", "public/models/msft-dcf.xlsx"]);
    const inst = p.files.find((f) => f.path === "data/instruments.csv")!.text;
    expect(inst).not.toContain("MSFT");
    expect(inst.split("\n")).toHaveLength(4); // header, NVDA, SPY, trailing newline
    expect(describePlan(p)).toBe("MSFT, MSFT261218P400 assets, MSFT report, 1 trade, 2 votes");
  });

  it("never deletes the benchmark", () => {
    expect(planDeletion(src(), sel({ assets: ["SPY"] })).errors[0]).toContain("benchmark");
  });

  it("deletes a single vote and leaves the other lines untouched", () => {
    const p = planDeletion(src(), sel({ votes: [{ idx: 2, line: "2026-10-12,MSFT,B,Watch,Medium," }] }));
    expect(p.errors).toEqual([]);
    expect(p.files).toEqual([
      { path: "data/votes.csv", text: "date,ticker,voter,vote,conviction,note\n2026-10-12,NVDA,A,Include,High,\n2026-10-12,MSFT,A,Include,High,\n" },
    ]);
  });

  it("blocks a trade deletion that would break the ledger", () => {
    const p = planDeletion(src(), sel({ trades: [{ idx: 0, line: "2026-10-14,real,CASH,deposit,,100,,USD,,Starting capital" }] }));
    expect(p.errors.some((e) => e.includes("cash goes negative"))).toBe(true);
  });

  it("refuses rows that changed since the page loaded", () => {
    const p = planDeletion(src(), sel({ votes: [{ idx: 0, line: "2026-10-12,NVDA,C,Reject,Low," }] }));
    expect(p.errors[0]).toContain("changed since this page loaded");
  });

  it("keeps a model another report still links to", () => {
    const s = src({ reports: [...src().reports, { slug: "jnj", ticker: "JNJ", name: "JNJ", model: "/models/shared.xlsx" }] });
    expect(planDeletion(s, sel({ reports: ["nvda"] })).removeFiles).toEqual(["content/research/nvda.mdx"]);
    expect(planDeletion(src(), sel({ reports: ["nvda"] })).removeFiles).toEqual(["content/research/nvda.mdx", "public/models/shared.xlsx"]);
  });

  it("does nothing for an empty selection", () => {
    expect(planDeletion(src(), emptySelection()).empty).toBe(true);
  });
});
