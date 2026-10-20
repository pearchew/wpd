"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { type TradeSaveResult, saveTrades } from "@/app/admin/trades/actions";
import {
  ACTIONS,
  ACTION_LABEL,
  CASH_ACTIONS,
  type TradeInput,
  cashEffect,
  emptyTrade,
  sharesFor,
  toTrade,
  tradeProblems,
} from "@/lib/admin/trades";
import { fmtDate } from "@/lib/dates";
import { money, signedMoney } from "@/lib/format";
import type { Instrument, Trade } from "@/lib/schemas";
import { checkLedger } from "@/lib/tradeChecks";

interface Props {
  today: string;
  /** trades.csv as the new rows will find it (main, or the open trade change's branch) */
  trades: Trade[];
  /** Rows already waiting in the open trade change */
  pending: Trade[];
  instruments: Instrument[];
  prices: Record<string, number>;
  maxWeight: number;
  openPr?: { number: number; url: string };
  connected: boolean;
}

const HINT: Record<TradeInput["action"], string> = {
  buy: "Use the shares and price from the broker's confirmation.",
  sell: "Use the shares and price from the broker's confirmation.",
  deposit: "Money paid into the brokerage account.",
  withdrawal: "Money taken out of the brokerage account.",
  fee: "A charge not tied to a trade, e.g. an FX or account fee.",
  dividend: "The cash actually received, after any withholding.",
  split: "The ratio: 2 for a 2-for-1 split, 0.1 for a 1-for-10 reverse split.",
};

function Holdings({ before, after }: { before: ReturnType<typeof checkLedger>; after: ReturnType<typeof checkLedger> }) {
  const tickers = [...new Set([...Object.keys(before.held), ...Object.keys(after.held)])].sort();
  const invested = Object.values(after.cost).reduce((s, c) => s + c, 0) + Math.max(after.cash, 0);
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th className="left">Holding</th><th>Shares now</th><th>After</th><th>Weight at cost</th></tr>
        </thead>
        <tbody>
          {tickers.map((t) => {
            const changed = (before.held[t] ?? 0) !== (after.held[t] ?? 0);
            return (
              <tr key={t} className={changed ? "changed" : ""}>
                <td className="left"><b>{t}</b></td>
                <td>{(before.held[t] ?? 0).toFixed(4)}</td>
                <td>{after.held[t] ? after.held[t].toFixed(4) : "sold"}</td>
                <td>{after.cost[t] && invested > 0 ? `${((after.cost[t] / invested) * 100).toFixed(1)}%` : "·"}</td>
              </tr>
            );
          })}
          <tr className={before.cash !== after.cash ? "changed" : ""}>
            <td className="left">Cash</td>
            <td>{money(before.cash)}</td>
            <td className={after.cash < -0.005 ? "loss" : ""}>{money(after.cash)}</td>
            <td>{invested > 0 ? `${((Math.max(after.cash, 0) / invested) * 100).toFixed(1)}%` : "·"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function TradeForm({ today, trades, pending, instruments, prices, maxWeight, openPr, connected }: Props) {
  const router = useRouter();
  const [t, setT] = useState<TradeInput>(emptyTrade(today));
  const [list, setList] = useState<TradeInput[]>([]);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<TradeSaveResult | undefined>();
  const [saving, start] = useTransition();

  // Real-book trades only: futures and options stay paper trades, recorded by hand for now.
  const tradeable = useMemo(() => instruments.filter((i) => i.kind === "stock" || i.kind === "etf"), [instruments]);
  const known = useMemo(() => new Set(tradeable.map((i) => i.ticker)), [tradeable]);
  const before = useMemo(() => checkLedger(trades, instruments, { maxPositionWeight: maxWeight }), [trades, instruments, maxWeight]);
  const listed = useMemo(() => list.map((x) => toTrade(x, instruments)), [list, instruments]);
  const after = useMemo(
    () =>
      checkLedger([...trades, ...listed], instruments, { maxPositionWeight: maxWeight }, (i) =>
        i < trades.length ? `trades.csv row ${i + 2}` : `Trade ${i - trades.length + 1}`,
      ),
    [trades, listed, instruments, maxWeight],
  );
  // Rows already in trades.csv can't be fixed here; only flag what the new rows cause.
  const newErrors = after.errors.filter((e) => !before.errors.includes(e));

  const priced = useMemo(() => new Set(Object.keys(prices)), [prices]);
  const problems = tradeProblems(t, today, known, priced);
  const isCash = CASH_ACTIONS.includes(t.action);
  const ticker = t.ticker.trim().toUpperCase();
  const inst = tradeable.find((i) => i.ticker === ticker);
  const held = after.held[ticker] ?? 0;
  const price = prices[ticker];
  const shares = sharesFor(t);
  const effect = cashEffect(t);

  const set = <K extends keyof TradeInput>(k: K, v: TradeInput[K]) => {
    setT((prev) => ({ ...prev, [k]: v }));
    setResult(undefined);
  };
  const pickTicker = (v: string) => {
    const up = v.toUpperCase();
    setT((prev) => ({ ...prev, ticker: up, price: prev.price || (prices[up] ? prices[up].toFixed(2) : "") }));
    setResult(undefined);
  };
  const err = (k: keyof TradeInput) => touched && problems[k] && <span className="field-error">{problems[k]}</span>;

  const add = () => {
    setTouched(true);
    if (Object.keys(problems).length) return;
    setList((l) => [...l, t]);
    setT({ ...emptyTrade(t.date), action: t.action });
    setTouched(false);
  };
  const submit = () =>
    start(async () => {
      const r = await saveTrades(list, openPr?.number);
      setResult(r);
      if (r.ok) {
        setList([]);
        router.refresh();
      }
    });

  const tickerOptions =
    t.action === "sell" || t.action === "split" || t.action === "dividend"
      ? tradeable.filter((i) => (before.held[i.ticker] ?? 0) > 0 || (after.held[i.ticker] ?? 0) > 0)
      : tradeable;

  return (
    <main className="page admin-form-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/admin">Admin</Link> › Record trades
      </nav>
      <section className="hero" style={{ padding: "16px 0 8px" }}>
        <h1>Record trades</h1>
        <p className="tagline">One row per broker fill. A rebalance is sells plus buys: add them all, then submit once.</p>
      </section>

      {!connected && (
        <p className="admin-notice">GitHub isn&apos;t connected here, so submitting shows the file instead of opening a pull request.</p>
      )}
      {openPr && (
        <p className="admin-notice">
          {pending.length} trade{pending.length === 1 ? " is" : "s are"} already waiting in{" "}
          <a href={openPr.url} target="_blank" rel="noreferrer">pull request #{openPr.number}</a>. New trades are added to it, and
          the checks below include them.
        </p>
      )}

      <div className="trade-layout">
        <section className="form-section trade-editor" aria-label="New trade">
          <div className="field-grid">
            <label>
              Date
              <input type="date" value={t.date} max={today} onChange={(e) => set("date", e.target.value)} />
              {err("date")}
            </label>
            <label>
              Action
              <select value={t.action} onChange={(e) => set("action", e.target.value as TradeInput["action"])}>
                {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
              </select>
            </label>
          </div>
          <p className="field-note">{HINT[t.action]}</p>

          {!isCash && (
            <label>
              Asset
              <select value={ticker} onChange={(e) => pickTicker(e.target.value)}>
                <option value="">Choose…</option>
                {tickerOptions.map((i) => (
                  <option key={i.ticker} value={i.ticker}>
                    {i.ticker} · {i.name}
                  </option>
                ))}
              </select>
              {err("ticker") ||
                (inst && (
                  <span className="field-note">
                    {held > 0 ? `Holding ${held.toFixed(4)} shares` : "Not held yet"}
                    {price ? ` · latest close ${money(price)}` : ""}
                  </span>
                ))}
              {t.action === "buy" && (
                <span className="field-note">
                  Not listed? <Link href="/admin/assets">Add the asset</Link> first.
                </span>
              )}
            </label>
          )}

          {(t.action === "buy" || t.action === "sell") && (
            <>
              <div className="radio-row" role="radiogroup" aria-label="Size by">
                <label className="check">
                  <input type="radio" checked={t.sizeBy === "shares"} onChange={() => set("sizeBy", "shares")} /> Shares
                </label>
                <label className="check">
                  <input type="radio" checked={t.sizeBy === "dollars"} onChange={() => set("sizeBy", "dollars")} /> Dollar amount
                </label>
              </div>
              <div className="field-grid three">
                {t.sizeBy === "shares" ? (
                  <label>
                    Shares
                    <input inputMode="decimal" value={t.shares} onChange={(e) => set("shares", e.target.value)} placeholder="0.1234" />
                    {err("shares") ||
                      (t.action === "sell" && held > 0 && (
                        <button type="button" className="link-button field-note" onClick={() => set("shares", String(held))}>
                          Sell all {held.toFixed(4)}
                        </button>
                      ))}
                  </label>
                ) : (
                  <label>
                    Amount ($)
                    <input inputMode="decimal" value={t.amount} onChange={(e) => set("amount", e.target.value)} placeholder="20.00" />
                    {err("amount") || (shares ? <span className="field-note">= {shares.toFixed(4)} shares</span> : null)}
                  </label>
                )}
                <label>
                  Price per share
                  <input inputMode="decimal" value={t.price} onChange={(e) => set("price", e.target.value)} placeholder="160.25" />
                  {err("price") || (price && t.price === price.toFixed(2) && <span className="field-note">Prefilled from the latest close: use the fill price</span>)}
                </label>
                <label>
                  Fees
                  <input inputMode="decimal" value={t.fees} onChange={(e) => set("fees", e.target.value)} placeholder="0" />
                  {err("fees")}
                </label>
              </div>
            </>
          )}

          {(isCash || t.action === "dividend") && (
            <label>
              Amount ($)
              <input inputMode="decimal" value={t.amount} onChange={(e) => set("amount", e.target.value)} placeholder="50.00" />
              {err("amount")}
            </label>
          )}

          {t.action === "split" && (
            <label>
              Ratio
              <input inputMode="decimal" value={t.shares} onChange={(e) => set("shares", e.target.value)} placeholder="2" />
              {err("shares") ||
                (Number(t.shares) > 0 && held > 0 && (
                  <span className="field-note">{held.toFixed(4)} shares become {(held * Number(t.shares)).toFixed(4)}</span>
                ))}
            </label>
          )}

          <label>
            Note
            <input value={t.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. New position, trim to 10%" />
          </label>

          <div className="trade-add">
            <span className={effect < 0 ? "loss" : effect > 0 ? "gain" : "flat"}>
              {effect !== 0 ? `${signedMoney(effect)} cash` : t.action === "split" ? "No cash change" : ""}
            </span>
            <button type="button" className="button secondary" onClick={add}>+ Add to list</button>
          </div>
        </section>

        <section className="trade-review" aria-label="Review">
          <h2>Trades to submit</h2>
          {list.length === 0 ? (
            <p className="empty">Nothing added yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th className="left">Date</th><th>Action</th><th>Asset</th><th>Shares</th><th>Price</th><th>Cash</th><th /></tr>
                </thead>
                <tbody>
                  {list.map((x, i) => {
                    const row = listed[i];
                    return (
                      <tr key={i}>
                        <td className="left">{fmtDate(row.date)}</td>
                        <td>{ACTION_LABEL[row.action]}</td>
                        <td>{row.ticker}</td>
                        <td>{row.shares ?? ""}</td>
                        <td>{row.price !== undefined ? money(row.price) : ""}</td>
                        <td className={cashEffect(x) < 0 ? "loss" : "gain"}>{cashEffect(x) ? signedMoney(cashEffect(x)) : ""}</td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                              setT(x);
                              setList((l) => l.filter((_, j) => j !== i));
                            }}
                          >
                            Edit
                          </button>{" "}
                          <button type="button" className="icon-button" aria-label="Remove" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h3>After these trades</h3>
          <Holdings before={before} after={after} />
          {newErrors.length > 0 ? (
            <ul className="admin-error trade-errors">
              {newErrors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          ) : (
            list.length > 0 && <p className="field-ok">✓ Passes the ledger checks: cash stays positive, no oversells, 25% cap</p>
          )}

          {pending.length > 0 && (
            <details className="trade-pending">
              <summary>Already waiting in #{openPr?.number} ({pending.length})</summary>
              <ul>
                {pending.map((p, i) => (
                  <li key={i}>
                    {p.date} · {ACTION_LABEL[p.action as TradeInput["action"]] ?? p.action} {p.ticker}
                    {p.shares ? ` · ${p.shares} sh` : ""}
                    {p.price !== undefined ? ` · ${money(p.price)}` : ""}
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
          {result.problems && <ul>{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          {result.dryRun && (
            <details open>
              <summary><code>data/trades.csv</code></summary>
              <pre>{result.dryRun}</pre>
            </details>
          )}
        </div>
      )}
      {result?.ok && (
        <div className="admin-success" role="status">
          <b>✓ Sent for review:</b>{" "}
          <a href={result.pr.url} target="_blank" rel="noreferrer">pull request #{result.pr.number}</a>. The owner merges it once the
          checks pass, and the site replays the ledger with the new rows. <Link href="/admin">Back to admin</Link>
        </div>
      )}

      <div className="form-actions">
        <span className="field-note">
          {list.length} trade{list.length === 1 ? "" : "s"} · cash {money(before.cash)} → {money(after.cash)}
        </span>
        <button type="button" className="button" disabled={saving || list.length === 0 || newErrors.length > 0} onClick={submit}>
          {saving ? "Submitting…" : openPr ? `Add to #${openPr.number} →` : "Submit for review →"}
        </button>
      </div>
    </main>
  );
}
