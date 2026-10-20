import Link from "next/link";
import { ASSETS_PREFIX } from "@/lib/admin/assets";
import { repoConfig } from "@/lib/admin/config";
import { DELETE_PREFIX } from "@/lib/admin/deletions";
import { type PullSummary, listPulls } from "@/lib/admin/github";
import { BRANCH_PREFIX } from "@/lib/admin/report";
import { requireSession } from "@/lib/admin/session";
import { TRADES_PREFIX } from "@/lib/admin/trades";
import { VOTES_PREFIX } from "@/lib/admin/votes";
import { researchDocs } from "@/lib/data";
import { fmtDate } from "@/lib/dates";
import { getMember } from "@/lib/team";

export const dynamic = "force-dynamic";

const TASKS = [
  { title: "Research report", sub: "Write or update a write-up, tables and the Excel model", href: "/admin/research/new" },
  { title: "Record trades", sub: "Buy, sell, deposit, dividend, split…", href: "/admin/trades" },
  { title: "Add asset", sub: "Stock, ETF, future or option", href: "/admin/assets" },
  { title: "Record vote", sub: "Include, Watch or Reject", href: "/admin/votes" },
  { title: "Delete", sub: "Remove an asset, report, trade or vote", href: "/admin/delete" },
];

export default async function AdminHome() {
  await requireSession();
  const cfg = repoConfig();
  let pulls: PullSummary[] = [];
  let pullError: string | undefined;
  if (cfg) {
    try {
      pulls = await listPulls(cfg, "admin/");
    } catch (e) {
      pullError = (e as Error).message;
    }
  }
  const docs = researchDocs();

  return (
    <main className="page">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1>Admin</h1>
        <p className="tagline">Every change here becomes a pull request. The owner publishes it once the checks pass.</p>
      </section>

      {!cfg && (
        <p className="admin-notice">
          Saving to GitHub isn&apos;t set up on this deployment (<code>GITHUB_TOKEN</code>, <code>GITHUB_REPO</code>). You can
          fill in the forms, but saving only shows the file it would commit.
        </p>
      )}

      <section className="section">
        <div className="admin-tasks">
          {TASKS.map((t) =>
            t.href ? (
              <Link key={t.title} href={t.href} className="admin-task">
                <b>{t.title}</b>
                <span>{t.sub}</span>
              </Link>
            ) : (
              <div key={t.title} className="admin-task disabled" aria-disabled="true">
                <b>{t.title}</b>
                <span>{t.sub}</span>
                <span className="pixel">soon</span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Changes waiting to be published</h2>
          <p className="sub">Drafts are visible to the whole team, so you can read and comment before the vote.</p>
        </div>
        {pullError ? (
          <p className="admin-error">Couldn&apos;t load pull requests: {pullError}</p>
        ) : pulls.length === 0 ? (
          <p className="empty">{cfg ? "Nothing pending." : "Pull requests show here once GitHub is connected."}</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Change</th><th>State</th><th>Updated</th><th /></tr>
              </thead>
              <tbody>
                {pulls.map((p) => (
                  <tr key={p.number}>
                    <td><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a></td>
                    <td><span className={`admin-state ${p.draft ? "draft" : "ready"}`}>{p.draft ? "Draft" : "Waiting for owner"}</span></td>
                    <td>{fmtDate(p.updatedAt.slice(0, 10))}</td>
                    <td>
                      {p.branch.startsWith(BRANCH_PREFIX) ? (
                        <Link href={`/admin/research/edit?pr=${p.number}`}>Edit</Link>
                      ) : p.branch.startsWith(TRADES_PREFIX) ? (
                        <Link href="/admin/trades">Add trades</Link>
                      ) : p.branch.startsWith(ASSETS_PREFIX) ? (
                        <Link href="/admin/assets">Add an asset</Link>
                      ) : p.branch.startsWith(DELETE_PREFIX) ? (
                        <Link href="/admin/delete">Delete more</Link>
                      ) : p.branch.startsWith(VOTES_PREFIX) ? (
                        <Link href="/admin/votes">Add a vote</Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Published and in-progress reports</h2>
          <Link className="button" href="/admin/research/new">New report</Link>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Ticker</th><th>Name</th><th>Status</th><th>Author</th><th>Updated</th><th /></tr>
            </thead>
            <tbody>
              {docs.map(({ slug, front }) => (
                <tr key={slug}>
                  <td><b>{front.ticker}</b></td>
                  <td>{front.name}</td>
                  <td>{front.status === "published" ? "Published" : "In progress"}</td>
                  <td>{getMember(front.author)?.name ?? front.author}</td>
                  <td>{fmtDate(front.updated)}</td>
                  <td>
                    <Link href={`/admin/research/edit?slug=${slug}`}>Edit</Link> ·{" "}
                    <Link href={`/admin/votes?ticker=${front.ticker}`}>Vote</Link> ·{" "}
                    <Link href={`/admin/delete?report=${slug}`}>Delete</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
