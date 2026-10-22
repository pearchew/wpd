import Papa from "papaparse";
import { stringify } from "yaml";
import { splitFrontmatter } from "../frontmatter";
import { appendInstrumentRow, emptyAsset, instrumentRow } from "./assets";
import {
  ASSET_CLASSES,
  type AssetClass,
  CONVICTIONS,
  type Conviction,
  ResearchFrontmatterSchema,
  STRATEGY_FAMILIES,
  type StrategyFamily,
  VIEWS,
  type View,
} from "../schemas";

export interface KeyNumberDraft {
  label: string;
  value: string;
  unit: string;
  asOf: string;
  source: string;
}

/** What the research form edits. Everything stays a string until it is checked, so half-typed input survives. */
export interface ReportDraft {
  // The asset
  ticker: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  author: string;
  /** First publication date; filled in the first time the report is saved as published. */
  published: string;
  updated: string;
  // The call
  status: "published" | "in-progress";
  /** Empty until the author has reached a view. */
  view: View | "";
  thesis: string;
  conviction: Conviction | "";
  keyNumbers: KeyNumberDraft[];
  strategy: { family: StrategyFamily | ""; rule: string; entry: string; exit: string; holding: string; papers: string };
  // Optional Excel model: path under public/, e.g. /models/jnj-model.xlsx. Kept when no new file is uploaded.
  model: string;
}

/** A ticker the site doesn't know yet, added to instruments.csv in the same pull request. Stocks and ETFs only. */
export interface NewAsset {
  kind: "stock" | "etf";
  currency: string;
  feedSymbol: string;
}

/** Every pull request the research form opens lives on a branch starting with this. */
export const BRANCH_PREFIX = "admin/research-";

export const THESIS_HINT = 160;
export const MODEL_MAX_BYTES = 4 * 1024 * 1024;
export const emptyKeyNumber = (asOf: string): KeyNumberDraft => ({ label: "", value: "", unit: "", asOf, source: "" });

export const emptyDraft = (author: string, today: string): ReportDraft => ({
  ticker: "",
  name: "",
  assetClass: "Equities",
  exchange: "",
  author,
  published: "",
  updated: today,
  status: "in-progress",
  view: "",
  thesis: "",
  conviction: "",
  keyNumbers: [],
  strategy: { family: "", rule: "", entry: "", exit: "", holding: "", papers: "" },
  model: "",
});

const table = (head: string[], align: ("l" | "r")[], first: string[] = head.map(() => "")) =>
  [
    `| ${head.join(" | ")} |`,
    `| ${align.map((a) => (a === "r" ? "---:" : "---")).join(" | ")} |`,
    `| ${first.map((c) => c || " ").join(" | ")} |`,
  ].join("\n");

/**
 * The write-up's starting point: the core sections every report has, plus the ones for its kind of asset
 * (futures and commodities: contract, curve, supply and demand; stocks and ETFs: peer and currency).
 */
export function starterBody(kind?: string, assetClass?: string): string {
  const future = kind === "future";
  const commodity = future || assetClass === "Commodities";
  const stock = !commodity && kind !== "option";
  const parts = [
    "## What it is\n\nWhat the asset is and how it makes money. Link a \"how the money flows\" diagram if you have one.",
    `## ${commodity ? "Demand breakdown" : "Revenue breakdown"}\n\nWhere the ${commodity ? "demand" : "money"} comes from.\n\n${table(["Segment", "Description", "Value or %", "Source"], ["l", "l", "r", "l"])}`,
    `## Price drivers\n\nWhat actually moves the price, most important first, and where to watch it.\n\n${table(["Rank", "Driver", "Direction (+/−)", "Where to track it"], ["r", "l", "l", "l"], ["1", "", "", ""])}`,
    `## Catalyst calendar\n\nUpcoming dated events that could move the price. Type: earnings, policy, data or deal.\n\n${table(["Date", "Event", "Type", "Expected impact"], ["l", "l", "l", "l"])}`,
    "## Evidence\n\nHas the strategy's rule worked on this asset so far? Link a chart, or put it in the Excel model.\n\n- **Sample size:**\n- **Result:**\n- **Limitations:**",
    `## Valuation check\n\nIs the good news already in the price? No price target.\n\n${table(["Metric", "Current", "Own history", "Peers", "Comment"], ["l", "r", "r", "r", "l"])}`,
    `## Risks\n\nWhat would break the thesis. A teammate writes at least one.\n\n${table(["Risk", "Likelihood", "Impact", "What would signal it"], ["l", "l", "l", "l"])}`,
    "## What would change our mind\n\nThe kill switch, set before the trade so we don't rationalise later.\n\n- ",
    ...(future
      ? [`## Contract specs\n\n${table(["Exchange", "Contract size", "Tick value", "Expiry months", "Margin"], ["l", "l", "r", "l", "r"])}`]
      : []),
    ...(commodity
      ? [
          `## Curve and inventories\n\nBackwardation (later months cheaper) means a tight market; contango means a loose one.\n\n${table(["Month", "Price"], ["l", "r"])}\n\n- **Exchange inventories:**\n- **Roll yield:**`,
          `## Supply-demand balance\n\nWhose surplus or deficit forecast do we believe?\n\n${table(["Forecaster", "Year", "Balance (tonnes)", "Date"], ["l", "l", "r", "l"])}`,
        ]
      : []),
    ...(stock
      ? [
          "## Peer / pair\n\n- **Peer ticker:**\n- **Why it's comparable:**\n- **Correlation or cointegration:**",
          "## Currency exposure\n\n- **Reporting currency:**\n- **Main revenue currencies:**\n- **Sensitivity:** how much FX could add to or wipe out the return.",
        ]
      : []),
    `## Event log\n\nEach news event and how the price reacted. Returns are from the close before the news.\n\n${table(["Date", "Headline", "Link", "Tone (+/0/−)", "News or no-news", "1-day", "5-day", "20-day"], ["l", "l", "l", "l", "l", "r", "r", "r"])}`,
    "## Review notes\n\n### YYYY-MM-DD\n\n- **What happened:**\n- **Rule followed:** yes / no\n- **Lesson:**",
    `## Sources\n\n${table(["Title", "URL", "Date accessed"], ["l", "l", "l"])}`,
  ];
  return `${parts.join("\n\n")}\n`;
}

export const slugFor = (ticker: string) => ticker.trim().toLowerCase();
export const reportPath = (ticker: string) => `content/research/${slugFor(ticker)}.mdx`;

/** Frontmatter in the order the form shows it, with empty optional fields left out. */
export function frontmatter(d: ReportDraft): Record<string, unknown> {
  const t = (v: string) => v.trim() || undefined;
  const numbers = d.keyNumbers
    .map((k) => ({ label: k.label.trim(), value: k.value.trim(), unit: t(k.unit), asOf: t(k.asOf), source: t(k.source) }))
    .filter((k) => k.label || k.value)
    .map((k) => Object.fromEntries(Object.entries(k).filter(([, v]) => v !== undefined)));
  const st = d.strategy;
  const strategy = st.family || st.rule.trim()
    ? Object.fromEntries(
        Object.entries({ family: st.family || undefined, rule: st.rule.trim(), entry: t(st.entry), exit: t(st.exit), holding: t(st.holding), papers: t(st.papers) })
          .filter(([, v]) => v !== undefined),
      )
    : undefined;
  const f: Record<string, unknown> = {
    ticker: d.ticker.trim().toUpperCase(),
    name: d.name.trim(),
    assetClass: d.assetClass,
    exchange: t(d.exchange),
    author: d.author,
    published: t(d.published) ?? (d.status === "published" ? d.updated : undefined),
    updated: d.updated,
    status: d.status,
    view: d.view || undefined,
    thesis: d.thesis.trim(),
    conviction: d.conviction || undefined,
    keyNumbers: numbers.length ? numbers : undefined,
    strategy,
    model: t(d.model),
  };
  for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
  return f;
}

/** Problems a person can fix in the form, keyed by field. Empty means the file will pass `npm run validate`. */
export function problems(d: ReportDraft): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  if (!/^[A-Za-z0-9.\-]{1,24}$/.test(d.ticker.trim())) out.ticker = "Letters, numbers, dots or dashes";
  if (!d.name.trim()) out.name = "Required";
  if (!d.thesis.trim()) out.thesis = "Required";
  const st = d.strategy;
  if (st.rule.trim() && !st.family) out.family = "Pick the family the rule belongs to";
  if (st.family && !st.rule.trim()) out.rule = "Write the rule";
  if (d.status === "published") {
    if (!d.view) out.view = "Required to publish";
    if (!d.conviction) out.conviction = "Required to publish";
    if (!st.family) out.family ??= "Required to publish";
    if (!st.rule.trim()) out.rule ??= "Required to publish";
    if (d.view === "Long" || d.view === "Short") {
      if (!st.entry.trim()) out.entry = `Required to publish a ${d.view} view`;
      if (!st.exit.trim()) out.exit = `Required to publish a ${d.view} view`;
    }
  }
  if (d.keyNumbers.some((k) => !k.label.trim() !== !k.value.trim())) out.keyNumbers = "Each number needs a label and a value";
  else if (d.keyNumbers.some((k) => k.asOf.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(k.asOf.trim()))) out.keyNumbers = "As-of dates are YYYY-MM-DD";
  if (Object.keys(out).length === 0) {
    const r = ResearchFrontmatterSchema.safeParse(frontmatter(d));
    if (!r.success) out.form = r.error.issues.map((i) => `${i.path.join(".") || "report"}: ${i.message}`).join("; ");
  }
  return out;
}

export function toMdx(d: ReportDraft, body: string): string {
  const yaml = stringify(frontmatter(d), { lineWidth: 0 });
  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

/** An existing report file → form state and its markdown body. */
export function fromMdx(raw: string): { draft: ReportDraft; body: string } {
  const { data, body } = splitFrontmatter(raw);
  const f = data as Record<string, unknown>;
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  const pick = <T extends string>(list: readonly T[], v: unknown): T | "" => ((list as readonly string[]).includes(str(v)) ? (v as T) : "");
  const st = (f.strategy ?? {}) as Record<string, unknown>;
  return {
    draft: {
      ticker: str(f.ticker),
      name: str(f.name),
      assetClass: pick(ASSET_CLASSES, f.assetClass) || "Equities",
      exchange: str(f.exchange),
      author: str(f.author),
      published: str(f.published),
      updated: str(f.updated),
      status: f.status === "published" ? "published" : "in-progress",
      view: pick(VIEWS, f.view),
      thesis: str(f.thesis),
      conviction: pick(CONVICTIONS, f.conviction),
      keyNumbers: Array.isArray(f.keyNumbers)
        ? (f.keyNumbers as Record<string, unknown>[]).map((k) => ({
            label: str(k.label), value: str(k.value), unit: str(k.unit), asOf: str(k.asOf), source: str(k.source),
          }))
        : [],
      strategy: {
        family: pick(STRATEGY_FAMILIES, st.family),
        rule: str(st.rule), entry: str(st.entry), exit: str(st.exit), holding: str(st.holding), papers: str(st.papers),
      },
      model: str(f.model),
    },
    body: body.trim(),
  };
}

/** True when the body uses MDX components or imports, which the rich editor can't round-trip. */
export const usesMdxComponents = (body: string) => /^\s*(import|export)\s|<[A-Z]/m.test(body);

/** instruments.csv with a row for `ticker` added, or unchanged when it's already there. */
export function withInstrument(csv: string, d: ReportDraft, a: NewAsset): string {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true });
  const ticker = d.ticker.trim().toUpperCase();
  if (parsed.data.some((r) => r.ticker?.trim() === ticker)) return csv;
  return appendInstrumentRow(
    csv,
    instrumentRow({ ...emptyAsset(a.kind), ticker, name: d.name, assetClass: d.assetClass, currency: a.currency || "USD", feedSymbol: a.feedSymbol }),
  );
}

/** A safe file name under public/models/ for an uploaded spreadsheet. */
export function modelPath(ticker: string, fileName: string): string {
  const ext = (fileName.match(/\.(xlsx|xlsm|xls|csv)$/i)?.[1] ?? "xlsx").toLowerCase();
  const stem = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const slug = slugFor(ticker);
  return `/models/${stem.startsWith(slug) ? stem : `${slug}-${stem || "model"}`}.${ext}`;
}
