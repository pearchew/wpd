import Papa from "papaparse";
import { stringify } from "yaml";
import { splitFrontmatter } from "../frontmatter";
import { ASSET_CLASSES, type AssetClass, ResearchFrontmatterSchema } from "../schemas";

/** What the research form edits. Numbers stay strings until they are checked, so half-typed input survives. */
export interface ReportDraft {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  method: string;
  status: "published" | "in-progress";
  author: string;
  updated: string;
  fairValue: string;
  thesis: string;
  sellTrigger: string;
  /** Path under public/, e.g. /models/jnj-ddm.xlsx. Kept when no new file is uploaded. */
  model: string;
  keyOutputs: { label: string; value: string }[];
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
export const METHODS = ["DCF", "Reverse DCF", "Two-stage DDM", "Comparables", "Sum of the parts", "Portfolio fit (vol / Sharpe)"];

export const emptyDraft = (author: string, today: string): ReportDraft => ({
  ticker: "",
  name: "",
  assetClass: "Equities",
  method: "DCF",
  status: "in-progress",
  author,
  updated: today,
  fairValue: "",
  thesis: "",
  sellTrigger: "",
  model: "",
  keyOutputs: [],
});

export const STARTER_BODY = "## Valuation\n\n## What the price implies\n\n## Biggest risk\n";

export const slugFor = (ticker: string) => ticker.trim().toLowerCase();
export const reportPath = (ticker: string) => `content/research/${slugFor(ticker)}.mdx`;

/** Frontmatter in the same key order as the hand-written reports, with empty optional fields left out. */
export function frontmatter(d: ReportDraft): Record<string, unknown> {
  const fv = d.fairValue.trim() === "" ? undefined : Number(d.fairValue.replace(/[$,\s]/g, ""));
  const outputs = d.keyOutputs
    .map((o) => ({ label: o.label.trim(), value: o.value.trim() }))
    .filter((o) => o.label || o.value);
  const f: Record<string, unknown> = {
    ticker: d.ticker.trim().toUpperCase(),
    name: d.name.trim(),
    assetClass: d.assetClass,
    method: d.method.trim(),
    status: d.status,
    author: d.author,
    updated: d.updated,
    fairValue: fv,
    thesis: d.thesis.trim(),
    sellTrigger: d.sellTrigger.trim() || undefined,
    model: d.model.trim() || undefined,
    keyOutputs: outputs.length ? outputs : undefined,
  };
  for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
  return f;
}

/** Problems a person can fix in the form, keyed by field. Empty means the file will pass `npm run validate`. */
export function problems(d: ReportDraft): Partial<Record<keyof ReportDraft | "form", string>> {
  const out: Partial<Record<keyof ReportDraft | "form", string>> = {};
  if (!/^[A-Za-z0-9.\-]{1,24}$/.test(d.ticker.trim())) out.ticker = "Letters, numbers, dots or dashes";
  if (!d.name.trim()) out.name = "Required";
  if (!d.method.trim()) out.method = "Required";
  if (!d.thesis.trim()) out.thesis = "Required";
  const fv = d.fairValue.trim();
  if (fv && !(Number(fv.replace(/[$,\s]/g, "")) > 0)) out.fairValue = "A positive number";
  if (d.status === "published") {
    if (!fv) out.fairValue ??= "Required to publish";
    if (!d.sellTrigger.trim()) out.sellTrigger = "Required to publish";
  }
  if (d.keyOutputs.some((o) => !o.label.trim() !== !o.value.trim())) out.keyOutputs = "Each output needs a label and a value";
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
  return {
    draft: {
      ticker: str(f.ticker),
      name: str(f.name),
      assetClass: (ASSET_CLASSES as readonly string[]).includes(str(f.assetClass)) ? (f.assetClass as AssetClass) : "Equities",
      method: str(f.method),
      status: f.status === "published" ? "published" : "in-progress",
      author: str(f.author),
      updated: str(f.updated),
      fairValue: str(f.fairValue),
      thesis: str(f.thesis),
      sellTrigger: str(f.sellTrigger),
      model: str(f.model),
      keyOutputs: Array.isArray(f.keyOutputs)
        ? (f.keyOutputs as { label?: unknown; value?: unknown }[]).map((o) => ({ label: str(o.label), value: str(o.value) }))
        : [],
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
  const fields = parsed.meta.fields ?? [];
  const row: Record<string, string> = {
    ticker,
    name: d.name.trim(),
    asset_class: d.assetClass,
    currency: a.currency.trim().toUpperCase() || "USD",
    feed_symbol: a.feedSymbol.trim() || ticker,
    kind: a.kind,
    multiplier: "1",
  };
  const line = Papa.unparse([fields.map((f) => row[f] ?? "")], { header: false });
  return `${csv.replace(/\s*$/, "")}\n${line}\n`;
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
