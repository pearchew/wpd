"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { type SavePayload, type SaveResult, saveReport } from "@/app/admin/research/actions";
import type { FormContext } from "@/lib/admin/load";
import {
  METHODS,
  MODEL_MAX_BYTES,
  type NewAsset,
  type ReportDraft,
  THESIS_HINT,
  problems,
  usesMdxComponents,
} from "@/lib/admin/report";
import { ASSET_CLASSES, type AssetClass } from "@/lib/schemas";
import { RichEditor } from "./RichEditor";

interface Props {
  initial: ReportDraft;
  body: string;
  isNew: boolean;
  pr?: { number: number; url: string; draft: boolean };
  ctx: FormContext;
  connected: boolean;
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(1)}%`;

/** The committee's thresholds from Fund Rules, as a hint while typing the fair value. */
function upsideHint(cls: AssetClass, upside: number): { text: string; tone: "gain" | "loss" | "flat" } {
  if (cls !== "Equities") return { text: "Bonds and gold are judged on volatility and Sharpe, not upside", tone: "flat" };
  if (upside >= 0.15) return { text: "Clears the 15% Include bar", tone: "gain" };
  if (upside >= 0) return { text: "Watch range (0–15% upside)", tone: "flat" };
  return { text: "Below the price: Reject range", tone: "loss" };
}

export function ReportForm({ initial, body: initialBody, isNew, pr: initialPr, ctx, connected }: Props) {
  const router = useRouter();
  const [d, setD] = useState<ReportDraft>(initial);
  const [body, setBody] = useState(initialBody);
  const [html, setHtml] = useState("");
  const [file, setFile] = useState<File | undefined>();
  const [asset, setAsset] = useState<NewAsset>({ kind: "stock", currency: "USD", feedSymbol: "" });
  const [pr, setPr] = useState(initialPr);
  const [result, setResult] = useState<SaveResult | undefined>();
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [pending, start] = useTransition();

  // The ticker can't change once the file exists: it is the file name.
  const tickerLocked = !isNew || Boolean(pr);
  const ticker = d.ticker.trim().toUpperCase();
  const known = ctx.assets.find((a) => a.ticker === ticker);
  const duplicate = isNew && !pr && ctx.reports.includes(ticker);
  const price = ctx.prices[ticker];
  const fv = Number(d.fairValue.replace(/[$,\s]/g, ""));
  const upside = price && fv > 0 ? fv / price - 1 : undefined;
  const author = ctx.team.find((t) => t.initials === d.author);
  const mdxWarning = useMemo(() => usesMdxComponents(initialBody), [initialBody]);

  const fieldErrors: Partial<Record<string, string>> = {
    ...problems(d),
    ...(duplicate ? { ticker: "Already has a report: edit that one" } : {}),
    ...(file && file.size > MODEL_MAX_BYTES ? { model: "Over 4 MB" } : {}),
    ...(result && !result.ok ? result.fields : {}),
  };
  const blocking = Object.keys(fieldErrors).filter((k) => fieldErrors[k]);
  const ready = blocking.length === 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof ReportDraft>(k: K, v: ReportDraft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
    setResult(undefined);
  };

  const pickTicker = (raw: string) => {
    const t = raw.toUpperCase().replace(/\s+/g, "");
    const a = ctx.assets.find((x) => x.ticker === t);
    setD((prev) => ({
      ...prev,
      ticker: t,
      ...(a ? { name: a.name, assetClass: a.assetClass as AssetClass } : {}),
    }));
    setDirty(true);
    setResult(undefined);
  };

  const save = (mode: "draft" | "submit") => {
    const payload: SavePayload = { draft: d, body, mode, isNew, pr: pr?.number, newAsset: known ? undefined : asset };
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (file) form.set("model", file);
    start(async () => {
      const r = await saveReport(form);
      setResult(r);
      if (r.ok) {
        setDirty(false);
        setFile(undefined);
        if (!pr) router.replace(`/admin/research/edit?pr=${r.pr.number}`, { scroll: false });
        setPr(r.pr);
      }
    });
  };

  const err = (k: string) => fieldErrors[k] && <span className="field-error">{fieldErrors[k]}</span>;
  const sectionBadge = (keys: string[]) => {
    const n = keys.filter((k) => fieldErrors[k]).length;
    return n ? <span className="badge warn">⚠ {n}</span> : <span className="badge ok">✓</span>;
  };

  return (
    <main className="page admin-form-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link> › Research › {isNew && !pr ? "New report" : `Edit ${ticker}`}
        {pr && (
          <>
            {" "}
            · <a href={pr.url} target="_blank" rel="noreferrer">pull request #{pr.number}</a>
            {pr.draft ? " (draft)" : " (waiting for owner)"}
          </>
        )}
      </nav>

      {!connected && (
        <p className="admin-notice">GitHub isn&apos;t connected here, so saving shows the file instead of opening a pull request.</p>
      )}
      {mdxWarning && (
        <p className="admin-notice">
          This report uses custom MDX components. The editor keeps text, headings, lists, links and tables only; edit this one on
          GitHub to keep the components.
        </p>
      )}

      <div className="form-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>Edit</button>
        <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
      </div>

      <div className={`report-form show-${tab}`}>
        <div className="report-fields">
          <details open className="form-section">
            <summary>
              1. The asset {sectionBadge(["ticker", "name", "assetClass", "method"])}
            </summary>
            <div className="field-grid">
              <label>
                Ticker
                <input
                  value={d.ticker}
                  onChange={(e) => pickTicker(e.target.value)}
                  list="known-tickers"
                  disabled={tickerLocked}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                {err("ticker") ||
                  (ticker &&
                    (known ? <span className="field-ok">✓ known asset</span> : <span className="field-note">New to the site</span>))}
              </label>
              <datalist id="known-tickers">
                {ctx.assets.map((a) => <option key={a.ticker} value={a.ticker}>{a.name}</option>)}
              </datalist>
              <label>
                Name
                <input value={d.name} onChange={(e) => set("name", e.target.value)} />
                {err("name")}
              </label>
              <label>
                Asset class
                <select value={d.assetClass} disabled={Boolean(known)} onChange={(e) => set("assetClass", e.target.value as AssetClass)}>
                  {ASSET_CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {err("assetClass") || (known && <span className="field-note">From the asset list</span>)}
              </label>
              <label>
                Method
                <input value={d.method} onChange={(e) => set("method", e.target.value)} list="methods" />
                {err("method") || <span className="field-note">Pick one or type your own</span>}
              </label>
              <datalist id="methods">
                {METHODS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            {ticker && !known && !tickerLocked && (
              <fieldset className="new-asset">
                <legend>Add {ticker} to the asset list</legend>
                <p className="field-note">
                  Saved in the same pull request. Stocks and ETFs only here; futures and options still go in{" "}
                  <code>instruments.csv</code> by hand.
                </p>
                <div className="field-grid">
                  <label>
                    Type
                    <select value={asset.kind} onChange={(e) => setAsset({ ...asset, kind: e.target.value as NewAsset["kind"] })}>
                      <option value="stock">Stock</option>
                      <option value="etf">ETF</option>
                    </select>
                  </label>
                  <label>
                    Currency
                    <input value={asset.currency} maxLength={3} onChange={(e) => setAsset({ ...asset, currency: e.target.value.toUpperCase() })} />
                  </label>
                  <label>
                    Price feed symbol
                    <input value={asset.feedSymbol} placeholder={ticker} onChange={(e) => setAsset({ ...asset, feedSymbol: e.target.value })} />
                    <span className="field-note">Leave blank if it matches the ticker</span>
                  </label>
                </div>
              </fieldset>
            )}
          </details>

          <details open className="form-section">
            <summary>
              2. The call {sectionBadge(["status", "fairValue", "thesis", "sellTrigger"])}
            </summary>
            <div className="radio-row" role="radiogroup" aria-label="Status">
              <label className="check">
                <input type="radio" checked={d.status === "in-progress"} onChange={() => set("status", "in-progress")} /> In progress
              </label>
              <label className="check">
                <input type="radio" checked={d.status === "published"} onChange={() => set("status", "published")} /> Published
              </label>
            </div>
            <label>
              Fair value (per share)
              <input value={d.fairValue} inputMode="decimal" onChange={(e) => set("fairValue", e.target.value)} placeholder="182.00" />
              {err("fairValue") ||
                (price ? (
                  upside !== undefined ? (
                    <span className={`field-note ${upsideHint(d.assetClass, upside).tone}`}>
                      Latest close {money(price)} → {pct(upside)} · {upsideHint(d.assetClass, upside).text}
                    </span>
                  ) : (
                    <span className="field-note">Latest close {money(price)}</span>
                  )
                ) : (
                  ticker && <span className="field-note">No price yet for {ticker}</span>
                ))}
            </label>
            <label>
              Thesis
              <textarea rows={2} value={d.thesis} onChange={(e) => set("thesis", e.target.value)} placeholder="One sentence on why we own it" />
              {err("thesis") || (
                <span className={`field-note${d.thesis.length > THESIS_HINT ? " loss" : ""}`}>
                  Shown on the site · {d.thesis.length} / {THESIS_HINT}
                </span>
              )}
            </label>
            <label>
              Sell trigger
              <textarea rows={2} value={d.sellTrigger} onChange={(e) => set("sellTrigger", e.target.value)} placeholder="What would make us sell" />
              {err("sellTrigger") || (d.status === "in-progress" && <span className="field-note">Required before you can publish</span>)}
            </label>
          </details>

          <details open={d.keyOutputs.length > 0} className="form-section">
            <summary>
              3. Key outputs <span className="badge">optional</span>
            </summary>
            {d.keyOutputs.map((o, i) => (
              <div className="output-row" key={i}>
                <input
                  aria-label="Label"
                  placeholder="Sustainable growth"
                  value={o.label}
                  onChange={(e) => set("keyOutputs", d.keyOutputs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  aria-label="Value"
                  placeholder="9.9%"
                  value={o.value}
                  onChange={(e) => set("keyOutputs", d.keyOutputs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
                <button type="button" className="icon-button" aria-label="Remove output" onClick={() => set("keyOutputs", d.keyOutputs.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            {err("keyOutputs")}
            <button type="button" className="link-button" onClick={() => set("keyOutputs", [...d.keyOutputs, { label: "", value: "" }])}>
              + add output
            </button>
          </details>

          <details open={Boolean(d.model || file)} className="form-section">
            <summary>
              4. Excel model <span className="badge">optional</span>
            </summary>
            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) {
                  setFile(f);
                  setDirty(true);
                }
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xlsm,.xls,.csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0]);
                  setDirty(true);
                }}
              />
              <span>Drop an .xlsx here or <u>choose a file</u> (up to 4 MB)</span>
            </label>
            {file ? (
              <p className="field-note">
                📎 {file.name} · {(file.size / 1024).toFixed(0)} KB {err("model")}
                <button type="button" className="link-button" onClick={() => setFile(undefined)}>remove</button>
              </p>
            ) : (
              d.model && (
                <p className="field-note">
                  Current model: <a href={d.model}>{d.model}</a>{" "}
                  <button type="button" className="link-button" onClick={() => set("model", "")}>remove link</button>
                </p>
              )
            )}
          </details>

          <details open className="form-section">
            <summary>5. The write-up</summary>
            <RichEditor
              markdown={initialBody}
              onChange={(md, h, first) => {
                setBody(md);
                setHtml(h);
                if (!first) {
                  setDirty(true);
                  setResult(undefined);
                }
              }}
            />
          </details>
        </div>

        <aside className="report-preview" aria-label="Preview">
          <div className="preview-label pixel">Preview</div>
          <header className="preview-head">
            <h2>
              {ticker || "TICKER"}
              {d.name && <span> · {d.name}</span>}
            </h2>
            <p className="sub">
              {d.assetClass} · {d.method || "method"} · {d.status === "published" ? "Published" : "Analysis in progress"}
            </p>
            {author && (
              <p className="byline center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pixel-img" src={author.avatar} alt="" width={20} height={20} /> by {author.name}
              </p>
            )}
            {d.status === "published" && fv > 0 && (
              <div className="preview-kv">
                <div><span>Fair value</span><b>{money(fv)}</b></div>
                {price && <div><span>Price</span><b>{money(price)}</b></div>}
                {upside !== undefined && (
                  <div><span>Upside</span><b className={upside >= 0 ? "gain" : "loss"}>{pct(upside)}</b></div>
                )}
              </div>
            )}
            {d.thesis && <p className="preview-thesis">&ldquo;{d.thesis}&rdquo;</p>}
            {d.keyOutputs.some((o) => o.label) && (
              <div className="preview-kv">
                {d.keyOutputs.filter((o) => o.label).map((o, i) => (
                  <div key={i}><span>{o.label}</span><b>{o.value}</b></div>
                ))}
              </div>
            )}
          </header>
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          {d.sellTrigger && (
            <div className="callout">
              <span className="pixel">Sell trigger</span>
              {d.sellTrigger}
            </div>
          )}
          {(file || d.model) && <p className="preview-model">📊 Download the model</p>}
        </aside>
      </div>

      {result && !result.ok && (
        <div className="admin-error" role="alert">
          {result.error}
          {fieldErrors.form && <div>{fieldErrors.form}</div>}
          {result.dryRun?.map((f) => (
            <details key={f.path} open>
              <summary><code>{f.path}</code></summary>
              <pre>{f.text}</pre>
            </details>
          ))}
        </div>
      )}
      {result?.ok && (
        <div className="admin-success" role="status">
          <b>✓ {result.pr.draft ? "Draft saved" : "Sent for review"}:</b>{" "}
          <a href={result.pr.url} target="_blank" rel="noreferrer">pull request #{result.pr.number}</a>.{" "}
          {result.pr.draft
            ? "The team can read it there. Submit when it's ready for the owner."
            : "Vercel posts a preview link on it in a couple of minutes; the owner publishes it once the checks pass."}{" "}
          <Link href="/admin">Back to admin</Link>
        </div>
      )}

      <div className="form-actions">
        <span className={ready ? "field-ok" : "field-note"}>
          {ready ? "✓ All required fields done" : `${blocking.length} field${blocking.length === 1 ? "" : "s"} to fix`}
        </span>
        <button type="button" className="button secondary" disabled={pending || !ready} onClick={() => save("draft")}>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className="button" disabled={pending || !ready || (pr && !pr.draft && !dirty && !file)} onClick={() => save("submit")}>
          Submit for review →
        </button>
      </div>
    </main>
  );
}
