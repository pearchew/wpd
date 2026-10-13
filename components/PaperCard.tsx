import { Byline } from "./Face";
import { fmtDate } from "@/lib/dates";
import type { PaperRow } from "@/lib/fund";
import { money, pct, signedMoney, signedNum, signedPct, tone } from "@/lib/format";
import { displayTicker } from "@/lib/team";

const KV = ({ k, v, cls }: { k: string; v: React.ReactNode; cls?: string }) => (
  <div>
    <span>{k}</span>
    <b className={cls}>{v}</b>
  </div>
);

export function PaperCard({ p }: { p: PaperRow }) {
  const isFuture = p.kind === "future";
  return (
    <article className="paper-card">
      <div className="paper-card-head">
        <div>
          <h3>
            {displayTicker(p.ticker)} <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>· {p.name}</span>
          </h3>
          <span className="pixel" style={{ color: "var(--amber)" }}>Paper · not real capital</span>
        </div>
        {p.research && <Byline initials={p.research.author} />}
      </div>

      <div className="kv">
        <KV k="Entry" v={money(p.entry)} />
        <KV k="Mark" v={money(p.price)} />
        <KV k="P&L" v={signedMoney(p.pnl, 0)} cls={tone(p.pnl)} />
        <KV k={isFuture ? "Return on margin" : "Return on premium"} v={signedPct(p.returnOnMargin)} cls={tone(p.returnOnMargin)} />
        <KV k="Notional" v={money(p.notional, 0)} />
        <KV k={isFuture ? "Initial margin" : "Premium paid"} v={money(p.margin, 0)} />
        <KV k="Leverage" v={`${p.leverage.toFixed(1)}×`} />
        {p.expiry && <KV k="Expiry" v={fmtDate(p.expiry, true)} />}
      </div>

      {isFuture && (
        <>
          <div className="kv">
            <KV k="Basis (F − S)" v={p.basis !== undefined ? signedMoney(p.basis) : "—"} />
            <KV
              k="Roll yield"
              v={p.rollYieldAnnual !== undefined ? `${signedPct(p.rollYieldAnnual)} / yr (${p.structure})` : "—"}
              cls={p.rollYieldAnnual !== undefined ? tone(p.rollYieldAnnual) : undefined}
            />
            <KV k="Margin-call days" v={p.callDays.length} cls={p.callDays.length ? "loss" : undefined} />
          </div>
          {p.callDays.length > 0 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Would have triggered a margin call on: {p.callDays.slice(-8).map((x) => fmtDate(x)).join(", ")}
              {p.callDays.length > 8 ? ` (latest of ${p.callDays.length})` : ""}
            </p>
          )}
        </>
      )}

      {!isFuture && (
        <>
          <div className="kv">
            <KV k="Strike" v={p.strike !== undefined ? money(p.strike) : "—"} />
            <KV k="Model price (BS)" v={p.modelPrice !== undefined ? money(p.modelPrice) : "—"} />
            <KV k="Market price" v={money(p.price)} />
            <KV k="Implied vol" v={p.impliedVol !== undefined && !Number.isNaN(p.impliedVol) ? pct(p.impliedVol) : "—"} />
          </div>
          {p.attribution && (
            <div>
              <div className="tile-label" style={{ marginBottom: 6 }}>Today&apos;s move, split into Greeks (per position)</div>
              <div className="kv">
                <KV k="Total" v={signedMoney(p.attribution.total, 0)} cls={tone(p.attribution.total)} />
                <KV k="Delta" v={signedMoney(p.attribution.delta, 0)} cls={tone(p.attribution.delta)} />
                <KV k="Theta" v={signedMoney(p.attribution.theta, 0)} cls={tone(p.attribution.theta)} />
                <KV k="Vega" v={signedMoney(p.attribution.vega, 0)} cls={tone(p.attribution.vega)} />
                <KV k="Other" v={signedMoney(p.attribution.other, 0)} cls={tone(p.attribution.other)} />
              </div>
            </div>
          )}
        </>
      )}
      {p.slice !== undefined && (
        <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
          Combined view: scaled to a ${p.slice} slice of the fund ({signedMoney(p.scaledPnl)} so far; {signedNum(p.returnPct * 100, 1, "%")} move).
        </p>
      )}
    </article>
  );
}
