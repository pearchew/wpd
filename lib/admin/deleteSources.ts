import { meta, researchDocs } from "../data";
import { splitFrontmatter } from "../frontmatter";
import { getPriceBook } from "../prices";
import { readFiles } from "./change";
import type { RepoConfig } from "./config";
import type { ReportInfo, Sources } from "./deletions";
import { listDir, readFile } from "./github";

/** Everything the delete planner needs, as it is on `ref` (GitHub) or in this deployment when GitHub isn't connected. */
export async function deleteSources(cfg: RepoConfig | undefined, ref?: string): Promise<Sources | undefined> {
  const [instrumentsCsv, tradesCsv, votesCsv] = await readFiles(cfg, ref, ["data/instruments.csv", "data/trades.csv", "data/votes.csv"]);
  if (!instrumentsCsv || !tradesCsv || !votesCsv) return undefined;

  let reports: ReportInfo[];
  if (cfg) {
    const at = ref ?? cfg.base;
    const names = (await listDir(cfg, "content/research", at)).filter((n) => n.endsWith(".mdx"));
    reports = (
      await Promise.all(
        names.map(async (n): Promise<ReportInfo | undefined> => {
          const raw = await readFile(cfg, `content/research/${n}`, at);
          if (!raw) return undefined;
          const f = splitFrontmatter(raw).data as Record<string, unknown>;
          return { slug: n.replace(/\.mdx$/, ""), ticker: String(f.ticker ?? ""), name: String(f.name ?? ""), model: f.model ? String(f.model) : undefined };
        }),
      )
    ).filter((r): r is ReportInfo => Boolean(r));
  } else {
    reports = researchDocs().map((d) => ({ slug: d.slug, ticker: d.front.ticker, name: d.front.name, model: d.front.model }));
  }
  const m = meta();
  const book = await getPriceBook();
  return {
    instrumentsCsv, tradesCsv, votesCsv, reports, benchmark: m.benchmark, maxPositionWeight: m.maxPositionWeight,
    fx: { dates: book.dates, fx: book.fx }, reportingCurrency: m.reportingCurrency,
  };
}
