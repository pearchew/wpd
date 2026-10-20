import Papa from "papaparse";
import { checkInstruments } from "../instrumentChecks";
import { type Instrument, InstrumentSchema, type Trade, TradeSchema } from "../schemas";
import { checkLedger } from "../tradeChecks";

/** Every pull request the delete page opens lives on a branch starting with this. */
export const DELETE_PREFIX = "admin/delete-";

/** A data row picked for deletion: its position among the file's data rows, and its exact text as loaded. */
export interface RowRef {
  idx: number;
  line: string;
}

export interface Selection {
  reports: string[];
  trades: RowRef[];
  votes: RowRef[];
  assets: string[];
}

export const emptySelection = (): Selection => ({ reports: [], trades: [], votes: [], assets: [] });

export interface ReportInfo {
  slug: string;
  ticker: string;
  name: string;
  model?: string;
}

export interface Sources {
  instrumentsCsv: string;
  tradesCsv: string;
  votesCsv: string;
  reports: ReportInfo[];
  benchmark: string;
  maxPositionWeight: number;
}

export interface PlannedRow {
  idx: number;
  line: string;
  /** Why it's going: undefined when picked directly, else the asset that took it with it */
  because?: string;
}

export interface Plan {
  assets: { ticker: string; because?: string }[];
  trades: PlannedRow[];
  votes: PlannedRow[];
  reports: { slug: string; ticker: string; because?: string }[];
  /** Repo paths removed outright (report files and models nobody else uses) */
  removeFiles: string[];
  /** New contents for the CSVs that change */
  files: { path: string; text: string }[];
  /** Reasons the plan can't go ahead; empty means it would pass the build checks */
  errors: string[];
  empty: boolean;
}

/** The data lines of a CSV (header excluded), or undefined when a cell spans lines and line edits would be unsafe. */
export function dataLines(csv: string): { header: string; lines: string[] } | undefined {
  const all = csv.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  const [header, ...lines] = all;
  const records = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true }).data.length;
  const nonEmpty = lines.filter((l) => l.trim() !== "").length;
  return records === nonEmpty ? { header, lines } : undefined;
}

const parseRows = <T>(header: string, lines: string[], schema: { parse: (v: unknown) => T }): T[] =>
  lines.length
    ? Papa.parse<Record<string, string>>(`${header}\n${lines.join("\n")}`, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => v.trim(),
      }).data.map((r) => schema.parse(r))
    : [];

const field = (header: string, line: string, name: string): string => {
  const cols = Papa.parse<string[]>(header).data[0]?.map((h) => h.trim()) ?? [];
  const cells = Papa.parse<string[]>(line).data[0] ?? [];
  return (cells[cols.indexOf(name)] ?? "").trim();
};

/**
 * Work out everything a selection removes. Assets cascade: derivatives on them, their trades, their
 * votes, their report and its model all go in the same change. Trades and votes are removed as picked,
 * and the ledger checks then re-run on what's left. Used by the page (preview) and the server (to commit).
 */
export function planDeletion(src: Sources, sel: Selection): Plan {
  const errors: string[] = [];
  const inst = dataLines(src.instrumentsCsv);
  const trades = dataLines(src.tradesCsv);
  const votes = dataLines(src.votesCsv);
  const plan: Plan = { assets: [], trades: [], votes: [], reports: [], removeFiles: [], files: [], errors, empty: true };
  if (!inst || !trades || !votes) {
    errors.push("A CSV has a cell that spans several lines, so rows can't be deleted safely here. Edit it on GitHub instead.");
    return plan;
  }

  // Rows must still be what the person saw; otherwise the file changed under them.
  const checkRefs = (refs: RowRef[], lines: string[], file: string) => {
    for (const r of refs) {
      if (lines[r.idx]?.trim() !== r.line.trim()) errors.push(`${file} changed since this page loaded. Reload and pick again.`);
    }
  };
  checkRefs(sel.trades, trades.lines, "trades.csv");
  checkRefs(sel.votes, votes.lines, "votes.csv");
  if (errors.length) return plan;

  // Assets, plus anything whose underlying is going (an option on a deleted stock can't stay).
  const tickers = inst.lines.map((l) => field(inst.header, l, "ticker"));
  const going = new Map<string, string | undefined>();
  for (const t of sel.assets) {
    if (t === src.benchmark) errors.push(`${t} is the benchmark every chart compares against, so it can't be deleted.`);
    else if (tickers.includes(t)) going.set(t, undefined);
  }
  for (let grew = true; grew; ) {
    grew = false;
    inst.lines.forEach((l, i) => {
      const u = field(inst.header, l, "underlying");
      if (u && going.has(u) && !going.has(tickers[i])) {
        going.set(tickers[i], going.get(u) ?? u);
        grew = true;
      }
    });
  }
  plan.assets = [...going].map(([ticker, because]) => ({ ticker, because }));

  const pick = (lines: string[], header: string, refs: RowRef[]): PlannedRow[] => {
    const out = new Map<number, PlannedRow>();
    for (const r of refs) out.set(r.idx, { idx: r.idx, line: lines[r.idx] });
    lines.forEach((l, idx) => {
      const t = field(header, l, "ticker");
      if (going.has(t) && !out.has(idx)) out.set(idx, { idx, line: l, because: going.get(t) ?? t });
    });
    return [...out.values()].sort((a, b) => a.idx - b.idx);
  };
  plan.trades = pick(trades.lines, trades.header, sel.trades);
  plan.votes = pick(votes.lines, votes.header, sel.votes);

  const reportGoing = new Map<string, string | undefined>();
  for (const slug of sel.reports) if (src.reports.some((r) => r.slug === slug)) reportGoing.set(slug, undefined);
  for (const r of src.reports) if (going.has(r.ticker) && !reportGoing.has(r.slug)) reportGoing.set(r.slug, going.get(r.ticker) ?? r.ticker);
  plan.reports = src.reports.filter((r) => reportGoing.has(r.slug)).map((r) => ({ slug: r.slug, ticker: r.ticker, because: reportGoing.get(r.slug) }));
  for (const r of plan.reports) {
    plan.removeFiles.push(`content/research/${r.slug}.mdx`);
    const model = src.reports.find((x) => x.slug === r.slug)?.model;
    // A model is only removed when no remaining report links to it.
    if (model?.startsWith("/models/") && !src.reports.some((x) => !reportGoing.has(x.slug) && x.model === model)) {
      plan.removeFiles.push(`public${model}`);
    }
  }

  plan.empty = !plan.assets.length && !plan.trades.length && !plan.votes.length && !plan.reports.length;
  if (plan.empty) return plan;

  // What's left must still pass the build: the same instrument and ledger checks.
  const keep = (lines: string[], gone: PlannedRow[] | Set<number>) => {
    const drop = gone instanceof Set ? gone : new Set(gone.map((g) => g.idx));
    return lines.filter((_, i) => !drop.has(i));
  };
  const instLeft = keep(inst.lines, new Set(inst.lines.flatMap((_, i) => (going.has(tickers[i]) ? [i] : []))));
  const tradesLeft = keep(trades.lines, plan.trades);
  const votesLeft = keep(votes.lines, plan.votes);
  try {
    const instruments: Instrument[] = parseRows(inst.header, instLeft, InstrumentSchema);
    errors.push(...checkInstruments(instruments, src.benchmark));
    const ledger: Trade[] = parseRows(trades.header, tradesLeft, TradeSchema);
    errors.push(...checkLedger(ledger, instruments, { maxPositionWeight: src.maxPositionWeight }, (i) => `remaining trade ${i + 1}`).errors);
  } catch (e) {
    errors.push(`The remaining rows don't parse: ${(e as Error).message}`);
  }

  const text = (header: string, lines: string[]) => `${[header, ...lines].join("\n")}\n`;
  if (going.size) plan.files.push({ path: "data/instruments.csv", text: text(inst.header, instLeft) });
  if (plan.trades.length) plan.files.push({ path: "data/trades.csv", text: text(trades.header, tradesLeft) });
  if (plan.votes.length) plan.files.push({ path: "data/votes.csv", text: text(votes.header, votesLeft) });
  return plan;
}

/** One line for commit messages and titles: "JNJ asset, 3 trades, 2 votes, the JNJ report". */
export function describePlan(p: Plan): string {
  const parts: string[] = [];
  if (p.assets.length) parts.push(`${p.assets.map((a) => a.ticker).join(", ")} asset${p.assets.length === 1 ? "" : "s"}`);
  if (p.reports.length) parts.push(`${p.reports.map((r) => r.ticker).join(", ")} report${p.reports.length === 1 ? "" : "s"}`);
  if (p.trades.length) parts.push(`${p.trades.length} trade${p.trades.length === 1 ? "" : "s"}`);
  if (p.votes.length) parts.push(`${p.votes.length} vote${p.votes.length === 1 ? "" : "s"}`);
  return parts.join(", ");
}
