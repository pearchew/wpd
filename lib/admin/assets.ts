import Papa from "papaparse";
import { ASSET_CLASSES, type AssetClass, type Instrument, InstrumentSchema } from "../schemas";

/** Every pull request the add-asset form opens lives on a branch starting with this. */
export const ASSETS_PREFIX = "admin/assets-";

export const KINDS = ["stock", "etf", "future", "option"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { stock: "Stock", etf: "ETF", future: "Future", option: "Option" };

/** What the form edits. Numbers stay strings until checked, so half-typed input survives. */
export interface AssetInput {
  kind: Kind;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  feedSymbol: string;
  multiplier: string;
  underlying: string;
  underlyingScale: string;
  expiry: string;
  strike: string;
  optionType: "call" | "put";
  margin: string;
  maintMargin: string;
}

export const emptyAsset = (kind: Kind = "stock"): AssetInput => ({
  kind,
  ticker: "",
  name: "",
  assetClass: kind === "future" || kind === "option" ? "Derivatives" : "Equities",
  currency: "USD",
  feedSymbol: "",
  multiplier: kind === "option" ? "100" : kind === "future" ? "" : "1",
  underlying: "",
  underlyingScale: "",
  expiry: "",
  strike: "",
  optionType: "put",
  margin: "",
  maintMargin: "",
});

const num = (s: string) => Number(s.replace(/[$,\s]/g, ""));
const given = (s: string) => s.trim() !== "";
const isDerivative = (k: Kind) => k === "future" || k === "option";

/** Option tickers follow the ledger's existing style: SPY261218P640. The feed wants the OCC symbol: SPY261218P00640000. */
export function optionSymbols(a: Pick<AssetInput, "underlying" | "expiry" | "strike" | "optionType">) {
  const u = a.underlying.trim().toUpperCase();
  const m = a.expiry.match(/^\d{2}(\d{2})-(\d{2})-(\d{2})$/);
  const k = num(a.strike);
  if (!u || !m || !(k > 0)) return undefined;
  const ymd = `${m[1]}${m[2]}${m[3]}`;
  const cp = a.optionType === "call" ? "C" : "P";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    ticker: `${u}${ymd}${cp}${String(k).replace(".", "_")}`,
    feedSymbol: `${u}${ymd}${cp}${String(Math.round(k * 1000)).padStart(8, "0")}`,
    name: `${u} ${months[Number(m[2]) - 1]} ${Number(m[3])} 20${m[1]} ${k} ${a.optionType}`,
  };
}

/** The form with option symbols filled in, so everything downstream sees the final ticker. */
export function resolved(a: AssetInput): AssetInput {
  if (a.kind !== "option") return a;
  const s = optionSymbols(a);
  return s ? { ...a, ticker: s.ticker, feedSymbol: a.feedSymbol.trim() || s.feedSymbol, name: a.name.trim() || s.name } : a;
}

/** Problems a person can fix in the form, keyed by field. */
export function assetProblems(input: AssetInput, existing: Instrument[], today: string): Partial<Record<keyof AssetInput, string>> {
  const a = resolved(input);
  const out: Partial<Record<keyof AssetInput, string>> = {};
  const ticker = a.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9._\-]{1,24}$/.test(ticker)) out.ticker = a.kind === "option" ? "Fill in the underlying, expiry and strike" : "Letters, numbers, dots or dashes";
  else if (existing.some((i) => i.ticker === ticker)) out.ticker = `${ticker} is already in the asset list`;
  if (!a.name.trim()) out.name = "Required";
  if (!/^[A-Za-z]{3}$/.test(a.currency.trim())) out.currency = "Three letters, e.g. USD";
  if (!ASSET_CLASSES.includes(a.assetClass)) out.assetClass = "Pick one";
  else if (isDerivative(a.kind) !== (a.assetClass === "Derivatives")) {
    out.assetClass = isDerivative(a.kind) ? "Futures and options are Derivatives" : "Only futures and options are Derivatives";
  }
  if (!(num(a.multiplier) > 0)) out.multiplier = "A positive number";
  if (isDerivative(a.kind)) {
    const u = existing.find((i) => i.ticker === a.underlying.trim().toUpperCase());
    if (!u) out.underlying = "Pick an asset already in the list";
    else if (isDerivative(u.kind)) out.underlying = "Must be a stock or ETF";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.expiry) || Number.isNaN(Date.parse(a.expiry))) out.expiry = "YYYY-MM-DD";
    else if (a.expiry <= today) out.expiry = "Must be in the future";
  }
  if (a.kind === "future") {
    if (!(num(a.margin) > 0)) out.margin = "Initial margin per contract, in dollars";
    if (given(a.maintMargin) && !(num(a.maintMargin) > 0 && num(a.maintMargin) <= num(a.margin))) {
      out.maintMargin = "Positive, and no more than the initial margin";
    }
    if (given(a.underlyingScale) && !(num(a.underlyingScale) > 0)) out.underlyingScale = "A positive number";
  }
  if (a.kind === "option" && !(num(a.strike) > 0)) out.strike = "A positive strike";
  return out;
}

/** The instruments.csv row, keyed by column. Columns that don't apply to the kind stay empty. */
export function instrumentRow(input: AssetInput): Record<string, string> {
  const a = resolved(input);
  const ticker = a.ticker.trim().toUpperCase();
  const d = isDerivative(a.kind);
  const n = (s: string) => (given(s) ? String(num(s)) : "");
  return {
    ticker,
    name: a.name.trim(),
    asset_class: a.assetClass,
    currency: a.currency.trim().toUpperCase(),
    feed_symbol: a.feedSymbol.trim() || ticker,
    kind: a.kind,
    multiplier: n(a.multiplier) || "1",
    underlying: d ? a.underlying.trim().toUpperCase() : "",
    underlying_scale: a.kind === "future" ? n(a.underlyingScale) : "",
    expiry: d ? a.expiry : "",
    strike: a.kind === "option" ? n(a.strike) : "",
    option_type: a.kind === "option" ? a.optionType : "",
    margin: a.kind === "future" ? n(a.margin) : "",
    maint_margin: a.kind === "future" ? n(a.maintMargin) : "",
  };
}

export const toInstrument = (row: Record<string, string>): Instrument => InstrumentSchema.parse(row);

/** instruments.csv with `row` appended, in the file's own column order. */
export function appendInstrumentRow(csv: string, row: Record<string, string>): string {
  const fields = Papa.parse<string[]>(csv.split("\n")[0]).data[0] ?? [];
  const line = Papa.unparse([fields.map((f) => row[f.trim()] ?? "")], { header: false, newline: "\n" });
  return `${csv.replace(/\s*$/, "")}\n${line}\n`;
}
