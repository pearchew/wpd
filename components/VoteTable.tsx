import Link from "next/link";
import { Face } from "./Face";
import { fmtDate } from "@/lib/dates";
import type { Vote } from "@/lib/schemas";
import { displayTicker } from "@/lib/team";

export function VoteTable({ votes, showTicker = false, empty = "No votes recorded yet." }: { votes: Vote[]; showTicker?: boolean; empty?: string }) {
  if (votes.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="left">Date</th>
            {showTicker && <th>Asset</th>}
            <th>Voter</th>
            <th>Vote</th>
            <th>Conviction</th>
            <th className="left">Note</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((v, i) => (
            <tr key={`${v.date}-${v.ticker}-${v.voter}-${i}`}>
              <td className="left">{fmtDate(v.date, true)}</td>
              {showTicker && (
                <td><Link className="cell-link" href={`/research/${v.ticker.toLowerCase()}`}>{displayTicker(v.ticker)}</Link></td>
              )}
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Face initials={v.voter} size={20} /> {v.voter}
                </span>
              </td>
              <td><span className={`verdict ${v.vote}`}>{v.vote}</span></td>
              <td>{v.conviction}</td>
              <td className="left muted" style={{ whiteSpace: "normal" }}>{v.note || "·"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
