import Link from "next/link";
import { Face } from "./Face";
import { VerdictPill, ViewPill } from "./Verdict";
import { hasActiveResearch, type FundData, type HoldingRow, type PaperRow, type View } from "@/lib/fund";
import { money, signedMoney, signedPct, tone, pct } from "@/lib/format";
import { displayTicker } from "@/lib/team";

function TickerCell({ row }: { row: HoldingRow }) {
  const published = row.research?.status === "published";
  return published ? (
    <Link className="cell-link" href={`/research/${row.ticker.toLowerCase()}`}>{displayTicker(row.ticker)}</Link>
  ) : (
    <b>{displayTicker(row.ticker)}</b>
  );
}

/** The author's view and the strategy being tested. */
function CallCell({ row }: { row: HoldingRow }) {
  if (row.research?.status === "in-progress") return <span className="in-progress-chip">Analysis in progress</span>;
  if (!row.research?.view) return <span className="muted">—</span>;
  return (
    <span>
      <ViewPill view={row.research.view} /> {row.research.strategy && <span className="muted">{row.research.strategy}</span>}
    </span>
  );
}

function ByCell({ row }: { row: HoldingRow }) {
  return row.research ? (
    <span style={{ display: "inline-flex", justifyContent: "center" }}>
      <Face initials={row.research.author} size={22} />
    </span>
  ) : (
    <span className="muted">·</span>
  );
}

function RealRows({ rows }: { rows: HoldingRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.ticker} className={r.research?.status === "published" ? "link-row" : undefined}>
          <td className="left"><TickerCell row={r} /></td>
          <td>{r.assetClass}</td>
          <td>{pct(r.weight)}</td>
          <td>{money(r.value)}</td>
          <td className={tone(r.returnPct)}>{signedPct(r.returnPct)}</td>
          <td><ByCell row={r} /></td>
          <td>{r.research ? <VerdictPill verdict={r.verdict} /> : <span className="muted">·</span>}</td>
          <td><CallCell row={r} /></td>
        </tr>
      ))}
    </>
  );
}

export function HoldingsTable({ d, view }: { d: FundData; view: View }) {
  if (view === "paper") return <PaperTable rows={d.paper} />;

  const rows: HoldingRow[] =
    view === "combined"
      ? [
          ...d.real,
          ...d.paper.map((p) => ({
            ...p,
            value: (p.slice ?? 0) + p.scaledPnl,
            weight: (p.slice ?? 0) / d.nav,
            pnl: p.scaledPnl,
          })),
        ]
      : d.real;
  // Only positions with published research are listed; the rest are rolled into one line so the total still adds up.
  const shown = rows.filter(hasActiveResearch);
  const hidden = rows.filter((r) => !hasActiveResearch(r));
  const total = view === "combined" ? d.navCombined : d.nav;
  const ret = view === "combined" ? d.combinedReturn : d.fundReturn;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="left">Ticker</th>
            <th>Class</th>
            <th>{view === "combined" ? "Weight / slice" : "Weight"}</th>
            <th>Value</th>
            <th>Return</th>
            <th>By</th>
            <th>Verdict</th>
            <th>View / strategy</th>
          </tr>
        </thead>
        <tbody>
          <RealRows rows={shown} />
          {hidden.length > 0 && (
            <tr>
              <td className="left muted" colSpan={2}>Other, no published research ({hidden.map((h) => h.ticker).join(", ")})</td>
              <td className="muted">{pct(hidden.reduce((s, h) => s + h.weight, 0))}</td>
              <td className="muted">{money(hidden.reduce((s, h) => s + h.value, 0))}</td>
              <td colSpan={4} />
            </tr>
          )}
          {d.cash > 0.005 && (
            <tr>
              <td className="left muted">Cash</td>
              <td className="muted">·</td>
              <td>{pct(d.cash / d.nav)}</td>
              <td>{money(d.cash)}</td>
              <td colSpan={4} />
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="left">Total</td>
            <td />
            <td>{view === "combined" ? "" : "100.0%"}</td>
            <td>{money(total)}</td>
            <td className={tone(ret)}>{signedPct(ret)}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function greeksText(p: PaperRow): string {
  if (!p.greeks) return p.kind === "future" ? `Δ ${p.qty * p.multiplier} units` : "—";
  const size = p.qty * p.multiplier;
  return `Δ ${(p.greeks.delta * size).toFixed(0)} · Θ ${(p.greeks.theta * size).toFixed(1)}/d · V ${(p.greeks.vega * size).toFixed(0)}`;
}

function PaperTable({ rows }: { rows: PaperRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="left">Contract</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Entry</th>
            <th>Mark</th>
            <th>P&L</th>
            <th>Return on margin</th>
            <th>Notional</th>
            <th>Margin</th>
            <th>Greeks (per position)</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.ticker}>
              <td className="left"><TickerCell row={p} /></td>
              <td>{p.kind === "future" ? "Future" : `${p.optionType ?? "put"} option`}</td>
              <td>{p.qty}</td>
              <td>{money(p.entry)}</td>
              <td>{money(p.price)}</td>
              <td className={tone(p.pnl)}>{signedMoney(p.pnl, 0)}</td>
              <td className={tone(p.returnOnMargin)}>{signedPct(p.returnOnMargin)}</td>
              <td>{money(p.notional, 0)}</td>
              <td>{money(p.margin, 0)}</td>
              <td>{greeksText(p)}</td>
              <td><ByCell row={p} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
