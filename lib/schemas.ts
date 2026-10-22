import { z } from "zod";

/** Zod schemas for every file a human edits. Run by `npm run validate` before each build. */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "not a real date");

// CSV cells are strings; blank cells become undefined.
const optNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().finite().optional(),
);
const optStr = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : String(v)),
  z.string().optional(),
);

export const ASSET_CLASSES = ["Equities", "Fixed Income", "Commodities", "Derivatives"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const InstrumentSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  asset_class: z.enum(ASSET_CLASSES),
  currency: z.string().length(3),
  feed_symbol: z.string().min(1),
  kind: z.enum(["stock", "etf", "future", "option"]),
  multiplier: z.preprocess((v) => (v === "" ? 1 : Number(v)), z.number().positive()),
  underlying: optStr,
  underlying_scale: optNum,
  expiry: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  strike: optNum,
  option_type: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["call", "put"]).optional()),
  margin: optNum, // initial margin per contract (futures)
  maint_margin: optNum, // maintenance margin per contract (futures)
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const TradeSchema = z.object({
  date: isoDate,
  book: z.enum(["real", "paper"]),
  ticker: z.string().min(1),
  action: z.enum(["buy", "sell", "dividend", "deposit", "withdrawal", "fee", "split"]),
  shares: optNum,
  price: optNum,
  fees: z.preprocess((v) => (v === "" || v === undefined ? 0 : Number(v)), z.number().min(0)),
  currency: z.string().length(3),
  notional_slice: optNum,
  note: z.preprocess((v) => (v === undefined ? "" : v), z.string()),
});
export type Trade = z.infer<typeof TradeSchema>;

export const VoteSchema = z.object({
  date: isoDate,
  ticker: z.string().min(1),
  voter: z.string().min(1),
  vote: z.enum(["Include", "Watch", "Reject"]),
  conviction: z.enum(["High", "Medium", "Low"]),
  note: z.preprocess((v) => (v === undefined ? "" : v), z.string()),
});
export type Vote = z.infer<typeof VoteSchema>;

export const TeamSchema = z.object({
  initials: z.string().min(1).max(3),
  name: z.string().min(1),
  bio: z.string().min(1),
  avatar: z.string().min(1),
  /** Pipe-separated in the CSV, e.g. "Hong Kong|US|Commodities" */
  focuses: z
    .string()
    .default("")
    .transform((s) => s.split("|").map((f) => f.trim()).filter(Boolean)),
});
export type TeamMember = z.infer<typeof TeamSchema>;

export const MetaSchema = z.object({
  /** null → the first trade date in trades.csv */
  launchDate: isoDate.nullable(),
  reportingCurrency: z.string().length(3),
  lastReconciled: isoDate.nullable(),
  riskFreeRate: z.number().min(0).max(0.25),
  benchmark: z.string().min(1),
  maxPositionWeight: z.number().gt(0).max(1),
});
export type Meta = z.infer<typeof MetaSchema>;

/** The author's position at the end of the research. Every view is published, neutral and watch included. */
export const VIEWS = ["Long", "Short", "Neutral", "Watch"] as const;
export type View = (typeof VIEWS)[number];

/** The trading-strategy families a report can test. */
export const STRATEGY_FAMILIES = [
  "Momentum",
  "Mean reversion",
  "Event-driven",
  "Carry",
  "Value and quality",
  "Pairs",
  "Sentiment and news",
] as const;
export type StrategyFamily = (typeof STRATEGY_FAMILIES)[number];

const optText = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().optional());

export const ResearchFrontmatterSchema = z
  .object({
    // The asset
    ticker: z.string().min(1),
    name: z.string().min(1),
    assetClass: z.enum(ASSET_CLASSES),
    /** Where it trades, e.g. NASDAQ, TSE, KRX, ASX, COMEX */
    exchange: optText,
    author: z.string().min(1),
    /** First publication; set by the form the first time the status is published */
    published: z.preprocess((v) => (v === "" || v === null ? undefined : v), isoDate.optional()),
    updated: isoDate,
    status: z.enum(["published", "in-progress"]),
    // The call
    view: z.enum(VIEWS).optional(),
    thesis: z.string().min(1),
    strategy: z
      .object({
        family: z.enum(STRATEGY_FAMILIES),
        /** The rule being tested, in plain words */
        rule: optText,
        entry: optText,
        exit: optText,
        holding: optText,
        /** Source paper(s) the rule comes from */
        papers: optText,
      })
      .optional(),
    // Optional Excel model
    model: optText,
  })
  .refine((f) => f.status === "in-progress" || (f.view && f.strategy), {
    message: "published research needs a view and a strategy family",
  });
export type ResearchFrontmatter = z.infer<typeof ResearchFrontmatterSchema>;
