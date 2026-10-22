import { afterEach, describe, expect, it, vi } from "vitest";
import { YahooFeed, parseYahooChart } from "@/lib/feed";

const chart = (gmtoffset: number, timestamp: number[], close: (number | null)[]) => ({
  chart: { result: [{ meta: { gmtoffset }, timestamp, indicators: { quote: [{ close }] } }], error: null },
});

describe("Yahoo chart parsing", () => {
  it("dates bars in the exchange's time zone and skips empty ones", () => {
    // Tokyo opens 09:00 JST = 00:00 UTC
    const tokyo = chart(32_400, [1792454400, 1792540800], [4012.5, null]);
    expect(parseYahooChart("8750.T", tokyo)).toEqual([{ symbol: "8750.T", date: "2026-10-20", close: 4012.5 }]);
    // ASX opens 10:00 AEDT = 23:00 UTC the day before, so UTC would get the date wrong
    const asx = chart(39_600, [1792454400 - 3600], [7.42]);
    expect(parseYahooChart("LYC.AX", asx)[0].date).toBe("2026-10-20");
    // New York 09:30 EDT
    const ny = chart(-14_400, [1792503000, 1792589400], [652.1, 655.3]);
    expect(parseYahooChart("SPY", ny).map((c) => c.date)).toEqual(["2026-10-20", "2026-10-21"]);
  });

  it("returns nothing for an error response", () => {
    expect(parseYahooChart("NOPE", { chart: { result: null, error: { code: "Not Found" } } })).toEqual([]);
  });
});

describe("Yahoo feed", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (bySymbol: Record<string, number | object>) =>
    vi.fn(async (url: URL) => {
      const sym = decodeURIComponent(String(url).split("/chart/")[1].split("?")[0]);
      const r = bySymbol[sym];
      return typeof r === "number" ? new Response("{}", { status: r }) : new Response(JSON.stringify(r), { status: 200 });
    });

  it("keeps the symbols that worked and leaves the rest out", async () => {
    vi.stubGlobal("fetch", respond({ "HGZ26.CMX": chart(-14_400, [1792503000], [4.91]), "BAD.X": 404, "SLOW.X": 429 }));
    const out = await new YahooFeed(0).fetchCloses(["HGZ26.CMX", "BAD.X", "SLOW.X"]);
    expect(out).toEqual([{ symbol: "HGZ26.CMX", date: "2026-10-20", close: 4.91 }]);
  });

  it("fails loudly when every symbol fails", async () => {
    vi.stubGlobal("fetch", respond({ A: 429, B: 429 }));
    await expect(new YahooFeed(0).fetchCloses(["A", "B"])).rejects.toThrow("failed for every symbol");
  });

  it("names FX pairs the Yahoo way", () => {
    expect(new YahooFeed().fxSymbol("JPY", "USD")).toBe("JPYUSD=X");
  });
});
