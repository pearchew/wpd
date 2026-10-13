import { fmtDate } from "@/lib/dates";
import type { FundData, View } from "@/lib/fund";
import { money, signedMoney, signedNum, signedPct, tone } from "@/lib/format";

interface Tile {
  label: string;
  value: string;
  sub?: string;
  tone?: "gain" | "loss" | "flat";
}

export function viewLabel(d: FundData, view: View): string {
  const invested = d.tl.flows.reduce((s, f) => s + f, 0);
  if (view === "paper") return "Paper trades, no real capital";
  if (view === "combined") return "Includes paper derivatives, scaled to position size";
  return `Real capital, ${money(invested, 0)} invested`;
}

function tiles(d: FundData, view: View): Tile[] {
  if (view === "paper") {
    const p = d.tl.paper;
    const n = p.pnl.length - 1;
    const pnl = p.pnl[n];
    const margin = p.base[n];
    const peak = Math.max(0, ...p.notional.map((nt, i) => (p.equity[i] > 0 ? nt / p.equity[i] : 0)));
    return [
      { label: "Paper P&L", value: signedMoney(pnl, 0), tone: tone(pnl), sub: "no real capital" },
      { label: "Return on margin", value: signedPct(margin ? pnl / margin : 0), tone: tone(pnl), sub: `on ${money(margin, 0)} posted` },
      { label: "Peak leverage", value: `${peak.toFixed(1)}×`, sub: "notional ÷ equity" },
      { label: "Margin-call days", value: String(p.anyCallDays.length), sub: "would have triggered a call" },
    ];
  }
  const combined = view === "combined";
  const ret = combined ? d.combinedReturn : d.fundReturn;
  const gap = (ret - d.spyReturn) * 100;
  return [
    { label: combined ? "NAV, real + overlay" : "NAV", value: money(combined ? d.navCombined : d.nav) },
    { label: "Since inception", value: signedPct(ret, 2), tone: tone(ret) },
    { label: "SPY", value: signedPct(d.spyReturn, 2), tone: tone(d.spyReturn) },
    { label: "Gap vs SPY", value: `${gap >= 0 ? "▲" : "▼"} ${signedNum(gap, 2)} pts`, tone: tone(gap) },
  ];
}

export function HeroTiles({ d, view }: { d: FundData; view: View }) {
  return (
    <>
      <div className="tiles">
        {tiles(d, view).map((t) => (
          <div className="tile" key={t.label}>
            <div className="tile-label">{t.label}</div>
            <div className={`tile-value ${t.tone ?? ""}`}>{t.value}</div>
            {t.sub && <div className="tile-sub">{t.sub}</div>}
          </div>
        ))}
      </div>
      <p className="stamp">
        As of {fmtDate(d.asOf, true)}, US close
        {view !== "paper" && <> · Reconciled with broker: {fmtDate(d.meta.lastReconciled, true)}</>}
      </p>
    </>
  );
}
