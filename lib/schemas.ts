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
});
export type TeamMember = z.infer<typeof TeamSchema>;

export const MetaSchema = z.object({
  /** null → the first trade date in trades.csv */
  launchDate: isoDate.nullable(),
  reportingCurrency: z.string().length(3),
  lastReconciled: isoDate,
  riskFreeRate: z.number().min(0).max(0.25),
  benchmark: z.string().min(1),
  maxPositionWeight: z.number().gt(0).max(1),
});
export type Meta = z.infer<typeof MetaSchema>;

export const ResearchFrontmatterSchema = z
  .object({
    ticker: z.string().min(1),
    name: z.string().min(1),
    assetClass: z.enum(ASSET_CLASSES),
    method: z.string().min(1),
    status: z.enum(["published", "in-progress"]),
    author: z.string().min(1),
    updated: isoDate,
    fairValue: z.number().positive().optional(),
    thesis: z.string().min(1),
    sellTrigger: z.string().optional(),
    model: z.string().optional(),
    /** Method-specific headline outputs, e.g. "Terminal value share of EV: 68%" */
    keyOutputs: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
  })
  .refine((f) => f.status === "in-progress" || (f.fairValue !== undefined && f.sellTrigger), {
    message: "published research needs fairValue and sellTrigger",
  });
export type ResearchFrontmatter = z.infer<typeof ResearchFrontmatterSchema>;
