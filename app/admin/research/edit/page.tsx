import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportForm } from "@/components/admin/ReportForm";
import { repoConfig } from "@/lib/admin/config";
import { getPull, listPulls, pullFiles, readFile } from "@/lib/admin/github";
import { formContext, localReport } from "@/lib/admin/load";
import { BRANCH_PREFIX, fromMdx, reportPath } from "@/lib/admin/report";
import { requireSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit report" };

function Missing({ what }: { what: string }) {
  return (
    <main className="page">
      <section className="hero">
        <h1>Not found</h1>
        <p className="tagline">{what}</p>
        <Link className="button" href="/admin">Back to admin</Link>
      </section>
    </main>
  );
}

export default async function EditReport({ searchParams }: { searchParams: Promise<{ slug?: string; pr?: string }> }) {
  await requireSession();
  const { slug, pr } = await searchParams;
  const cfg = repoConfig();

  if (pr) {
    if (!cfg) return <Missing what="Pull requests can only be edited once GitHub is connected." />;
    const n = Number(pr);
    const pull = await getPull(cfg, n).catch(() => undefined);
    if (!pull || pull.state !== "open" || !pull.branch.startsWith(BRANCH_PREFIX)) {
      return <Missing what={`Pull request #${pr} is closed or wasn't opened from the research form.`} />;
    }
    const file = (await pullFiles(cfg, n)).find((f) => /^content\/research\/[^/]+\.mdx$/.test(f));
    const raw = file && (await readFile(cfg, file, pull.branch));
    if (!raw) return <Missing what={`Pull request #${pr} has no report file.`} />;
    const { draft, body } = fromMdx(raw);
    const isNew = (await readFile(cfg, file, cfg.base)) === undefined;
    return (
      <ReportForm
        initial={draft}
        body={body}
        isNew={isNew}
        pr={{ number: pull.number, url: pull.url, draft: pull.draft }}
        ctx={await formContext(cfg, pull.branch)}
        connected
      />
    );
  }

  if (!slug || !/^[a-z0-9.\-]+$/.test(slug)) return <Missing what="No report was chosen." />;
  if (cfg) {
    // One open change per report: if someone already has one going, continue that instead of starting a rival.
    const mine = new RegExp(`^${BRANCH_PREFIX}${slug.replace(/[^a-z0-9]/g, "-")}-[a-z]{1,3}-\\d{12}$`);
    const open = (await listPulls(cfg, BRANCH_PREFIX).catch(() => [])).find((p) => mine.test(p.branch));
    if (open) redirect(`/admin/research/edit?pr=${open.number}`);
  }
  const raw = (cfg && (await readFile(cfg, reportPath(slug), cfg.base).catch(() => undefined))) || localReport(slug);
  if (!raw) return <Missing what={`There is no report for ${slug.toUpperCase()}.`} />;
  const { draft, body } = fromMdx(raw);
  return <ReportForm initial={draft} body={body} isNew={false} ctx={await formContext(cfg)} connected={Boolean(cfg)} />;
}
