import Link from "next/link";
import { Byline, Face } from "./Face";
import { Crown, Skull } from "./Pixel";
import { Sparkline } from "./Sparkline";
import type { FundData, HoldingRow, View } from "@/lib/fund";
import { rankedRows } from "@/lib/fund";
import { signedMoney, signedPct, tone } from "@/lib/format";
import { displayTicker } from "@/lib/team";

function Tile({ row, rank, badge, side, view }: { row: HoldingRow; rank: number; badge?: "crown" | "skull"; side: "win" | "lose" | "single"; view: View }) {
  const published = row.research?.status === "published";
  const t = tone(row.returnPct);
  const body = (
    <>
      <div className="wl-top">
        <span className="wl-ticker">
          {badge === "crown" && <Crown />}
          {badge === "skull" && <Skull />}
          <span className="pixel">{displayTicker(row.ticker)}</span>
        </span>
        <span className="rank-badge">#{rank}</span>
      </div>
      <div className="wl-class">{row.assetClass}{row.book === "paper" ? " · paper" : ""}</div>
      <div className="wl-return">
        <span className={t}>{signedPct(row.returnPct)}</span>
        <small className={t}>{signedMoney(row.pnl)}</small>
      </div>
      <Sparkline values={row.spark} />
      <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 20 }}>
        {row.research && <Face initials={row.research.author} size={20} />}
      </div>
    </>
  );
  const cls = `wl-tile ${side === "single" ? (row.returnPct >= 0 ? "win" : "lose") : side}`;
  return published ? (
    <Link href={`/research/${row.ticker.toLowerCase()}`} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function WinnersLosers({ d, view }: { d: FundData; view: View }) {
  const rows = rankedRows(d, view);
  if (rows.length === 0) return <p className="empty">No positions in this view yet.</p>;

  // Fewer than 6 positions: one ranked row instead of top 3 / bottom 3.
  if (rows.length < 6) {
    return (
      <div className="wl-grid single">
        {rows.map((r, i) => (
          <Tile
            key={r.ticker}
            row={r}
            rank={i + 1}
            side="single"
            view={view}
            badge={i === 0 && r.returnPct > 0 ? "crown" : i === rows.length - 1 && rows.length > 1 && r.returnPct < 0 ? "skull" : undefined}
          />
        ))}
      </div>
    );
  }
  const winners = rows.slice(0, 3);
  const losers = rows.slice(-3).reverse(); // worst first
  return (
    <div className="stack">
      <div className="wl-grid">
        {winners.map((r, i) => (
          <Tile key={r.ticker} row={r} rank={i + 1} side="win" view={view} badge={i === 0 && r.returnPct > 0 ? "crown" : undefined} />
        ))}
      </div>
      <div className="wl-grid">
        {losers.map((r, i) => (
          <Tile key={r.ticker} row={r} rank={rows.length - i} side="lose" view={view} badge={i === 0 && r.returnPct < 0 ? "skull" : undefined} />
        ))}
      </div>
    </div>
  );
}

export { Byline };
