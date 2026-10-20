"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type VoteSaveResult, saveVote } from "@/app/admin/votes/actions";
import { VerdictPill } from "@/components/Verdict";
import { CONVICTIONS, VOTES, type VoteInput, toVote } from "@/lib/admin/votes";
import { fmtDate } from "@/lib/dates";
import { money, signedPct } from "@/lib/format";
import type { Vote } from "@/lib/schemas";
import { computeVerdict } from "@/lib/verdict";

interface Research {
  author: string;
  status: "published" | "in-progress";
  thesis: string;
  fairValue?: number;
  price?: number;
}

interface Props {
  me: string;
  /** votes.csv as the new vote will find it (main, or the open vote change's branch) */
  votes: Vote[];
  assets: { ticker: string; name: string; assetClass: string }[];
  research: Record<string, Research>;
  held: string[];
  team: { initials: string; name: string; avatar: string }[];
  initialTicker?: string;
  openPr?: { number: number; url: string; pending: number };
  connected: boolean;
}

function Face({ src }: { src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="pixel-img" src={src} alt="" width={24} height={24} /> : null;
}

export function VoteForm({ me, votes, assets, research, held, team, initialTicker, openPr, connected }: Props) {
  const router = useRouter();
  // Assets with a write-up come first: those are the ones the committee is asked to vote on.
  const ordered = [...assets].sort((a, b) => Number(!research[a.ticker]) - Number(!research[b.ticker]) || a.ticker.localeCompare(b.ticker));
  const [v, setV] = useState<VoteInput>({
    ticker: initialTicker && assets.some((a) => a.ticker === initialTicker) ? initialTicker : (ordered[0]?.ticker ?? ""),
    vote: "Include",
    conviction: "Medium",
    note: "",
  });
  const [result, setResult] = useState<VoteSaveResult | undefined>();
  const [saving, start] = useTransition();

  const set = <K extends keyof VoteInput>(k: K, val: VoteInput[K]) => {
    setV((prev) => ({ ...prev, [k]: val }));
    setResult(undefined);
  };

  const asset = assets.find((a) => a.ticker === v.ticker);
  const r = research[v.ticker];
  const author = r?.author;
  const today = new Date().toISOString().slice(0, 10);
  const mine = v.ticker ? toVote(v, me, today) : undefined;
  const now = computeVerdict(votes, v.ticker, author);
  const after = computeVerdict(mine ? [...votes, mine] : votes, v.ticker, author);
  const myLast = now.latest.find((x) => x.voter === me);
  const same = myLast && myLast.vote === v.vote && myLast.conviction === v.conviction;
  const upside = r?.fairValue && r.price ? r.fairValue / r.price - 1 : undefined;

  const submit = () =>
    start(async () => {
      const res = await saveVote(v, openPr?.number);
      setResult(res);
      if (res.ok) {
        setV((prev) => ({ ...prev, note: "" }));
        router.refresh();
      }
    });

  return (
    <main className="page admin-form-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link> › Record vote
      </nav>
      <section className="hero" style={{ padding: "16px 0 8px" }}>
        <h1>Record vote</h1>
        <p className="tagline">Your own vote only. A change of mind is a new vote; the old one stays in the history.</p>
      </section>

      {!connected && (
        <p className="admin-notice">GitHub isn&apos;t connected here, so submitting shows the file instead of opening a pull request.</p>
      )}
      {openPr && (
        <p className="admin-notice">
          {openPr.pending} vote{openPr.pending === 1 ? " is" : "s are"} already waiting in{" "}
          <a href={openPr.url} target="_blank" rel="noreferrer">pull request #{openPr.number}</a>. Your vote is added to it, and the
          standings below include them.
        </p>
      )}

      <div className="vote-layout">
        <section className="form-section vote-editor" aria-label="Your vote">
          <label>
            Asset
            <select value={v.ticker} onChange={(e) => set("ticker", e.target.value)}>
              {ordered.map((a) => (
                <option key={a.ticker} value={a.ticker}>
                  {a.ticker} · {a.name}
                  {research[a.ticker] ? "" : " (no write-up)"}
                </option>
              ))}
            </select>
          </label>

          {asset && (
            <div className="vote-asset">
              <p>
                <b>{asset.name}</b> · {asset.assetClass}
                {held.includes(asset.ticker) ? " · held" : " · not held"}
              </p>
              {r ? (
                <>
                  <p className="preview-thesis">&ldquo;{r.thesis}&rdquo;</p>
                  <p className="field-note">
                    {r.status === "published" ? "Published" : "Analysis in progress"} · by{" "}
                    {team.find((t) => t.initials === r.author)?.name ?? r.author}
                    {r.fairValue && <> · fair value {money(r.fairValue)}</>}
                    {r.price && <> · price {money(r.price)}</>}
                    {upside !== undefined && <span className={upside >= 0 ? "gain" : "loss"}> · {signedPct(upside)} upside</span>}
                  </p>
                  <Link href={`/research/${asset.ticker.toLowerCase()}`} target="_blank">Read the write-up ↗</Link>
                </>
              ) : (
                <p className="field-note">No research report yet. You can still vote; most votes follow a write-up.</p>
              )}
            </div>
          )}

          <fieldset className="segmented">
            <legend>Vote</legend>
            {VOTES.map((x) => (
              <label key={x} className={`seg ${x}${v.vote === x ? " on" : ""}`}>
                <input type="radio" name="vote" checked={v.vote === x} onChange={() => set("vote", x)} />
                {x}
              </label>
            ))}
          </fieldset>
          <fieldset className="segmented">
            <legend>Conviction</legend>
            {CONVICTIONS.map((x) => (
              <label key={x} className={`seg${v.conviction === x ? " on" : ""}`}>
                <input type="radio" name="conviction" checked={v.conviction === x} onChange={() => set("conviction", x)} />
                {x}
              </label>
            ))}
          </fieldset>
          <label>
            Note (optional)
            <input value={v.note} maxLength={300} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Waiting for earnings" />
          </label>

          {author === me && v.vote === "Include" && (
            <p className="field-note">You wrote this report, so your Include alone never carries it: one other member has to agree.</p>
          )}
          {same && myLast && (
            <p className="field-note">
              Same as your vote on {fmtDate(myLast.date, true)}. Submitting records it again with today&apos;s date.
            </p>
          )}
        </section>

        <section className="vote-review" aria-label="Committee">
          <h2>The committee on {v.ticker || "…"}</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th className="left">Member</th><th>Latest vote</th><th>Conviction</th><th>Date</th></tr>
              </thead>
              <tbody>
                {team.map((t) => {
                  const last = now.latest.find((x) => x.voter === t.initials);
                  const next = after.latest.find((x) => x.voter === t.initials);
                  const changes = t.initials === me;
                  return (
                    <tr key={t.initials} className={changes ? "changed" : ""}>
                      <td className="left">
                        <span className="member">
                          <Face src={t.avatar} /> {t.name}
                          {t.initials === author && <span className="field-note"> (author)</span>}
                          {changes && <span className="field-note"> (you)</span>}
                        </span>
                      </td>
                      <td>
                        {last ? <VerdictPill verdict={last.vote} /> : <span className="muted">no vote</span>}
                        {changes && next && (
                          <>
                            {" → "}
                            <VerdictPill verdict={next.vote} />
                          </>
                        )}
                      </td>
                      <td>{changes ? next?.conviction : (last?.conviction ?? "")}</td>
                      <td>{changes ? "today" : last ? fmtDate(last.date) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="vote-verdict">
            <div>
              <span>Verdict now</span>
              <VerdictPill verdict={now.verdict} />
              {now.verdict === "Unvoted" && <b className="muted">Unvoted</b>}
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <span>With your vote</span>
              <VerdictPill verdict={after.verdict} />
            </div>
          </div>
          <p className="field-note">
            Include needs 2 of the 3 latest votes, and the author&apos;s Include alone never carries it. Two Rejects mean Reject;
            anything else is Watch.
          </p>
          {now.latest.some((x) => x.note) && (
            <details className="trade-pending">
              <summary>Notes from the latest votes</summary>
              <ul>
                {now.latest.filter((x) => x.note).map((x) => (
                  <li key={x.voter}>
                    {team.find((t) => t.initials === x.voter)?.name ?? x.voter}: {x.note}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>

      {result && !result.ok && (
        <div className="admin-error" role="alert">
          {result.error}
          {result.dryRun && (
            <details open>
              <summary><code>data/votes.csv</code></summary>
              <pre>{result.dryRun}</pre>
            </details>
          )}
        </div>
      )}
      {result?.ok && (
        <div className="admin-success" role="status">
          <b>✓ Vote recorded:</b> <a href={result.pr.url} target="_blank" rel="noreferrer">pull request #{result.pr.number}</a>. Once
          the owner merges it, {v.ticker} shows as <b>{result.verdict}</b>. <Link href="/admin">Back to admin</Link>
        </div>
      )}

      <div className="form-actions">
        <span className="field-note">
          {me} · {v.vote} · {v.conviction} on {v.ticker}
        </span>
        <button type="button" className="button" disabled={saving || !asset} onClick={submit}>
          {saving ? "Submitting…" : openPr ? `Add to #${openPr.number} →` : "Cast vote →"}
        </button>
      </div>
    </main>
  );
}
