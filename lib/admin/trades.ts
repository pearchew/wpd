import Papa from "papaparse";
import { type Instrument, InstrumentSchema, type Trade, TradeSchema } from "../schemas";

/** Every pull request the trade form opens lives on a branch starting with this. */
export const TRADES_PREFIX = "admin/trades-";

export const ACTIONS = ["buy", "sell", "deposit", "withdrawal", "fee", "dividend", "split"] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABEL: Record<Action, string> = {
  buy: "Buy",
  sell: "Sell",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  fee: "Fee",
  dividend: "Dividend",
  split: "Stock split",
};

/** Actions on the fund's cash rather than an asset: the ticker is always CASH. */
export const CASH_ACTIONS: readonly Action[] = ["deposit", "withdrawal", "fee"];

/** One row as the form edits it. Numbers stay strings until checked, so half-typed input survives. */
export interface TradeInput {
  date: string;
  action: Action;
  ticker: string;
  /** buy / sell: enter shares, or a dollar amount that is divided by the price */
  sizeBy: "shares" | "dollars";
  shares: string;
  amount: string;
  price: string;
  fees: string;
  note: string;
}

export const emptyTrade = (date: string): TradeInput => ({
  date,
  action: "buy",
  ticker: "",
  sizeBy: "shares",
  shares: "",
  amount: "",
  price: "",
  fees: "",
  note: "",
});

const num = (s: string) => Number(s.replace(/[$,\s]/g, ""));
const given = (s: string) => s.trim() !== "";
/** Fractional shares to 4 places, like the broker confirmations already in the ledger. */
export const roundShares = (n: number) => Math.round(n * 10000) / 10000;

export function sharesFor(t: TradeInput): number | undefined {
  if (t.action !== "buy" && t.action !== "sell") return undefined;
  if (t.sizeBy === "shares") return given(t.shares) ? num(t.shares) : undefined;
  const amount = num(t.amount);
  const price = num(t.price);
  return amount > 0 && price > 0 ? roundShares(amount / price) : undefined;
}

/** Cash in or out of the fund for this row (buy is negative). */
export function cashEffect(t: TradeInput): number {
  const fees = given(t.fees) ? num(t.fees) : 0;
  const price = num(t.price);
  switch (t.action) {
    case "buy":
      return -((sharesFor(t) ?? 0) * price) - fees;
    case "sell":
      return (sharesFor(t) ?? 0) * price - fees;
    case "deposit":
    case "dividend":
      return given(t.amount) ? num(t.amount) : 0;
    case "withdrawal":
    case "fee":
      return given(t.amount) ? -num(t.amount) : 0;
    default:
      return 0;
  }
}

/** Problems a person can fix in the row, keyed by field. */
export function tradeProblems(t: TradeInput, today: string, known: Set<string>): Partial<Record<keyof TradeInput, string>> {
  const out: Partial<Record<keyof TradeInput, string>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date) || Number.isNaN(Date.parse(t.date))) out.date = "YYYY-MM-DD";
  else if (t.date > today) out.date = "Can't be in the future";
  const cash = CASH_ACTIONS.includes(t.action);
  if (!cash) {
    if (!t.ticker.trim()) out.ticker = "Required";
    else if (!known.has(t.ticker.trim().toUpperCase())) out.ticker = "Not in the asset list yet";
  }
  if (t.action === "buy" || t.action === "sell") {
    if (!(num(t.price) > 0)) out.price = "A positive price";
    if (t.sizeBy === "shares" && !(num(t.shares) > 0)) out.shares = "A positive number of shares";
    if (t.sizeBy === "dollars") {
      if (!(num(t.amount) > 0)) out.amount = "A positive amount";
      else if (num(t.price) > 0 && !((sharesFor(t) ?? 0) > 0)) out.amount = "Too small for 4 decimal places of shares";
    }
    if (given(t.fees) && !(num(t.fees) >= 0)) out.fees = "Zero or more";
  }
  if (cash || t.action === "dividend") {
    if (!(num(t.amount) > 0)) out.amount = "A positive amount";
  }
  if (t.action === "split" && !(num(t.shares) > 0)) out.shares = "The ratio, e.g. 2 for 2-for-1";
  return out;
}

/** A checked row → the ledger's own Trade shape, as `npm run validate` would read it. */
export function toTrade(t: TradeInput, inst: Pick<Instrument, "ticker" | "currency">[]): Trade {
  const cash = CASH_ACTIONS.includes(t.action);
  const ticker = cash ? "CASH" : t.ticker.trim().toUpperCase();
  const currency = inst.find((i) => i.ticker === ticker)?.currency ?? "USD";
  const amountInPrice = cash || t.action === "dividend";
  return TradeSchema.parse({
    date: t.date,
    book: "real",
    ticker,
    action: t.action,
    shares: t.action === "split" ? String(num(t.shares)) : String(sharesFor(t) ?? ""),
    price: amountInPrice ? String(num(t.amount)) : t.action === "split" ? "" : String(num(t.price)),
    fees: t.action === "buy" || t.action === "sell" ? (given(t.fees) ? String(num(t.fees)) : "0") : "",
    currency,
    notional_slice: "",
    note: t.note.trim(),
  });
}

/** trades.csv with `rows` appended at the bottom, columns in the file's own order. */
export function appendTrades(csv: string, rows: Trade[]): string {
  const fields = Papa.parse<string[]>(csv.split("\n")[0]).data[0] ?? [];
  const cell = (t: Trade, f: string): string => {
    const v = (t as unknown as Record<string, unknown>)[f];
    if (f === "fees") return t.action === "buy" || t.action === "sell" ? String(t.fees) : "";
    return v === undefined || v === null ? "" : String(v);
  };
  const lines = Papa.unparse(
    rows.map((t) => fields.map((f) => cell(t, f))),
    { header: false, newline: "\n" },
  );
  return `${csv.replace(/\s*$/, "")}\n${lines}\n`;
}

function parse<T>(text: string, schema: { parse: (v: unknown) => T }): T[] {
  const rows = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  }).data;
  return rows.map((r) => schema.parse(r));
}

export const parseTrades = (csv: string): Trade[] => parse(csv, TradeSchema);
export const parseInstruments = (csv: string): Instrument[] => parse(csv, InstrumentSchema);

/** Rows a branch's trades.csv adds on top of the base copy (the trade form only ever appends). */
export function addedRows(baseCsv: string, branchCsv: string): string[] {
  const base = new Set(baseCsv.trim().split("\n").slice(1).map((l) => l.trim()));
  return branchCsv
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !base.has(l));
}
