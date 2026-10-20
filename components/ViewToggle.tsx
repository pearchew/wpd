import Link from "next/link";
import type { View } from "@/lib/fund";

const OPTIONS: { view: View; label: string; query: string }[] = [
  { view: "combined", label: "Combined", query: "?view=combined" },
  { view: "real", label: "Real", query: "" },
  { view: "paper", label: "Paper only", query: "?view=paper" },
];

export function ViewToggle({ view, base = "/" }: { view: View; base?: string }) {
  return (
    <nav className="view-toggle" aria-label="Portfolio view">
      {OPTIONS.map((o) => (
        <Link key={o.view} href={`${base}${o.query}`} aria-current={o.view === view ? "true" : undefined} scroll={false}>
          {o.view === view ? "● " : ""}
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
