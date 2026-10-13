/**
 * Regenerates ALL dummy data: instruments, trades (priced off the dummy
 * closes so returns are sane), votes, team, research write-ups, Excel models,
 * pixel avatars and the favicon.
 *
 *   npm run seed:dummy
 *
 * It overwrites data/ and content/ — only run it before you start entering
 * real data, or on a scratch branch.
 */
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { stringify as yaml } from "yaml";
import { instruments as loadInstruments } from "../lib/data";
import { generateDummyBook } from "../lib/prices/dummy";

const ROOT = process.cwd();
const w = (rel: string, body: string) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body.endsWith("\n") ? body : `${body}\n`);
};

const AS_OF = "2026-10-13"; // the "analysis date" baked into the dummy write-ups
const LAUNCH = "2026-08-17";

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------
const INSTRUMENTS = `ticker,name,asset_class,currency,feed_symbol,kind,multiplier,underlying,underlying_scale,expiry,strike,option_type,margin,maint_margin
MSFT,Microsoft,Equities,USD,MSFT,stock,1,,,,,,,
NVDA,NVIDIA,Equities,USD,NVDA,stock,1,,,,,,,
JPM,JPMorgan Chase,Equities,USD,JPM,stock,1,,,,,,,
NEE,NextEra Energy,Equities,USD,NEE,stock,1,,,,,,,
JNJ,Johnson & Johnson,Equities,USD,JNJ,stock,1,,,,,,,
CAT,Caterpillar,Equities,USD,CAT,stock,1,,,,,,,
COST,Costco,Equities,USD,COST,stock,1,,,,,,,
XOM,Exxon Mobil,Equities,USD,XOM,stock,1,,,,,,,
IEF,iShares 7-10 Year Treasury Bond ETF,Fixed Income,USD,IEF,etf,1,,,,,,,
LQD,iShares iBoxx Investment Grade Corporate Bond ETF,Fixed Income,USD,LQD,etf,1,,,,,,,
GLD,SPDR Gold Shares,Commodities,USD,GLD,etf,1,,,,,,,
SPY,SPDR S&P 500 ETF (benchmark),Equities,USD,SPY,etf,1,,,,,,,
USO,United States Oil Fund (reference for MCL),Commodities,USD,USO,etf,1,,,,,,,
MES,Micro E-mini S&P 500 future (Dec),Derivatives,USD,MES=F,future,5,SPY,10,2026-12-18,,,2500,2000
MCL,Micro WTI crude future (Nov),Derivatives,USD,MCL=F,future,100,USO,1,2026-11-20,,,2000,1500
SPY261218P640,SPY Dec 18 2026 640 put,Derivatives,USD,SPY261218P00640000,option,100,SPY,,2026-12-18,640,put,,
`;
w("data/instruments.csv", INSTRUMENTS);
w(
  "data/meta.json",
  JSON.stringify(
    {
      launchDate: null,
      reportingCurrency: "USD",
      lastReconciled: "2026-10-12",
      riskFreeRate: 0.04,
      benchmark: "SPY",
      maxPositionWeight: 0.25,
    },
    null,
    2,
  ),
);

const instruments = loadInstruments();
const book = generateDummyBook(instruments, AS_OF);
const px = (ticker: string, date: string): number => {
  const i = book.dates.indexOf(date);
  if (i < 0) throw new Error(`no trading day ${date}`);
  return book.closes[ticker][i];
};

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------
const rows: string[] = [];
const row = (
  date: string, bk: "real" | "paper", ticker: string, action: string,
  shares: number | "", price: number, fees: number | "", slice: number | "", note: string,
) => rows.push([date, bk, ticker, action, shares, price, fees, "USD", slice, note].join(","));

row(LAUNCH, "real", "CASH", "deposit", "", 100, "", "", "Starting capital");
const buys: [string, number][] = [
  ["NVDA", 9], ["MSFT", 9.5], ["XOM", 9], ["COST", 9], ["CAT", 9], ["JNJ", 9],
  ["JPM", 9], ["NEE", 9], ["GLD", 6.5], ["IEF", 8], ["LQD", 8],
];
for (const [t, usd] of buys) {
  const p = px(t, LAUNCH);
  row(LAUNCH, "real", t, "buy", Math.round((usd / p) * 1e4) / 1e4, p, 0, "", "Initial");
}
// A rebalance: trim NVDA, add to GLD
{
  const d = "2026-09-14";
  const pn = px("NVDA", d);
  const pg = px("GLD", d);
  row(d, "real", "NVDA", "sell", Math.round((2 / pn) * 1e4) / 1e4, pn, 0, "", "Trim back toward 10%");
  row(d, "real", "GLD", "buy", Math.round((2 / pg) * 1e4) / 1e4, pg, 0, "", "Rebalance into gold");
}
for (const [d, t, amt] of [
  ["2026-09-02", "IEF", 0.03], ["2026-09-02", "LQD", 0.03], ["2026-09-08", "JNJ", 0.07],
  ["2026-09-15", "XOM", 0.06], ["2026-10-01", "IEF", 0.03], ["2026-10-01", "LQD", 0.03],
  ["2026-10-01", "JPM", 0.05],
] as [string, string, number][]) {
  row(d, "real", t, "dividend", "", amt, "", "", "Dividend");
}
for (const [d, t, slice, note] of [
  ["2026-08-18", "MES", 10, "Long front-month"],
  ["2026-08-18", "MCL", 10, "Long front-month"],
  ["2026-08-18", "SPY261218P640", 5, "Portfolio hedge"],
] as [string, string, number, string][]) {
  row(d, "paper", t, "buy", 1, px(t, d), "", slice, note);
}
w("data/trades.csv", `date,book,ticker,action,shares,price,fees,currency,notional_slice,note\n${rows.join("\n")}`);

// ---------------------------------------------------------------------------
// Team, votes
// ---------------------------------------------------------------------------
w(
  "data/team.csv",
  `initials,name,bio,avatar
A,Person A,"Placeholder bio. Likes cash-flow models and slow, boring compounders.",/avatars/a.svg
B,Person B,"Placeholder bio. Chases growth, then argues about the discount rate.",/avatars/b.svg
C,Person C,"Placeholder bio. Energy, staples and anything with a margin call.",/avatars/c.svg`,
);

const voteRows: string[] = [];
const vote = (date: string, ticker: string, voter: string, v: string, c: string, note = "") =>
  voteRows.push([date, ticker, voter, v, c, note].join(","));
const panel = (
  date: string, ticker: string,
  a: [string, string, string?], b: [string, string, string?], c: [string, string, string?],
) => {
  vote(date, ticker, "A", a[0], a[1], a[2]);
  vote(date, ticker, "B", b[0], b[1], b[2]);
  vote(date, ticker, "C", c[0], c[1], c[2]);
};
panel("2026-08-10", "NVDA", ["Include", "High"], ["Include", "High"], ["Include", "Medium"]);
panel("2026-08-10", "MSFT", ["Include", "High"], ["Watch", "Medium", "Waiting for Q1 earnings"], ["Include", "Medium"]);
vote("2026-09-14", "MSFT", "B", "Include", "High", "Copilot seat data changed my mind");
panel("2026-08-10", "XOM", ["Include", "High"], ["Watch", "Medium", "Waiting for Q3 earnings"], ["Include", "High"]);
panel("2026-08-11", "NEE", ["Include", "High"], ["Include", "Medium"], ["Watch", "Medium", "Rate sensitivity"]);
panel("2026-08-11", "JNJ", ["Include", "Medium"], ["Include", "High"], ["Include", "Medium"]);
panel("2026-08-11", "CAT", ["Watch", "Medium", "Priced for the cycle"], ["Include", "High"], ["Watch", "Medium"]);
panel("2026-08-12", "JPM", ["Include", "High"], ["Watch", "Medium", "NII has peaked"], ["Watch", "Medium", "NII has peaked"]);
panel("2026-08-12", "COST", ["Watch", "Low", "Model not finished"], ["Watch", "Low", "Model not finished"], ["Watch", "Low", "Model not finished"]);
panel("2026-08-12", "IEF", ["Include", "High"], ["Include", "Medium"], ["Include", "Medium"]);
panel("2026-08-12", "LQD", ["Watch", "Medium", "Spreads are tight"], ["Include", "Medium"], ["Include", "Medium"]);
panel("2026-08-13", "GLD", ["Include", "Medium"], ["Include", "High"], ["Watch", "Medium", "Scorecard only 3/5"]);
panel("2026-08-13", "MES", ["Include", "Medium"], ["Include", "High"], ["Include", "Medium"]);
panel("2026-08-13", "MCL", ["Watch", "Low", "Backwardation helps but vol is huge"], ["Reject", "Medium", "Margin calls"], ["Include", "Medium"]);
panel("2026-08-13", "SPY261218P640", ["Include", "Medium", "Cheap hedge"], ["Watch", "Low"], ["Watch", "Low"]);
vote("2026-09-28", "JPM", "A", "Watch", "Medium", "Accepting the NII point");
w("data/votes.csv", `date,ticker,voter,vote,conviction,note\n${voteRows.join("\n")}`);

// ---------------------------------------------------------------------------
// Research write-ups
// ---------------------------------------------------------------------------
const f$ = (n: number) => `$${n.toFixed(2)}`;
const f0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const fp = (n: number, dp = 1) => `${(n * 100).toFixed(dp)}%`;

interface Spec {
  ticker: string;
  author: "A" | "B" | "C";
  updated: string;
  upside: number;
  thesis: string;
  sellTrigger: string;
  risk: string;
  status?: "in-progress";
  type: "dcf" | "bank" | "ddm" | "bond" | "gold" | "future" | "option";
  p: Record<string, number | string>;
}

const SPECS: Spec[] = [
  {
    ticker: "MSFT", author: "A", updated: "2026-10-10", upside: 0.16, type: "dcf",
    thesis: "Azure and Copilot keep cloud growth above 25%, so operating margins keep expanding through 2030.",
    sellTrigger: "Fair value reached, or Azure growth below 20% for two quarters.",
    risk: "AI capex outruns monetisation: free-cash-flow margin compresses for several years before Copilot revenue arrives.",
    p: { cagr: 0.14, margin: 0.47, wacc: 0.085, g: 0.03, tv: 0.68 },
  },
  {
    ticker: "NVDA", author: "B", updated: "2026-10-08", upside: 0.17, type: "dcf",
    thesis: "Data-centre demand outlasts the current capex wave because inference workloads keep compounding.",
    sellTrigger: "Fair value reached, or hyperscaler capex guidance is cut two quarters in a row.",
    risk: "Customer concentration: four buyers are most of data-centre revenue, and they are all building their own chips.",
    p: { cagr: 0.22, margin: 0.58, wacc: 0.095, g: 0.035, tv: 0.72 },
  },
  {
    ticker: "XOM", author: "C", updated: "2026-10-12", upside: 0.16, type: "dcf",
    thesis: "Low-cost Permian and Guyana barrels fund buybacks even if oil drifts toward $65.",
    sellTrigger: "Fair value reached, or oil below $60 for a full quarter.",
    risk: "A sustained oil price below $60 turns the free-cash-flow story into a dividend-cover story.",
    p: { cagr: 0.03, margin: 0.14, wacc: 0.08, g: 0.02, tv: 0.62 },
  },
  {
    ticker: "CAT", author: "B", updated: "2026-10-04", upside: 0.06, type: "dcf",
    thesis: "The infrastructure and power-generation cycle is real but mostly priced in.",
    sellTrigger: "Fair value reached, or dealer inventories build for two quarters.",
    risk: "Cyclical peak: order backlog flattening would take the multiple down before earnings fall.",
    p: { cagr: 0.06, margin: 0.17, wacc: 0.088, g: 0.025, tv: 0.66 },
  },
  {
    ticker: "JPM", author: "A", updated: "2026-10-05", upside: 0.08, type: "bank",
    thesis: "Best-in-class bank, but net interest income has peaked, so it only earns a Watch.",
    sellTrigger: "Fair value reached, or ROTE below 15% for two quarters.",
    risk: "Credit costs normalising while rate cuts squeeze net interest income at the same time.",
    p: { coe: 0.095, rote: 0.19, avgRote: 0.175, g: 0.03, ptbv: 2.6 },
  },
  {
    ticker: "NEE", author: "A", updated: "2026-10-09", upside: 0.21, type: "ddm",
    thesis: "Rate cuts re-rate the regulated utility while the renewables pipeline sustains dividend growth.",
    sellTrigger: "Fair value reached, or payout ratio above 75%.",
    risk: "Higher-for-longer rates raise the cost of funding a very large build programme.",
    p: { div: 2.06, g1: 0.06, g2: 0.035, coe: 0.078, payout: 0.58, roe: 0.11 },
  },
  {
    ticker: "JNJ", author: "B", updated: "2026-10-01", upside: 0.15, type: "ddm",
    thesis: "Pharma pipeline growth offsets talc-litigation overhang; the dividend is well covered.",
    sellTrigger: "Fair value reached, or a talc settlement above $15bn.",
    risk: "Litigation outcome far worse than provisioned, or a patent cliff arriving earlier than modelled.",
    p: { div: 5.2, g1: 0.05, g2: 0.03, coe: 0.07, payout: 0.55, roe: 0.22 },
  },
  {
    ticker: "IEF", author: "A", updated: "2026-09-30", upside: 0.03, type: "bond",
    thesis: "Intermediate Treasuries diversify equity risk and lift the portfolio's Sharpe ratio at a 7% weight.",
    sellTrigger: "Yield below 3.5%, or equity-bond correlation stays above +0.4 for a quarter.",
    risk: "Inflation re-accelerates: bonds and equities fall together and the diversification benefit disappears.",
    p: { yield: 0.041, duration: 7.3, spread: 0 },
  },
  {
    ticker: "GLD", author: "B", updated: "2026-10-06", upside: 0.09, type: "gold",
    thesis: "Gold hedges falling real rates and a weaker dollar, and it has near-zero correlation with the equity book.",
    sellTrigger: "Scorecard falls to 2/5 or fewer, or real yields rise above 2.5%.",
    risk: "A surprise rise in real yields with a stronger dollar: the two main supports turn into headwinds together.",
    p: { score: 3, corr: -0.05 },
  },
  {
    ticker: "MES", author: "B", updated: "2026-10-02", upside: 0.01, type: "future",
    thesis: "Long micro S&P futures give cheap equity beta; contango is the cost of carry, not a signal.",
    sellTrigger: "Margin call, or the contract rolls with basis wider than 1.5%.",
    risk: "A 1.5% index drop wipes out the excess margin and triggers a margin call.",
    p: { under: "SPY", scale: 10 },
  },
  {
    ticker: "MCL", author: "C", updated: "2026-10-03", upside: -0.03, type: "future",
    thesis: "Backwardation pays us to hold crude, but volatility makes margin calls the real risk.",
    sellTrigger: "Margin call, or the curve flips to contango.",
    risk: "Crude is more than 30% volatile; one bad week is a margin call on a tiny account.",
    p: { under: "USO", scale: 1 },
  },
  {
    ticker: "SPY261218P640", author: "A", updated: "2026-10-07", upside: 0.06, type: "option",
    thesis: "A six-month 640 put costs a few percent of a $5 slice and caps tail risk on the equity book.",
    sellTrigger: "Roll or sell at 30 days to expiry, or implied vol above 30%.",
    risk: "Time decay: if equities grind higher the premium bleeds to zero.",
    p: { strike: 640 },
  },
  {
    ticker: "COST", author: "C", updated: "2026-10-11", upside: 0, type: "dcf", status: "in-progress",
    thesis: "Membership-fee compounding earns a premium multiple. The open question is how much.",
    sellTrigger: "",
    risk: "",
    p: {},
  },
];

const nameOf = (t: string) => instruments.find((i) => i.ticker === t)!.name;
const classOf = (t: string) => instruments.find((i) => i.ticker === t)!.asset_class;
const METHOD: Record<Spec["type"], string> = {
  dcf: "DCF", bank: "Residual income / P/B", ddm: "Two-stage DDM", bond: "Representative bond",
  gold: "Scorecard", future: "Cost of carry", option: "Black-Scholes",
};
const slug = (t: string) => (t === "SPY261218P640" ? "spy261218p640" : t.toLowerCase());
const spot = (t: string) => px(t, AS_OF);

function table(head: string[], body: string[][]): string {
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map((_, i) => (i === 0 ? "---" : "---:")).join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

function body(s: Spec, fv: number, price: number): { text: string; outputs: { label: string; value: string }[] } {
  const name = nameOf(s.ticker);
  const up = fv / price - 1;
  const lead = `At the ${AS_OF.slice(5).replace("-", "/")} close of **${f$(price)}**, our fair value is **${f$(fv)}** (${up >= 0 ? "+" : "−"}${fp(Math.abs(up))}).`;
  const sections: string[] = [];
  let outputs: { label: string; value: string }[] = [];

  if (s.type === "dcf") {
    const { cagr, margin, wacc, g, tv } = s.p as Record<string, number>;
    const grid = [-0.005, 0, 0.005].map((dw) =>
      [fp(wacc + dw), ...[-0.005, 0, 0.005].map((dg) => {
        const v = fv * ((wacc - g) / (wacc + dw - (g + dg)));
        return dw === 0 && dg === 0 ? `**${f0(v)}**` : f0(v);
      })],
    );
    sections.push(
      `## Valuation\n\nWe value ${name} with a five-year, two-stage discounted cash flow. ${lead} This is **dummy analysis**: replace it with your own model.\n\n` +
        table(["Assumption", "Base case"], [
          ["Revenue CAGR (5y)", fp(cagr)], ["Operating margin (year 5)", fp(margin)],
          ["WACC", fp(wacc)], ["Terminal growth", fp(g)], ["Terminal value share of EV", fp(tv, 0)],
        ]) +
        `\n\n### Sensitivity: fair value by WACC and terminal growth\n\n` +
        table(["WACC \\ g", fp(g - 0.005), fp(g), fp(g + 0.005)], grid),
      `## What the price implies\n\nA reverse DCF says the market price already discounts roughly **${fp(cagr * (1 - up * 0.6))}** revenue growth a year for five years. We assume ${fp(cagr)}, which is where the upside comes from.`,
    );
    outputs = [
      { label: "Terminal value share of EV", value: fp(tv, 0) },
      { label: "Implied revenue CAGR", value: fp(cagr * (1 - up * 0.6)) },
    ];
  } else if (s.type === "bank") {
    const { coe, rote, avgRote, g, ptbv } = s.p as Record<string, number>;
    const implied = rote * (1 - up * 0.9) * 0.85;
    sections.push(
      `## Valuation\n\nBanks do not have meaningful free cash flow, so we use a residual-income model anchored on price to tangible book. ${lead}\n\n` +
        table(["Assumption", "Base case"], [
          ["Cost of equity", fp(coe)], ["Sustainable ROTE", fp(rote)], ["5-year average ROTE", fp(avgRote)],
          ["Long-run growth", fp(g)], ["Fair P/TBV", `${ptbv.toFixed(1)}×`],
        ]),
      `## What the price implies\n\nAt today's price the market is paying for an ROTE of about **${fp(implied)}**, below the five-year average of ${fp(avgRote)}. The gap to our ${fp(rote)} is the upside, and it is narrow, hence Watch.`,
    );
    outputs = [
      { label: "Implied ROTE", value: fp(implied) },
      { label: "5-year average ROTE", value: fp(avgRote) },
    ];
  } else if (s.type === "ddm") {
    const { div, g1, g2, coe, payout, roe } = s.p as Record<string, number>;
    const sustainable = roe * (1 - payout);
    sections.push(
      `## Valuation\n\nA two-stage dividend discount model: faster dividend growth for five years, then a fade to a long-run rate. ${lead}\n\n` +
        table(["Assumption", "Base case"], [
          ["Current dividend per share", f$(div)], ["Stage 1 growth (5y)", fp(g1)],
          ["Stage 2 growth", fp(g2)], ["Cost of equity", fp(coe)],
        ]),
      `## What the price implies\n\nSustainable-growth check: ROE ${fp(roe, 0)} × retention ${fp(1 - payout, 0)} = **${fp(sustainable)}**. ${sustainable >= g1 ? "That comfortably supports our stage 1 growth." : "That is below our stage 1 growth, so the early dividend growth relies on leverage and needs watching."} The current price implies stage 1 growth of about ${fp(g1 * (1 - up * 0.7))}.`,
    );
    outputs = [
      { label: "Sustainable growth (ROE × retention)", value: fp(sustainable) },
      { label: "Payout ratio", value: fp(payout, 0) },
    ];
  } else if (s.type === "bond") {
    const { yield: y, duration, spread } = s.p as Record<string, number>;
    sections.push(
      `## Valuation\n\nBond ETFs are valued as one representative bond, not with a cash-flow model. ${lead} (Fair value here is the price consistent with the yield we require.)\n\n` +
        table(["Metric", "Value"], [
          ["Yield to maturity", fp(y)], ["Modified duration", `${duration.toFixed(1)} years`],
          ["Loss if rates rise 1pt", `−${fp(duration / 100)}`], ["Credit spread", spread ? `${spread}bp` : "n/a (Treasuries)"],
        ]),
      `## What the price implies\n\nThe yield pays us for the duration risk only if rates stay put. The job of this position is diversification, not return: adding it at a 7% weight lowers portfolio volatility.`,
    );
    outputs = [
      { label: "Yield", value: fp(y) },
      { label: "Loss on +1pt rates", value: `−${fp(duration / 100)}` },
    ];
  } else if (s.type === "gold") {
    const { score, corr } = s.p as Record<string, number>;
    const items: [string, boolean][] = [
      ["Real yields falling", true], ["US dollar weakening", true], ["Central-bank buying", true],
      ["ETF flows positive", false], ["Positioning not stretched", false],
    ];
    sections.push(
      `## Valuation\n\nGold has no cash flows, so we score it on five drivers instead. ${lead} (Fair value is the midpoint of a scorecard-implied range.)\n\n` +
        table(["Driver", "Supportive?"], items.map(([k, v]) => [k, v ? "✓" : "✗"])) +
        `\n\n**Scorecard: ${score}/5.**`,
      `## What the price implies\n\nCorrelation with the rest of the portfolio is about **${corr.toFixed(2)}**, which is the real reason to hold it: it should lower portfolio volatility at a 10% weight.`,
    );
    outputs = [
      { label: "Scorecard", value: `${score}/5` },
      { label: "Correlation with portfolio", value: corr.toFixed(2) },
    ];
  } else if (s.type === "future") {
    const under = s.p.under as string;
    const scale = s.p.scale as number;
    const inst = instruments.find((i) => i.ticker === s.ticker)!;
    const s0 = spot(under) * scale;
    const t = (Date.parse(inst.expiry!) - Date.parse(AS_OF)) / 86_400_000 / 365;
    const basis = price - s0;
    const roll = -(price / s0 - 1) / t;
    sections.push(
      `## Valuation\n\nFutures are priced by cost of carry: fair futures price = spot × e^((r − y) × T). ${lead}\n\n` +
        table(["Metric", "Value"], [
          ["Spot reference", f$(s0)], ["Futures price", f$(price)], ["Basis (F − S)", `${basis >= 0 ? "+" : "−"}${f$(Math.abs(basis))}`],
          ["Roll yield (annualised)", `${roll >= 0 ? "+" : "−"}${fp(Math.abs(roll))}`],
          ["Notional per contract", f0(price * inst.multiplier)], ["Initial margin", f0(inst.margin ?? 0)],
          ["Leverage", `${((price * inst.multiplier) / (inst.margin ?? 1)).toFixed(1)}×`],
        ]),
      `## What the price implies\n\nThe curve is in **${basis >= 0 ? "contango" : "backwardation"}**, so holding the contract ${basis >= 0 ? "costs" : "earns"} roughly ${fp(Math.abs(roll))} a year before price moves.`,
    );
    outputs = [
      { label: "Roll yield", value: `${roll >= 0 ? "+" : "−"}${fp(Math.abs(roll))} / yr` },
      { label: "Leverage", value: `${((price * inst.multiplier) / (inst.margin ?? 1)).toFixed(1)}×` },
    ];
  } else {
    const inst = instruments.find((i) => i.ticker === s.ticker)!;
    const s0 = spot("SPY");
    sections.push(
      `## Valuation\n\nOptions are priced with Black-Scholes. ${lead} The model uses recent realised volatility; the market price is higher because implied vol runs richer than realised.\n\n` +
        table(["Metric", "Value"], [
          ["Underlying (SPY)", f$(s0)], ["Strike", f$(inst.strike ?? 0)], ["Expiry", inst.expiry ?? ""],
          ["Premium paid", f$(px(s.ticker, "2026-08-18"))], ["Market mark", f$(price)], ["Model value", f$(fv)],
        ]),
      `## What the price implies\n\nLive implied volatility, delta, theta and vega are on this page below and on the Inside the Fund page.`,
    );
    outputs = [{ label: "Model vs market", value: `${f$(fv)} vs ${f$(price)}` }];
  }

  if (s.risk) sections.push(`## Biggest risk\n\n${s.risk}`);
  return { text: sections.join("\n\n"), outputs };
}

const modelFiles: { file: string; spec: Spec; fv: number; outputs: { label: string; value: string }[] }[] = [];

for (const s of SPECS) {
  const price = spot(s.ticker);
  const inProgress = s.status === "in-progress";
  const fv = Math.round(price * (1 + s.upside) * 100) / 100;
  const front: Record<string, unknown> = {
    ticker: s.ticker,
    name: nameOf(s.ticker),
    assetClass: classOf(s.ticker),
    method: METHOD[s.type],
    status: inProgress ? "in-progress" : "published",
    author: s.author,
    updated: s.updated,
  };
  let md: string;
  if (inProgress) {
    front.thesis = s.thesis;
    md = `## Status\n\nThe model for ${nameOf(s.ticker)} is not finished yet. Planned approach: a two-stage DCF with membership-fee revenue modelled separately, then a reverse DCF on the current multiple.\n\n- [x] Revenue build\n- [ ] Margin assumptions\n- [ ] Terminal value cross-check\n`;
  } else {
    const { text, outputs } = body(s, fv, price);
    front.fairValue = fv;
    front.thesis = s.thesis;
    front.sellTrigger = s.sellTrigger;
    front.model = `/models/${slug(s.ticker)}-${s.type === "dcf" ? "dcf" : s.type}.xlsx`;
    front.keyOutputs = outputs;
    md = text;
    modelFiles.push({ file: front.model as string, spec: s, fv, outputs });
  }
  w(`content/research/${slug(s.ticker)}.mdx`, `---\n${yaml(front).trim()}\n---\n\n${md}\n`);
}

// ---------------------------------------------------------------------------
// Excel models (dummy)
// ---------------------------------------------------------------------------
async function models() {
  for (const m of modelFiles) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Summary");
    ws.addRow([`${nameOf(m.spec.ticker)} (${m.spec.ticker}): ${METHOD[m.spec.type]}`]).font = { bold: true, size: 14 };
    ws.addRow(["DUMMY MODEL: replace with your own workbook."]);
    ws.addRow([]);
    ws.addRow(["Fair value", m.fv]);
    ws.addRow(["Price (" + AS_OF + ")", spot(m.spec.ticker)]);
    ws.addRow(["Author", `Person ${m.spec.author}`]);
    for (const o of m.outputs) ws.addRow([o.label, o.value]);
    ws.addRow([]);
    ws.addRow(["Assumptions"]).font = { bold: true };
    for (const [k, v] of Object.entries(m.spec.p)) ws.addRow([k, v]);
    ws.getColumn(1).width = 34;
    ws.getColumn(2).width = 18;
    await wb.xlsx.writeFile(path.join(ROOT, "public", m.file));
  }
}

// ---------------------------------------------------------------------------
// Avatars + favicon
// ---------------------------------------------------------------------------
type Grid = string[][];
const blank = (): Grid => Array.from({ length: 16 }, () => Array(16).fill("."));
const fill = (g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c;
};

function face(opts: { bg: string; hair: string; skin: string; shirt: string; style: "short" | "glasses" | "cap" }): string {
  const g = blank();
  fill(g, 0, 0, 15, 15, "b");
  fill(g, 3, 13, 12, 15, "s"); // shoulders
  fill(g, 6, 12, 9, 12, "k"); // neck
  fill(g, 4, 4, 11, 11, "k"); // head
  fill(g, 5, 12, 10, 12, "k");
  g[7][6] = "e"; g[7][9] = "e"; // eyes
  fill(g, 7, 10, 8, 10, "m"); // mouth
  if (opts.style === "short") {
    fill(g, 4, 2, 11, 4, "h"); fill(g, 3, 3, 3, 6, "h"); fill(g, 12, 3, 12, 6, "h");
  } else if (opts.style === "glasses") {
    fill(g, 4, 2, 11, 3, "h"); fill(g, 3, 3, 3, 9, "h"); fill(g, 12, 3, 12, 9, "h");
    fill(g, 5, 6, 7, 8, "g"); fill(g, 8, 6, 10, 8, "g");
    g[7][6] = "e"; g[7][9] = "e"; g[7][5] = "g"; g[7][7] = "g"; g[7][8] = "g"; g[7][10] = "g";
    g[6][6] = "k"; g[8][6] = "k"; g[6][9] = "k"; g[8][9] = "k"; g[6][5] = "g"; g[6][7] = "g"; g[8][5] = "g"; g[8][7] = "g";
    g[6][8] = "g"; g[6][10] = "g"; g[8][8] = "g"; g[8][10] = "g";
  } else {
    fill(g, 4, 1, 11, 3, "h"); fill(g, 2, 4, 13, 4, "h"); fill(g, 3, 5, 3, 6, "k");
  }
  const col: Record<string, string> = {
    b: opts.bg, k: opts.skin, h: opts.hair, s: opts.shirt, e: "#1b1b1f", m: "#8a3b3b", g: "#2d2d33",
  };
  const rects: string[] = [];
  g.forEach((r, y) => r.forEach((c, x) => {
    if (c !== ".") rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`);
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}
w("public/avatars/a.svg", face({ bg: "#cfe0ff", hair: "#3b2a20", skin: "#f0c8a0", shirt: "#2f4b8f", style: "short" }));
w("public/avatars/b.svg", face({ bg: "#ffe2b8", hair: "#d8b25a", skin: "#e8b88c", shirt: "#8f3f2f", style: "glasses" }));
w("public/avatars/c.svg", face({ bg: "#d4f0d0", hair: "#c8442f", skin: "#f4d2b0", shirt: "#2f7a4b", style: "cap" }));

// "WDP" in a 3×5 / 5×5 pixel font, in a small accent-coloured square
const GLYPHS: Record<string, string[]> = {
  W: ["X...X", "X...X", "X.X.X", "XX.XX", "X...X"],
  D: ["XX.", "X.X", "X.X", "X.X", "XX."],
  P: ["XX.", "X.X", "XX.", "X..", "X.."],
};
{
  const rects: string[] = [];
  let x = 1;
  for (const ch of "WDP") {
    const gl = GLYPHS[ch];
    gl.forEach((line, y) => [...line].forEach((c, dx) => {
      if (c === "X") rects.push(`<rect x="${x + dx}" y="${5 + y}" width="1" height="1" fill="#f6f1e4"/>`);
    }));
    x += gl[0].length + 1;
  }
  w(
    "app/icon.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#243b6b"/>${rects.join("")}</svg>`,
  );
}

models().then(() => console.log("dummy data written"));
