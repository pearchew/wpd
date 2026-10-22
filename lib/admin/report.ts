import Papa from "papaparse";
import { stringify } from "yaml";
import { splitFrontmatter } from "../frontmatter";
import { appendInstrumentRow, emptyAsset, instrumentRow } from "./assets";
import {
  ASSET_CLASSES,
  type AssetClass,
  ResearchFrontmatterSchema,
  STRATEGY_FAMILIES,
  type StrategyFamily,
  VIEWS,
  type View,
} from "../schemas";

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
  strategy: { family: "", rule: "", entry: "", exit: "", holding: "", papers: "" },
  model: "",
});

/**
 * The write-up's starting point: the core sections every report has, plus the ones for its kind of asset
 * (futures: the contract; futures and commodities: the curve and the supply-demand balance).
 */
export function starterBody(kind?: string, assetClass?: string): string {
  const future = kind === "future";
  const commodity = future || assetClass === "Commodities";
  const parts = [
    "## What it is\n\nWhat the asset is and how it makes money. Link a \"how the money flows\" diagram if you have one.",
    `## ${commodity ? "Demand breakdown" : "Revenue breakdown"}\n\nWhere the ${commodity ? "demand" : "money"} comes from.`,
    "## Price drivers\n\nWhat actually moves the price, most important first, and where to watch it.",
    "## Catalyst calendar\n\nUpcoming dated events that could move the price: earnings, policy, data or deals.",
    "## Evidence\n\nHas the strategy's rule worked on this asset so far? Link a chart, or put it in the Excel model.\n\n- **Sample size:**\n- **Result:**\n- **Limitations:**",
    ...(future
      ? ["## Contract specs\n\n- **Exchange:**\n- **Contract size:**\n- **Tick value:**\n- **Expiry months:**\n- **Margin:**"]
      : []),
    ...(commodity
      ? [
          "## Curve and inventories\n\nBackwardation (later months cheaper) means a tight market; contango means a loose one.\n\n- **Curve:**\n- **Exchange inventories:**\n- **Roll yield:**",
          "## Supply-demand balance\n\nWhose surplus or deficit forecast do we believe, and why?",
        ]
      : []),
    "## Sources\n\nEach source with its link and the date you read it.",
  ];
  return `${parts.join("\n\n")}\n`;
}

export const slugFor = (ticker: string) => ticker.trim().toLowerCase();
export const reportPath = (ticker: string) => `content/research/${slugFor(ticker)}.mdx`;

/** Frontmatter in the order the form shows it, with empty optional fields left out. */
export function frontmatter(d: ReportDraft): Record<string, unknown> {
  const t = (v: string) => v.trim() || undefined;
  const st = d.strategy;
  const anyText = [st.rule, st.entry, st.exit, st.holding, st.papers].some((v) => v.trim());
  const strategy = st.family || anyText
    ? Object.fromEntries(
        Object.entries({ family: st.family || undefined, rule: t(st.rule), entry: t(st.entry), exit: t(st.exit), holding: t(st.holding), papers: t(st.papers) })
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
  // The strategy's text boxes are all optional, but anything written there belongs to a family.
  const st = d.strategy;
  if (!st.family && [st.rule, st.entry, st.exit, st.holding, st.papers].some((v) => v.trim())) out.family = "Pick the family this strategy belongs to";
  if (d.status === "published") {
    if (!d.view) out.view = "Required to publish";
    if (!st.family) out.family ??= "Required to publish";
  }
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
