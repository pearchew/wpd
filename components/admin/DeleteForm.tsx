"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { type DeleteResult, deleteItems } from "@/app/admin/delete/actions";
import { type RowRef, type Selection, type Sources, dataLines, emptySelection, planDeletion } from "@/lib/admin/deletions";

type Tab = "assets" | "reports" | "trades" | "votes";

interface Props {
  /** The data as the deletion will find it (main, or the open delete change's branch) */
  sources: Sources;
  initialTab: Tab;
  preselect: { asset?: string; report?: string };
  openPr?: { number: number; url: string };
  connected: boolean;
}

/** The rows of a CSV as records, each with its position among the data lines and its exact text. */
function rows(csv: string): { idx: number; line: string; r: Record<string, string> }[] {
  const d = dataLines(csv);
  if (!d) return [];
  const cols = (Papa.parse<string[]>(d.header).data[0] ?? []).map((c) => c.trim());
  return d.lines.flatMap((line, idx) => {
    if (!line.trim()) return [];
    const cells = Papa.parse<string[]>(line).data[0] ?? [];
    return [{ idx, line, r: Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()])) }];
  });
}

export function DeleteForm({ sources, initialTab, preselect, openPr, connected }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sel, setSel] = useState<Selection>(() => ({
    ...emptySelection(),
    assets: preselect.asset ? [preselect.asset] : [],
    reports: preselect.report && sources.reports.some((r) => r.slug === preselect.report) ? [preselect.report] : [],
  }));
  const [reason, setReason] = useState("");
  const [sure, setSure] = useState(false);
  const [result, setResult] = useState<DeleteResult | undefined>();
  const [saving, start] = useTransition();

  const assets = useMemo(() => rows(sources.instrumentsCsv), [sources.instrumentsCsv]);
  const trades = useMemo(() => rows(sources.tradesCsv), [sources.tradesCsv]);
  const votes = useMemo(() => rows(sources.votesCsv), [sources.votesCsv]);
  const plan = useMemo(() => planDeletion(sources, sel), [sources, sel]);

  const goingTrades = new Map(plan.trades.map((t) => [t.idx, t.because]));
  const goingVotes = new Map(plan.votes.map((v) => [v.idx, v.because]));
  const goingAssets = new Map(plan.assets.map((a) => [a.ticker, a.because]));
  const goingReports = new Map(plan.reports.map((r) => [r.slug, r.because]));

  const change = (next: Selection) => {
    setSel(next);
    setResult(undefined);
    setSure(false);
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleRow = (list: RowRef[], ref: RowRef) =>
    list.some((x) => x.idx === ref.idx) ? list.filter((x) => x.idx !== ref.idx) : [...list, ref];

  const submit = () =>
    start(async () => {
      const r = await deleteItems(sel, reason, openPr?.number);
      setResult(r);
      if (r.ok) {
        change(emptySelection());
        setReason("");
        router.refresh();
      }
    });

  const count = { assets: sel.assets.length, reports: sel.reports.length, trades: sel.trades.length, votes: sel.votes.length };
  // A row swept up by a deleted asset shows as going, with the reason, and can't be unticked on its own.
  const cascaded = (because: string | undefined) => because && <span className="field-note"> with {because}</span>;

  return (
    <main className="page admin-form-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link> › Delete
      </nav>
      <section className="hero" style={{ padding: "16px 0 8px" }}>
        <h1>Delete</h1>
        <p className="tagline">Remove assets, reports, trades or votes. Nothing goes until the owner merges the pull request.</p>
      </section>

      {!connected && (
        <p className="admin-notice">GitHub isn&apos;t connected here, so submitting shows the changes instead of opening a pull request.</p>
      )}
      {openPr && (
        <p className="admin-notice">
          A delete change is already waiting in{" "}
          <a href={openPr.url} target="_blank" rel="noreferrer">pull request #{openPr.number}</a>. This page shows the data as it
          will be after that one, and new deletions are added to it.
        </p>
      )}

      <div className="trade-layout">
        <section className="delete-pick" aria-label="Pick what to delete">
          <div className="form-tabs delete-tabs" role="tablist">
            {(["assets", "reports", "trades", "votes"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
                {count[t] > 0 && <span className="badge warn"> {count[t]}</span>}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table className="admin-table delete-table">
              {tab === "assets" && (
                <>
                  <thead>
                    <tr><th /><th className="left">Asset</th><th>Type</th><th>Used by</th></tr>
                  </thead>
                  <tbody>
                    {assets.map(({ r }) => {
                      const t = r.ticker;
                      const bench = t === sources.benchmark;
                      const nT = trades.filter((x) => x.r.ticker === t).length;
                      const nV = votes.filter((x) => x.r.ticker === t).length;
                      const rep = sources.reports.some((x) => x.ticker === t);
                      const by = goingAssets.get(t);
                      const on = goingAssets.has(t);
                      return (
                        <tr key={t} className={on ? "going" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Delete ${t}`}
                              checked={on}
                              disabled={bench || Boolean(by)}
                              onChange={() => change({ ...sel, assets: toggle(sel.assets, t) })}
                            />
                          </td>
                          <td className="left">
                            <b>{t}</b> · {r.name}
                            {bench && <span className="field-note"> (benchmark, can&apos;t be deleted)</span>}
                            {cascaded(by)}
                          </td>
                          <td>{r.kind}</td>
                          <td className="muted">
                            {[nT && `${nT} trade${nT === 1 ? "" : "s"}`, nV && `${nV} vote${nV === 1 ? "" : "s"}`, rep && "report"].filter(Boolean).join(" · ") || "nothing"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
              {tab === "reports" && (
                <>
                  <thead>
                    <tr><th /><th className="left">Report</th><th>Model</th></tr>
                  </thead>
                  <tbody>
                    {sources.reports.length === 0 && <tr><td colSpan={3} className="muted">No reports.</td></tr>}
                    {sources.reports.map((x) => {
                      const by = goingReports.get(x.slug);
                      const on = goingReports.has(x.slug);
                      return (
                        <tr key={x.slug} className={on ? "going" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Delete the ${x.ticker} report`}
                              checked={on}
                              disabled={Boolean(by)}
                              onChange={() => change({ ...sel, reports: toggle(sel.reports, x.slug) })}
                            />
                          </td>
                          <td className="left"><b>{x.ticker}</b> · {x.name}{cascaded(by)}</td>
                          <td className="muted">{x.model ?? "none"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
              {tab === "trades" && (
                <>
                  <thead>
                    <tr><th /><th className="left">Date</th><th>Action</th><th>Asset</th><th>Shares</th><th>Price</th><th className="left">Note</th></tr>
                  </thead>
                  <tbody>
                    {[...trades].reverse().map(({ idx, line, r }) => {
                      const by = goingTrades.get(idx);
                      const on = goingTrades.has(idx);
                      return (
                        <tr key={idx} className={on ? "going" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Delete trade ${r.date} ${r.action} ${r.ticker}`}
                              checked={on}
                              disabled={Boolean(by)}
                              onChange={() => change({ ...sel, trades: toggleRow(sel.trades, { idx, line }) })}
                            />
                          </td>
                          <td className="left">{r.date}</td>
                          <td>{r.action}{r.book === "paper" ? " (paper)" : ""}</td>
                          <td>{r.ticker}{cascaded(by)}</td>
                          <td>{r.shares}</td>
                          <td>{r.price}</td>
                          <td className="left muted">{r.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
              {tab === "votes" && (
                <>
                  <thead>
                    <tr><th /><th className="left">Date</th><th>Asset</th><th>Voter</th><th>Vote</th><th>Conviction</th><th className="left">Note</th></tr>
                  </thead>
                  <tbody>
                    {[...votes].reverse().map(({ idx, line, r }) => {
                      const by = goingVotes.get(idx);
                      const on = goingVotes.has(idx);
                      return (
                        <tr key={idx} className={on ? "going" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Delete vote ${r.date} ${r.voter} on ${r.ticker}`}
                              checked={on}
                              disabled={Boolean(by)}
                              onChange={() => change({ ...sel, votes: toggleRow(sel.votes, { idx, line }) })}
                            />
                          </td>
                          <td className="left">{r.date}</td>
                          <td>{r.ticker}{cascaded(by)}</td>
                          <td>{r.voter}</td>
                          <td>{r.vote}</td>
                          <td>{r.conviction}</td>
                          <td className="left muted">{r.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </section>

        <section className="trade-review" aria-label="Review">
          <h2>Will be deleted</h2>
          {plan.empty ? (
            <p className="empty">Nothing selected yet. Tick rows on the left.</p>
          ) : (
            <ul className="delete-plan">
              {plan.assets.map((a) => (
                <li key={`a${a.ticker}`}>Asset <b>{a.ticker}</b>{a.because && <span className="field-note"> (built on {a.because})</span>}</li>
              ))}
              {plan.reports.map((r) => (
                <li key={`r${r.slug}`}>The <b>{r.ticker}</b> report{r.because && <span className="field-note"> (with {r.because})</span>}</li>
              ))}
              {plan.trades.map((t) => (
                <li key={`t${t.idx}`}>Trade <code>{t.line}</code>{t.because && <span className="field-note"> (with {t.because})</span>}</li>
              ))}
              {plan.votes.map((v) => (
                <li key={`v${v.idx}`}>Vote <code>{v.line}</code>{v.because && <span className="field-note"> (with {v.because})</span>}</li>
              ))}
              {plan.removeFiles.map((f) => (
                <li key={f}>File <code>{f}</code></li>
              ))}
            </ul>
          )}
          {plan.errors.length > 0 ? (
            <ul className="admin-error trade-errors">
              {plan.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          ) : (
            !plan.empty && <p className="field-ok">✓ What&apos;s left still passes the site&apos;s checks</p>
          )}
          {!plan.empty && plan.errors.length === 0 && (
            <>
              <label className="delete-reason">
                Why (optional, goes in the pull request)
                <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Entered on the wrong date" />
              </label>
              <label className="check delete-sure">
                <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /> I understand these come off the site
                once the pull request is merged
              </label>
            </>
          )}
        </section>
      </div>

      {result && !result.ok && (
        <div className="admin-error" role="alert">
          {result.error}
          {result.problems && <ul>{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          {result.dryRun?.map((f) => (
            <details key={f.path} open={Boolean(f.text)}>
              <summary><code>{f.path}</code> {f.text ? "(new contents)" : "(removed)"}</summary>
              {f.text && <pre>{f.text}</pre>}
            </details>
          ))}
        </div>
      )}
      {result?.ok && (
        <div className="admin-success" role="status">
          <b>✓ Deletion sent for review:</b> {result.summary},{" "}
          <a href={result.pr.url} target="_blank" rel="noreferrer">pull request #{result.pr.number}</a>. Close it without merging to
          cancel. <Link href="/admin">Back to admin</Link>
        </div>
      )}

      <div className="form-actions">
        <span className="field-note">{plan.empty ? "Nothing selected" : `Deleting ${[plan.assets.length && `${plan.assets.length} asset(s)`, plan.reports.length && `${plan.reports.length} report(s)`, plan.trades.length && `${plan.trades.length} trade(s)`, plan.votes.length && `${plan.votes.length} vote(s)`].filter(Boolean).join(", ")}`}</span>
        <button type="button" className="button danger" disabled={saving || plan.empty || plan.errors.length > 0 || !sure} onClick={submit}>
          {saving ? "Submitting…" : openPr ? `Add to #${openPr.number} →` : "Open delete pull request →"}
        </button>
      </div>
    </main>
  );
}
