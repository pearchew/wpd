"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { type SavePayload, type SaveResult, saveReport } from "@/app/admin/research/actions";
import type { FormContext } from "@/lib/admin/load";
import {
  MODEL_MAX_BYTES,
  type NewAsset,
  type ReportDraft,
  THESIS_HINT,
  emptyKeyNumber,
  problems,
  starterBody,
  usesMdxComponents,
} from "@/lib/admin/report";
import { ASSET_CLASSES, type AssetClass, CONVICTIONS, STRATEGY_FAMILIES, VIEWS } from "@/lib/schemas";
import { ViewPill } from "../Verdict";
import { RichEditor } from "./RichEditor";

interface Props {
  initial: ReportDraft;
  body: string;
  isNew: boolean;
  pr?: { number: number; url: string; draft: boolean };
  ctx: FormContext;
  connected: boolean;
}

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const KIND_LABEL: Record<string, string> = { stock: "Stock", etf: "ETF", future: "Future", option: "Option" };

export function ReportForm({ initial, body: initialBody, isNew, pr: initialPr, ctx, connected }: Props) {
  const router = useRouter();
  const [d, setD] = useState<ReportDraft>(initial);
  const [body, setBody] = useState(initialBody);
  // A new report's write-up follows the asset type until someone types in it.
  const [seed, setSeed] = useState(initialBody);
  const [seedKey, setSeedKey] = useState(0);
  const [pristine, setPristine] = useState(isNew);
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
  const currency = known?.currency ?? asset.currency ?? "USD";
  const kind = known?.kind ?? asset.kind;
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
  const setStrategy = (k: keyof ReportDraft["strategy"], v: string) => set("strategy", { ...d.strategy, [k]: v });
  const setNumber = (i: number, k: keyof ReportDraft["keyNumbers"][number], v: string) =>
    set("keyNumbers", d.keyNumbers.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const reseed = (k: string, cls: string) => {
    if (!pristine) return;
    setSeed(starterBody(k, cls));
    setSeedKey((n) => n + 1);
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
    if (a) reseed(a.kind, a.assetClass);
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
              1. The asset {sectionBadge(["ticker", "name", "assetClass"])}
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
                    (known ? <span className="field-ok">✓ known asset · {KIND_LABEL[known.kind] ?? known.kind}</span> : <span className="field-note">New to the site</span>))}
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
                <select
                  value={d.assetClass}
                  disabled={Boolean(known)}
                  onChange={(e) => {
                    set("assetClass", e.target.value as AssetClass);
                    reseed(kind, e.target.value);
                  }}
                >
                  {ASSET_CLASSES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {err("assetClass") || (known && <span className="field-note">From the asset list</span>)}
              </label>
              <label>
                Exchange
                <input value={d.exchange} onChange={(e) => set("exchange", e.target.value)} placeholder="NASDAQ, TSE, KRX, ASX, COMEX" />
                <span className="field-note">Optional</span>
              </label>
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
                    <select
                      value={asset.kind}
                      onChange={(e) => {
                        setAsset({ ...asset, kind: e.target.value as NewAsset["kind"] });
                        reseed(e.target.value, d.assetClass);
                      }}
                    >
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
                    <span className="field-note">Yahoo Finance&apos;s symbol; leave blank if it matches the ticker</span>
                  </label>
                </div>
              </fieldset>
            )}
            <p className="field-note">
              Author {author?.name ?? d.author} · updated {d.updated}
              {d.published ? ` · first published ${d.published}` : " · the publish date is set when it is first published"}
            </p>
          </details>

          <details open className="form-section">
            <summary>
              2. The call {sectionBadge(["status", "view", "thesis", "conviction", "keyNumbers", "family", "rule", "entry", "exit"])}
            </summary>
            <div className="radio-row" role="radiogroup" aria-label="Status">
              <label className="check">
                <input type="radio" checked={d.status === "in-progress"} onChange={() => set("status", "in-progress")} /> In progress
              </label>
              <label className="check">
                <input type="radio" checked={d.status === "published"} onChange={() => set("status", "published")} /> Published
              </label>
            </div>
            <fieldset className="choice-field">
              <legend>View</legend>
              <div className="radio-row wrap" role="radiogroup" aria-label="View">
                {VIEWS.map((v) => (
                  <label className="check" key={v}>
                    <input type="radio" checked={d.view === v} onChange={() => set("view", v)} /> {v}
                  </label>
                ))}
              </div>
              {err("view") || <span className="field-note">Your position from the research. Every view is published, neutral and watch too.</span>}
            </fieldset>
            <label>
              Thesis
              <textarea rows={2} value={d.thesis} onChange={(e) => set("thesis", e.target.value)} placeholder="One line: what you think will happen and why" />
              {err("thesis") || (
                <span className={`field-note${d.thesis.length > THESIS_HINT ? " loss" : ""}`}>
                  Shown on the site · {d.thesis.length} / {THESIS_HINT}
                </span>
              )}
            </label>
            <fieldset className="choice-field">
              <legend>Conviction</legend>
              <div className="radio-row" role="radiogroup" aria-label="Conviction">
                {CONVICTIONS.map((c) => (
                  <label className="check" key={c}>
                    <input type="radio" checked={d.conviction === c} onChange={() => set("conviction", c)} /> {c}
                  </label>
                ))}
              </div>
              {err("conviction")}
            </fieldset>

            <h4 className="form-subhead">Key numbers</h4>
            <p className="field-note">The three or four figures that matter most right now{price ? ` · latest close ${money(price, currency)}` : ""}.</p>
            {d.keyNumbers.map((k, i) => (
              <div className="number-row" key={i}>
                <input aria-label="Label" placeholder="Copper inventories" value={k.label} onChange={(e) => setNumber(i, "label", e.target.value)} />
                <input aria-label="Value" placeholder="152,000" value={k.value} onChange={(e) => setNumber(i, "value", e.target.value)} />
                <input aria-label="Unit" placeholder="tonnes" value={k.unit} onChange={(e) => setNumber(i, "unit", e.target.value)} />
                <input aria-label="As of" placeholder="YYYY-MM-DD" value={k.asOf} onChange={(e) => setNumber(i, "asOf", e.target.value)} />
                <input aria-label="Source" placeholder="LME" value={k.source} onChange={(e) => setNumber(i, "source", e.target.value)} />
                <button type="button" className="icon-button" aria-label="Remove number" onClick={() => set("keyNumbers", d.keyNumbers.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            {err("keyNumbers")}
            <button type="button" className="link-button" onClick={() => set("keyNumbers", [...d.keyNumbers, emptyKeyNumber(d.updated)])}>
              + add a number
            </button>

            <h4 className="form-subhead">Strategy</h4>
            <p className="field-note">The trading rule you&apos;re testing and where it comes from.</p>
            <div className="field-grid">
              <label>
                Family
                <select value={d.strategy.family} onChange={(e) => setStrategy("family", e.target.value)}>
                  <option value="">Choose…</option>
                  {STRATEGY_FAMILIES.map((f) => <option key={f}>{f}</option>)}
                </select>
                {err("family")}
              </label>
              <label>
                Holding period
                <input value={d.strategy.holding} onChange={(e) => setStrategy("holding", e.target.value)} placeholder="20 trading days" />
              </label>
            </div>
            <label>
              Rule
              <textarea rows={2} value={d.strategy.rule} onChange={(e) => setStrategy("rule", e.target.value)} placeholder="Buy after a positive earnings surprise and hold while the drift lasts" />
              {err("rule")}
            </label>
            <div className="field-grid">
              <label>
                Entry trigger
                <textarea rows={2} value={d.strategy.entry} onChange={(e) => setStrategy("entry", e.target.value)} placeholder="What has to happen before we trade" />
                {err("entry")}
              </label>
              <label>
                Exit rule
                <textarea rows={2} value={d.strategy.exit} onChange={(e) => setStrategy("exit", e.target.value)} placeholder="A price, a signal or a date" />
                {err("exit") || <span className="field-note">Written at entry: when it fires, we sell unless 2 of 3 vote to keep it</span>}
              </label>
            </div>
            <label>
              Source paper(s)
              <input value={d.strategy.papers} onChange={(e) => setStrategy("papers", e.target.value)} placeholder="Bernard & Thomas (1989), post-earnings drift" />
            </label>
          </details>

          <details open={Boolean(d.model || file)} className="form-section">
            <summary>
              3. Excel model <span className="badge">optional</span>
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
            <summary>4. The write-up</summary>
            {pristine && (
              <p className="field-note">
                Template for {kind === "future" ? "a future" : d.assetClass === "Commodities" ? "a commodity" : "a stock or ETF"}: fill in what you
                have and delete what doesn&apos;t apply.
              </p>
            )}
            <RichEditor
              key={seedKey}
              markdown={seed}
              onChange={(md, h, first) => {
                setBody(md);
                setHtml(h);
                if (!first) {
                  setDirty(true);
                  setPristine(false);
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
              {[d.exchange, d.assetClass, known ? KIND_LABEL[known.kind] : undefined].filter(Boolean).join(" · ")} ·{" "}
              {d.status === "published" ? "Published" : "Analysis in progress"}
            </p>
            {author && (
              <p className="byline center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pixel-img" src={author.avatar} alt="" width={20} height={20} /> by {author.name}
              </p>
            )}
            {(d.view || d.conviction) && (
              <p className="byline center">
                <ViewPill view={d.view || undefined} /> {d.conviction && `${d.conviction} conviction`}
              </p>
            )}
            {d.thesis && <p className="preview-thesis">&ldquo;{d.thesis}&rdquo;</p>}
            {d.keyNumbers.some((k) => k.label) && (
              <div className="preview-kv">
                {d.keyNumbers.filter((k) => k.label).map((k, i) => (
                  <div key={i}><span>{k.label}</span><b>{k.value}{k.unit && ` ${k.unit}`}</b></div>
                ))}
              </div>
            )}
          </header>
          {(d.strategy.family || d.strategy.rule) && (
            <div className="callout">
              <span className="pixel">Strategy{d.strategy.family && ` · ${d.strategy.family}`}</span>
              {d.strategy.rule}
              {d.strategy.exit && <div className="muted">Exit: {d.strategy.exit}</div>}
            </div>
          )}
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
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
