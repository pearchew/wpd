import { describe, expect, it } from "vitest";
import { addedRows, appendTrades, emptyTrade, parseTrades, toTrade, tradeProblems } from "@/lib/admin/trades";
import type { Instrument } from "@/lib/schemas";
import { checkLedger, fxLookup } from "@/lib/tradeChecks";
import { price } from "@/lib/format";
import { displayTicker } from "@/lib/team";

const HEADER = "date,book,ticker,action,shares,price,fees,currency,notional_slice,note";
const CSV = `${HEADER}\n2026-10-14,real,CASH,deposit,,100,,USD,,Starting capital\n2026-10-14,real,NVDA,buy,0.2245,222.69,0,USD,,Half\n`;
const inst = (ticker: string, kind: Instrument["kind"] = "stock"): Instrument => ({
  ticker, name: ticker, asset_class: "Equities", currency: "USD", feed_symbol: ticker, kind, multiplier: 1,
});
const INST = [inst("NVDA"), inst("JNJ"), inst("MESZ6", "future")];
const known = new Set(["NVDA", "JNJ"]);
const row = (over: Partial<ReturnType<typeof emptyTrade>>) => ({ ...emptyTrade("2026-10-20"), ...over });

describe("trade rows", () => {
  it("writes each action the way the README shows it", () => {
    const rows = [
      toTrade(row({ action: "deposit", amount: "50", note: "Top-up" }), INST),
      toTrade(row({ action: "buy", ticker: "jnj", shares: "0.1234", price: "160.25", note: "New position" }), INST),
      toTrade(row({ action: "dividend", ticker: "NVDA", amount: "0.04" }), INST),
      toTrade(row({ action: "split", ticker: "NVDA", shares: "2" }), INST),
    ];
    const out = appendTrades(CSV, rows).trim().split("\n").slice(3);
    expect(out).toEqual([
      "2026-10-20,real,CASH,deposit,,50,,USD,,Top-up",
      "2026-10-20,real,JNJ,buy,0.1234,160.25,0,USD,,New position",
      "2026-10-20,real,NVDA,dividend,,0.04,,USD,,",
      "2026-10-20,real,NVDA,split,2,,,USD,,",
    ]);
    // and the ledger reads them back unchanged
    expect(parseTrades(appendTrades(CSV, rows)).slice(2)).toEqual(rows);
  });

  it("sizes a buy by dollars to 4 decimal places", () => {
    expect(toTrade(row({ ticker: "JNJ", sizeBy: "dollars", amount: "20", price: "160.25" }), INST).shares).toBe(0.1248);
  });

  it("quotes notes with commas", () => {
    const t = toTrade(row({ action: "deposit", amount: "5", note: "Top-up, October" }), INST);
    expect(appendTrades(CSV, [t]).trim().split("\n").at(-1)).toBe('2026-10-20,real,CASH,deposit,,5,,USD,,"Top-up, October"');
  });

  it("flags missing or impossible fields", () => {
    expect(tradeProblems(row({ ticker: "JNJ", shares: "1", price: "10" }), "2026-10-20", known)).toEqual({});
    const p = tradeProblems(row({ date: "2026-10-21", ticker: "AMZN", shares: "0", price: "" }), "2026-10-20", known);
    expect(Object.keys(p).sort()).toEqual(["date", "price", "shares", "ticker"]);
    expect(tradeProblems(row({ action: "fee", amount: "" }), "2026-10-20", known).amount).toBeDefined();
  });

  it("finds the rows a branch added", () => {
    const branch = `${CSV}2026-10-20,real,CASH,deposit,,50,,USD,,Top-up\n`;
    expect(addedRows(CSV, branch)).toEqual(["2026-10-20,real,CASH,deposit,,50,,USD,,Top-up"]);
  });
});

describe("ledger checks", () => {
  const base = parseTrades(CSV);
  const m = { maxPositionWeight: 0.25 };

  it("passes the current ledger and tracks cash and holdings", () => {
    const c = checkLedger(base, INST, m);
    expect(c.errors).toEqual([]);
    expect(c.cash).toBeCloseTo(100 - 0.2245 * 222.69, 6);
    expect(c.held).toEqual({ NVDA: 0.2245 });
  });

  it("catches overselling and negative cash", () => {
    const sell = toTrade(row({ action: "sell", ticker: "NVDA", shares: "1", price: "200" }), INST);
    const buy = toTrade(row({ action: "buy", ticker: "JNJ", shares: "1", price: "500" }), INST);
    const errs = checkLedger([...base, sell, buy], INST, m, (i) => `row ${i}`).errors;
    expect(errs.some((e) => e.includes("sells more NVDA"))).toBe(true);
    expect(errs.some((e) => e.includes("cash goes negative"))).toBe(true);
  });

  it("counts a split before a later sell", () => {
    const split = toTrade(row({ action: "split", ticker: "NVDA", shares: "2" }), INST);
    const sell = toTrade(row({ action: "sell", ticker: "NVDA", shares: "0.449", price: "111" }), INST);
    expect(checkLedger([...base, split, sell], INST, m).errors).toEqual([]);
  });

  it("refuses real-book derivatives", () => {
    const fut = toTrade(row({ action: "buy", ticker: "MESZ6", shares: "1", price: "1" }), INST);
    expect(checkLedger([...base, fut], INST, m).errors[0]).toContain("must be a paper trade");
  });

  it("converts trades in other currencies at the stored rate for their date", () => {
    const jp: Instrument = { ...inst("8750.T"), currency: "JPY" };
    const fx = fxLookup({ dates: ["2026-10-13", "2026-10-14"], fx: { JPYUSD: [0.0066, 0.0068] } }, "USD");
    const buy = toTrade(row({ date: "2026-10-14", action: "buy", ticker: "8750.T", shares: "1", price: "4000" }), [...INST, jp]);
    expect(buy.currency).toBe("JPY");
    const c = checkLedger([...base, buy], [...INST, jp], m, undefined, fx);
    expect(c.errors).toEqual([]);
    expect(c.cash).toBeCloseTo(100 - 0.2245 * 222.69 - 4000 * 0.0068, 6);
    expect(c.cost["8750.T"]).toBeCloseTo(27.2, 6);
    // A trade dated after the last stored rate uses the latest one
    expect(fx("JPY", "2026-10-20")).toBe(0.0068);
  });

  it("flags a foreign-currency trade with no exchange rate", () => {
    const jp: Instrument = { ...inst("8750.T"), currency: "JPY" };
    const buy = toTrade(row({ action: "buy", ticker: "8750.T", shares: "1", price: "4000" }), [...INST, jp]);
    expect(checkLedger([...base, buy], [...INST, jp], m).errors[0]).toContain("no JPYUSD exchange rate");
  });
});

describe("display", () => {
  it("shortens only real option tickers", () => {
    expect(displayTicker("SPY261218P640")).toBe("SPY put");
    expect(displayTicker("SPY261218C700")).toBe("SPY call");
    expect(displayTicker("042660.KS")).toBe("042660.KS");
  });

  it("formats prices in the asset's own currency", () => {
    expect(price(182)).toBe("$182");
    expect(price(4032.04, "JPY")).toBe("¥4,032");
    expect(price(7.5, "AUD")).toBe("A$7.50");
  });
});
