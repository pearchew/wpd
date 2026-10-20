import { describe, expect, it } from "vitest";
import { appendInstrumentRow, assetProblems, emptyAsset, instrumentRow, optionSymbols, toInstrument } from "@/lib/admin/assets";
import { parseInstruments } from "@/lib/admin/trades";
import { checkInstruments } from "@/lib/instrumentChecks";
import { tradeProblems, emptyTrade } from "@/lib/admin/trades";

const HEADER = "ticker,name,asset_class,currency,feed_symbol,kind,multiplier,underlying,underlying_scale,expiry,strike,option_type,margin,maint_margin";
const CSV = `${HEADER}\nMSFT,Microsoft,Equities,USD,MSFT,stock,1,,,,,,,\nSPY,SPDR S&P 500 ETF (benchmark),Equities,USD,SPY,etf,1,,,,,,,\n`;
const existing = parseInstruments(CSV);
const TODAY = "2026-10-20";
const last = (csv: string) => csv.trim().split("\n").at(-1);

describe("add asset", () => {
  it("writes a stock row like the hand-written ones", () => {
    const a = { ...emptyAsset("stock"), ticker: "JNJ", name: "Johnson & Johnson" };
    expect(assetProblems(a, existing, TODAY)).toEqual({});
    expect(last(appendInstrumentRow(CSV, instrumentRow(a)))).toBe("JNJ,Johnson & Johnson,Equities,USD,JNJ,stock,1,,,,,,,");
  });

  it("rebuilds the original MES future row exactly", () => {
    const a = {
      ...emptyAsset("future"),
      ticker: "MES",
      name: "Micro E-mini S&P 500 future (Dec)",
      feedSymbol: "MES=F",
      multiplier: "5",
      underlying: "SPY",
      underlyingScale: "10",
      expiry: "2026-12-18",
      margin: "2,500",
      maintMargin: "2000",
    };
    expect(assetProblems(a, existing, TODAY)).toEqual({});
    expect(last(appendInstrumentRow(CSV, instrumentRow(a)))).toBe(
      "MES,Micro E-mini S&P 500 future (Dec),Derivatives,USD,MES=F,future,5,SPY,10,2026-12-18,,,2500,2000",
    );
  });

  it("names options the way the ledger does and rebuilds the original SPY put row", () => {
    const a = { ...emptyAsset("option"), underlying: "SPY", expiry: "2026-12-18", strike: "640", optionType: "put" as const };
    expect(optionSymbols(a)).toEqual({ ticker: "SPY261218P640", feedSymbol: "SPY261218P00640000", name: "SPY Dec 18 2026 640 put" });
    expect(assetProblems(a, existing, TODAY)).toEqual({});
    expect(last(appendInstrumentRow(CSV, instrumentRow(a)))).toBe(
      "SPY261218P640,SPY Dec 18 2026 640 put,Derivatives,USD,SPY261218P00640000,option,100,SPY,,2026-12-18,640,put,,",
    );
  });

  it("refuses duplicates, wrong classes, missing derivative details and past expiries", () => {
    expect(assetProblems({ ...emptyAsset("stock"), ticker: "MSFT", name: "x" }, existing, TODAY).ticker).toContain("already");
    expect(assetProblems({ ...emptyAsset("stock"), ticker: "X", name: "x", assetClass: "Derivatives" }, existing, TODAY).assetClass).toBeDefined();
    const fut = assetProblems({ ...emptyAsset("future"), ticker: "MCL", name: "x", multiplier: "100", expiry: "2026-01-01" }, existing, TODAY);
    expect(Object.keys(fut).sort()).toEqual(["expiry", "margin", "underlying"]);
    const opt = assetProblems({ ...emptyAsset("option"), underlying: "MSFT", expiry: "2026-12-18", strike: "" }, existing, TODAY);
    expect(opt.strike).toBeDefined();
    expect(opt.ticker).toBeDefined();
  });

  it("passes the build's instrument checks once added", () => {
    const a = { ...emptyAsset("option"), underlying: "MSFT", expiry: "2026-12-18", strike: "2.5", optionType: "call" as const };
    const next = parseInstruments(appendInstrumentRow(CSV, instrumentRow(a)));
    expect(next.at(-1)?.ticker).toBe("MSFT261218C2_5");
    expect(checkInstruments(next, "SPY")).toEqual([]);
    expect(toInstrument(instrumentRow(a)).strike).toBe(2.5);
  });
});

describe("trade form guard", () => {
  it("won't buy an asset that has no price history yet", () => {
    const t = { ...emptyTrade(TODAY), ticker: "JNJ", shares: "1", price: "150" };
    expect(tradeProblems(t, TODAY, new Set(["JNJ"]), new Set(["MSFT"])).ticker).toContain("No price history");
    expect(tradeProblems(t, TODAY, new Set(["JNJ"]), new Set(["JNJ"]))).toEqual({});
  });
});
