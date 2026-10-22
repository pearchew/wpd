import type { View } from "@/lib/schemas";
import type { Verdict } from "@/lib/verdict";

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return verdict === "Unvoted" ? <span className="muted">·</span> : <span className={`verdict ${verdict}`}>{verdict}</span>;
}

/** The author's view, coloured like the vote it leans towards (Long ~ Include, Short ~ Reject). */
const TONE: Record<View, string> = { Long: "Include", Short: "Reject", Neutral: "Unvoted", Watch: "Watch" };

export function ViewPill({ view }: { view?: View }) {
  return view ? <span className={`verdict ${TONE[view]}`}>{view}</span> : <span className="muted">·</span>;
}
