import { describe, expect, it } from "vitest";
import { bsGreeks, bsPrice, impliedVol } from "@/lib/calc/options";
import { buildTimeline, instrumentMap, twrIndex, type Ctx } from "@/lib/calc/ledger";
import { riskBreakdown } from "@/lib/calc/risk";
import { computeVerdict } from "@/lib/verdict";
import { TradeSchema, VoteSchema, type Instrument, type Meta } from "@/lib/schemas";

const meta: Meta = {
  launchDate: null, reportingCurrency: "USD", lastReconciled: "2026-01-09",
  riskFreeRate: 0.04, benchmark: "SPY", maxPositionWeight: 0.25,
};
const inst = (ticker: string, extra: Partial<Instrument> = {}): Instrument => ({
  ticker, name: ticker, asset_class: "Equities", currency: "USD", feed_symbol: ticker,
  kind: "stock", multiplier: 1, ...extra,
});
const trade = (row: Record<string, string>) =>
  TradeSchema.parse({ currency: "USD", fees: "", note: "", ...row });

const dates = ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"];
const ctx = (closes: Record<string, number[]>, instruments: Instrument[]): Ctx => ({
  instruments: instrumentMap(instruments), meta, prices: { dates, closes, fx: {}, source: "dummy" },
});

describe("ledger", () => {
  const c = ctx({ AAA: [10, 11, 12, 12], SPY: [100, 100, 100, 100] }, [inst("AAA"), inst("SPY")]);
  const trades = [
    trade({ date: "2026-01-05", book: "real", ticker: "CASH", action: "deposit", price: "100" }),
    trade({ date: "2026-01-05", book: "real", ticker: "AAA", action: "buy", shares: "5", price: "10" }),
    trade({ date: "2026-01-07", book: "real", ticker: "AAA", action: "dividend", price: "0.5" }),
    trade({ date: "2026-01-08", book: "real", ticker: "AAA", action: "sell", shares: "2", price: "12" }),
  ];

  it("computes cash and NAV from the ledger", () => {
    const tl = buildTimeline(trades, c, "2026-01-05");
    expect(tl.cash[0]).toBeCloseTo(50);
    expect(tl.realNav[0]).toBeCloseTo(100); // bought at the close
    expect(tl.realNav[2]).toBeCloseTo(50 + 0.5 + 5 * 12);
    expect(tl.final.positions.get("real:AAA")!.qty).toBe(3);
    expect(tl.cash[3]).toBeCloseTo(50 + 0.5 + 24);
  });

  it("keeps deposits out of the time-weighted return", () => {
    const withDeposit = [
      ...trades.slice(0, 2),
      trade({ date: "2026-01-07", book: "real", ticker: "CASH", action: "deposit", price: "100" }),
    ];
    const tl = buildTimeline(withDeposit, c, "2026-01-05");
    const idx = twrIndex(tl.realNav, tl.flows);
    // AAA goes 10 → 12 on 50% of the fund = +10%, deposit must not add to that
    expect(idx[3]).toBeCloseTo(110, 5);
  });

  it("shows a deposit made after the latest close as 100% cash", () => {
    const deposit = [trade({ date: "2026-01-09", book: "real", ticker: "CASH", action: "deposit", price: "100" })];
    const tl = buildTimeline(deposit, c, "2026-01-09");
    expect(tl.dates).toEqual(["2026-01-08"]);
    expect(tl.cash).toEqual([100]);
    expect(tl.realNav).toEqual([100]);
    expect(tl.flows).toEqual([100]);
  });

  it("folds trades dated after the latest close into the last day", () => {
    const late = [...trades.slice(0, 2), trade({ date: "2026-01-09", book: "real", ticker: "AAA", action: "buy", shares: "1", price: "12" })];
    const tl = buildTimeline(late, c, "2026-01-05");
    expect(tl.final.positions.get("real:AAA")!.qty).toBe(6);
    expect(tl.cash[3]).toBeCloseTo(38);
    expect(tl.realNav[3]).toBeCloseTo(38 + 6 * 12);
  });

  it("scales paper futures into a notional slice for the Combined view", () => {
    const f = inst("MES", { kind: "future", multiplier: 5, asset_class: "Derivatives", margin: 100, maint_margin: 80 });
    const cc = ctx({ AAA: [10, 10, 10, 10], MES: [100, 102, 104, 110], SPY: [1, 1, 1, 1] }, [inst("AAA"), f, inst("SPY")]);
    const tl = buildTimeline(
      [
        trade({ date: "2026-01-05", book: "real", ticker: "CASH", action: "deposit", price: "100" }),
        trade({ date: "2026-01-05", book: "paper", ticker: "MES", action: "buy", shares: "1", price: "100", notional_slice: "10" }),
      ],
      cc, "2026-01-05",
    );
    // contract rose 10%, slice is $10 → +$1 overlay; raw paper P&L is $50
    expect(tl.overlay[3]).toBeCloseTo(1);
    expect(tl.paper.pnl[3]).toBeCloseTo(50);
    expect(tl.combinedNav[3]).toBeCloseTo(101);
    expect(tl.realNav[3]).toBeCloseTo(100);
  });
});

describe("options", () => {
  const i = { spot: 100, strike: 100, t: 1, rate: 0.05, vol: 0.2, type: "call" as const };
  it("matches the textbook Black-Scholes value", () => {
    expect(bsPrice(i)).toBeCloseTo(10.4506, 3);
  });
  it("round-trips implied volatility", () => {
    const px = bsPrice({ ...i, type: "put" });
    expect(impliedVol(px, { ...i, type: "put" })).toBeCloseTo(0.2, 4);
  });
  it("has put-call parity delta", () => {
    expect(bsGreeks(i).delta - bsGreeks({ ...i, type: "put" }).delta).toBeCloseTo(1, 4);
  });
});

describe("risk", () => {
  it("shows no diversification benefit for perfectly correlated assets", () => {
    const r = [0.01, -0.02, 0.015, 0.0, -0.01];
    const rb = riskBreakdown([0.5, 0.5], [r, r]);
    expect(rb.diversificationBenefit).toBeCloseTo(0, 8);
    expect(rb.riskShare[0]).toBeCloseTo(0.5, 8);
  });
});

describe("committee verdict", () => {
  const v = (voter: string, vote: string, date = "2026-01-01") =>
    VoteSchema.parse({ date, ticker: "X", voter, vote, conviction: "High", note: "" });

  it("needs two Includes", () => {
    expect(computeVerdict([v("A", "Include"), v("B", "Watch"), v("C", "Watch")], "X").verdict).toBe("Watch");
    expect(computeVerdict([v("A", "Include"), v("B", "Include"), v("C", "Watch")], "X", "A").verdict).toBe("Include");
  });
  it("uses each voter's latest vote", () => {
    const votes = [v("A", "Include"), v("B", "Watch"), v("C", "Watch"), v("B", "Include", "2026-02-01")];
    expect(computeVerdict(votes, "X", "C").verdict).toBe("Include");
  });
  it("rejects on two Rejects and handles no votes", () => {
    expect(computeVerdict([v("A", "Reject"), v("B", "Reject"), v("C", "Include")], "X").verdict).toBe("Reject");
    expect(computeVerdict([], "X").verdict).toBe("Unvoted");
  });
});
