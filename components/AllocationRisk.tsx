import { Donut } from "./Donut";
import type { Allocation, FundData, View } from "@/lib/fund";
import { money, pct, signedNum } from "@/lib/format";
import { displayTicker } from "@/lib/team";

function heatStyle(c: number): React.CSSProperties {
  const strength = Math.min(Math.abs(c), 1) * 100;
  const colour = c >= 0 ? "var(--accent)" : "var(--amber)";
  return { background: `color-mix(in srgb, ${colour} ${strength.toFixed(0)}%, transparent)` };
}

export function AllocationRisk({ d, a, view }: { d: FundData; a: Allocation; view: View }) {
  const n = a.corr.tickers.length;
  const centre = view === "paper" ? "Notional" : money(view === "combined" ? d.navCombined : d.nav);
  const sub = view === "paper" ? "exposure by contract" : view === "combined" ? "real + overlay" : "NAV";
  const maxBar = Math.max(0.01, ...a.assets.flatMap((x) => [Math.abs(x.weight), Math.abs(x.riskShare)]));

  if (a.assets.length === 0 && view !== "paper") {
    return (
      <div className="split">
        <Donut slices={a.slices.length ? a.slices : [{ label: "Cash", value: 1 }]} centre={centre} sub={sub} />
        <p className="empty">
          The fund is 100% cash. Weights, risk contribution, correlation and volatility appear once it owns something.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="split">
        <Donut slices={a.slices} centre={centre} sub={sub} />
        <div>
          <div className="bar-legend">
            <span><i className="legend-swatch" style={{ borderTopColor: "var(--accent)" }} />{view === "paper" ? "Notional share" : "Weight"}</span>
            <span><i className="legend-swatch" style={{ borderTopColor: "var(--ink)" }} />Risk contribution</span>
          </div>
          <div className="bars">
            {a.assets.map((x) => (
              <div className="bar-row" key={x.ticker}>
                <b>{displayTicker(x.ticker)}</b>
                <div className="bar-pair">
                  <div className="bar" style={{ width: `${(Math.abs(x.weight) / maxBar) * 100}%` }} />
                  <div className="bar risk" style={{ width: `${(Math.abs(x.riskShare) / maxBar) * 100}%` }} />
                </div>
                <span className="muted">{pct(x.weight, 0)} / {pct(x.riskShare, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heat-wrap">
        <h3 style={{ marginBottom: 12 }}>Correlation of daily returns</h3>
        <div
          className="heat"
          style={{ gridTemplateColumns: `repeat(${n + 1}, 44px)` }}
          role="table"
          aria-label="Correlation heatmap"
        >
          <div className="lbl" />
          {a.corr.tickers.map((t) => (
            <div className="lbl" key={`c-${t}`}>{displayTicker(t).slice(0, 5)}</div>
          ))}
          {a.corr.matrix.map((row, i) => (
            <Row key={a.corr.tickers[i]} label={displayTicker(a.corr.tickers[i]).slice(0, 5)} row={row} />
          ))}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="tile-label">Portfolio volatility</div>
          <div className="tile-value">{pct(a.portfolioVol)}</div>
          <div className="tile-sub">annualised</div>
        </div>
        {a.sharpe !== undefined && (
          <div className="stat">
            <div className="tile-label">Sharpe</div>
            <div className="tile-value">{a.sharpe.toFixed(2)}</div>
            <div className="tile-sub">SPY {a.spySharpe?.toFixed(2)}</div>
          </div>
        )}
        <div className="stat">
          <div className="tile-label">Diversification benefit</div>
          <div className="tile-value">{signedNum(-a.diversificationBenefit * 100, 1)} pts</div>
          <div className="tile-sub">{pct(a.portfolioVol)} vs {pct(a.weightedAvgVol)} weighted average</div>
        </div>
      </div>
      <p className="chart-note">{a.note} Computed from daily returns since launch.</p>
    </div>
  );
}

function Row({ label, row }: { label: string; row: number[] }) {
  return (
    <>
      <div className="lbl">{label}</div>
      {row.map((c, j) => (
        <div className="h" key={j} style={heatStyle(c)} title={c.toFixed(2)}>
          {c.toFixed(2).replace("0.", ".").replace("-.", "−.")}
        </div>
      ))}
    </>
  );
}
