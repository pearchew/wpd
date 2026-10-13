import type { Verdict } from "@/lib/verdict";

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return verdict === "Unvoted" ? <span className="muted">·</span> : <span className={`verdict ${verdict}`}>{verdict}</span>;
}
