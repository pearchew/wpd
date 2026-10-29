"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type AssetSaveResult, saveAsset } from "@/app/admin/assets/actions";
import {
  type AssetInput,
  KINDS,
  KIND_LABEL,
  type Kind,
  assetProblems,
  emptyAsset,
  instrumentRow,
  optionSymbols,
} from "@/lib/admin/assets";
import { ASSET_CLASSES, type AssetClass, type Instrument } from "@/lib/schemas";

interface Props {
  today: string;
  /** instruments.csv as the new row will find it (main, or the open asset change's branch) */
  instruments: Instrument[];
  /** Tickers that already have price history */
  priced: string[];
  /** Tickers already waiting in the open asset change */
  pending: string[];
  openPr?: { number: number; url: string };
  connected: boolean;
}

export function AssetForm({ today, instruments, priced, pending, openPr, connected }: Props) {
  const router = useRouter();
  const [a, setA] = useState<AssetInput>(emptyAsset());
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<AssetSaveResult | undefined>();
  const [saving, start] = useTransition();

  const problems = assetProblems(a, instruments, today);
  const derivative = a.kind === "future" || a.kind === "option";
  const symbols = a.kind === "option" ? optionSymbols(a) : undefined;
  const row = instrumentRow(a);
  const underlyings = instruments.filter((i) => i.kind === "stock" || i.kind === "etf");

  const set = <K extends keyof AssetInput>(k: K, v: AssetInput[K]) => {
    setA((prev) => ({ ...prev, [k]: v }));
    setResult(undefined);
  };
  const pickKind = (kind: Kind) => {
    // Keep what carries over (name, currency); reset what depends on the kind.
    setA((prev) => ({ ...emptyAsset(kind), name: kind === "option" ? "" : prev.name, currency: prev.currency, ticker: kind === "option" ? "" : prev.ticker }));
    setTouched(false);
    setResult(undefined);
  };
  // The ticker clash is worth knowing straight away; everything else waits for the first submit.
  const err = (k: keyof AssetInput) =>
    (touched || (k === "ticker" && a.ticker && problems.ticker?.includes("already"))) &&
    problems[k] && <span className="field-error">{problems[k]}</span>;

  const submit = () => {
    setTouched(true);
    if (Object.keys(problems).length) return;
    start(async () => {
      const r = await saveAsset(a, openPr?.number);
      setResult(r);
      if (r.ok) {
        setA(emptyAsset(a.kind));
        setTouched(false);
        router.refresh();
      }
    });
  };

  const text = (k: keyof AssetInput, label: string, extra: { placeholder?: string; hint?: React.ReactNode; inputMode?: "decimal" } = {}) => (
    <label>
      {label}
      <input value={a[k] as string} inputMode={extra.inputMode} placeholder={extra.placeholder} onChange={(e) => set(k, e.target.value as never)} />
      {err(k) || (extra.hint && <span className="field-note">{extra.hint}</span>)}
    </label>
  );

  return (
    <main className="page admin-form-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link> › Add asset
      </nav>
      <section className="hero" style={{ padding: "16px 0 8px" }}>
        <h1>Add asset</h1>
        <p className="tagline">Put a stock, ETF, future or option on the asset list, so it can be researched, voted on and traded.</p>
      </section>

      {!connected && (
        <p className="admin-notice">GitHub isn&apos;t connected here, so submitting shows the file instead of opening a pull request.</p>
      )}
      {openPr && (
        <p className="admin-notice">
          {pending.length ? pending.join(", ") : "Some assets"} {pending.length === 1 ? "is" : "are"} already waiting in{" "}
          <a href={openPr.url} target="_blank" rel="noreferrer">pull request #{openPr.number}</a>. New assets are added to it.
        </p>
      )}

      <div className="trade-layout">
        <section className="form-section trade-editor" aria-label="New asset">
          <fieldset className="segmented">
            <legend>Type</legend>
            {KINDS.map((k) => (
              <label key={k} className={`seg${a.kind === k ? " on" : ""}`}>
                <input type="radio" name="kind" checked={a.kind === k} onChange={() => pickKind(k)} />
                {KIND_LABEL[k]}
              </label>
            ))}
          </fieldset>
          {derivative && (
            <p className="field-note">Futures and options are paper trades only: they show in the Paper and Combined views, never in real capital.</p>
          )}

          {a.kind === "option" ? (
            <>
              <div className="field-grid">
                <label>
                  Underlying
                  <select value={a.underlying} onChange={(e) => set("underlying", e.target.value)}>
                    <option value="">Choose…</option>
                    {underlyings.map((i) => <option key={i.ticker} value={i.ticker}>{i.ticker} · {i.name}</option>)}
                  </select>
                  {err("underlying")}
                </label>
                <label>
                  Expiry
                  <input type="date" min={today} value={a.expiry} onChange={(e) => set("expiry", e.target.value)} />
                  {err("expiry")}
                </label>
              </div>
              <fieldset className="segmented">
                <legend>Call or put</legend>
                {(["call", "put"] as const).map((t) => (
                  <label key={t} className={`seg${a.optionType === t ? " on" : ""}`}>
                    <input type="radio" name="optionType" checked={a.optionType === t} onChange={() => set("optionType", t)} />
                    {t === "call" ? "Call" : "Put"}
                  </label>
                ))}
              </fieldset>
              <div className="field-grid">
                {text("strike", "Strike", { inputMode: "decimal", placeholder: "640" })}
                {text("multiplier", "Shares per contract", { inputMode: "decimal", hint: "100 for US equity options" })}
              </div>
              <div className="option-symbols">
                <div><span>Ticker</span><code>{symbols?.ticker ?? "…"}</code></div>
                <div><span>Feed symbol (OCC)</span><code>{a.feedSymbol || symbols?.feedSymbol || "…"}</code></div>
              </div>
              {err("ticker")}
              {text("name", "Name", { placeholder: symbols?.name ?? "SPY Dec 18 2026 640 put", hint: "Leave blank to use the suggestion" })}
            </>
          ) : (
            <>
              <div className="field-grid">
                <label>
                  Ticker
                  <input
                    value={a.ticker}
                    onChange={(e) => set("ticker", e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    placeholder={a.kind === "future" ? "MES" : "JNJ"}
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  {err("ticker")}
                </label>
                {text("name", "Name", { placeholder: a.kind === "future" ? "Micro E-mini S&P 500 future (Dec)" : "Johnson & Johnson" })}
              </div>
              <div className="field-grid">
                <label>
                  Asset class
                  <select value={a.assetClass} disabled={derivative} onChange={(e) => set("assetClass", e.target.value as AssetClass)}>
                    {ASSET_CLASSES.filter((c) => derivative || c !== "Derivatives").map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {err("assetClass") || <span className="field-note">Bond ETFs are Fixed Income; gold and oil are Commodities</span>}
                </label>
                {text("feedSymbol", "Price feed symbol", {
                  placeholder: a.kind === "future" ? "MESZ26.CME" : a.ticker || "JNJ",
                  hint:
                    a.kind === "future"
                      ? "Yahoo Finance's symbol for this contract month, e.g. HGZ26.CMX or MGCZ26.CMX"
                      : "Yahoo Finance's symbol; leave blank if it matches the ticker (BMRI.JK, PTBA.JK, 042660.KS already do)",
                })}
              </div>
            </>
          )}

          {a.kind === "future" && (
            <>
              <div className="field-grid">
                <label>
                  Underlying
                  <select value={a.underlying} onChange={(e) => set("underlying", e.target.value)}>
                    <option value="">Choose…</option>
                    {underlyings.map((i) => <option key={i.ticker} value={i.ticker}>{i.ticker} · {i.name}</option>)}
                  </select>
                  {err("underlying") || <span className="field-note">A stock or ETF that tracks it, e.g. SPY for MES</span>}
                </label>
                {text("underlyingScale", "Underlying scale", {
                  inputMode: "decimal",
                  placeholder: "10",
                  hint: "Future ≈ underlying × this; 10 for MES on SPY. Blank means 1",
                })}
              </div>
              <div className="field-grid">
                {text("multiplier", "Multiplier ($ per point)", { inputMode: "decimal", placeholder: "5", hint: "5 for MES, 100 for MCL" })}
                <label>
                  Expiry
                  <input type="date" min={today} value={a.expiry} onChange={(e) => set("expiry", e.target.value)} />
                  {err("expiry")}
                </label>
              </div>
              <div className="field-grid">
                {text("margin", "Initial margin ($ per contract)", { inputMode: "decimal", placeholder: "2500" })}
                {text("maintMargin", "Maintenance margin", { inputMode: "decimal", placeholder: "2000", hint: "Optional; defaults to the initial margin" })}
              </div>
            </>
          )}

          <div className="field-grid">
            <label>
              Currency
              <input value={a.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
              {err("currency")}
            </label>
          </div>
        </section>

        <section className="trade-review" aria-label="Review">
          <h2>Row to be added</h2>
          <pre className="csv-preview">
            <span className="muted">{Object.keys(row).join(",")}</span>
            {"\n"}
            {Object.values(row).join(",")}
          </pre>

          <h3>What happens next</h3>
          <ol className="next-steps">
            <li>The owner merges the pull request.</li>
            <li>
              The owner loads its price history (<code>npm run db:backfill</code>, or <b>Run</b> on the cron job in Vercel). The daily
              job keeps it up to date after that.
            </li>
            <li>
              Then it can be traded. Until it has prices, the <Link href="/admin/trades">trade form</Link> won&apos;t offer a buy in it.
              Research and votes can start straight away.
            </li>
          </ol>

          <details className="trade-pending">
            <summary>Assets already listed ({instruments.length})</summary>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th className="left">Ticker</th><th className="left">Name</th><th>Type</th><th>Prices</th></tr>
                </thead>
                <tbody>
                  {instruments.map((i) => (
                    <tr key={i.ticker}>
                      <td className="left"><b>{i.ticker}</b></td>
                      <td className="left">{i.name}</td>
                      <td>{KIND_LABEL[i.kind]}</td>
                      <td>{priced.includes(i.ticker) ? "✓" : pending.includes(i.ticker) ? "waiting" : "none yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      </div>

      {result && !result.ok && (
        <div className="admin-error" role="alert">
          {result.error}
          {result.problems && <ul>{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          {result.dryRun && (
            <details open>
              <summary><code>data/instruments.csv</code></summary>
              <pre>{result.dryRun}</pre>
            </details>
          )}
        </div>
      )}
      {result?.ok && (
        <div className="admin-success" role="status">
          <b>✓ {result.ticker} sent for review:</b>{" "}
          <a href={result.pr.url} target="_blank" rel="noreferrer">pull request #{result.pr.number}</a>. Once it&apos;s merged, the
          owner loads its prices and it can be traded. <Link href="/admin">Back to admin</Link>
        </div>
      )}

      <div className="form-actions">
        <span className={touched && Object.keys(problems).length ? "field-error" : "field-note"}>
          {touched && Object.keys(problems).length
            ? `${Object.keys(problems).length} field${Object.keys(problems).length === 1 ? "" : "s"} to fix`
            : `${KIND_LABEL[a.kind]}${row.ticker ? ` · ${row.ticker}` : ""}`}
        </span>
        <button type="button" className="button" disabled={saving} onClick={submit}>
          {saving ? "Submitting…" : openPr ? `Add to #${openPr.number} →` : "Add asset →"}
        </button>
      </div>
    </main>
  );
}
