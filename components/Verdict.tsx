import type { Conclusion } from "@/lib/schemas";
import type { Verdict } from "@/lib/verdict";

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return verdict === "Unvoted" ? <span className="muted">·</span> : <span className={`verdict ${verdict}`}>{verdict}</span>;
}

/** The author's own call, coloured like the committee verdict it would feed (Buy ~ Include, Avoid ~ Reject). */
const TONE: Record<Conclusion, string> = { Buy: "Include", Watch: "Watch", Avoid: "Reject" };

export function ConclusionPill({ conclusion }: { conclusion?: Conclusion }) {
  return conclusion ? <span className={`verdict ${TONE[conclusion]}`}>{conclusion}</span> : <span className="muted">·</span>;
}
