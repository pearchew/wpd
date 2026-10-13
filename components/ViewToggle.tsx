import Link from "next/link";
import type { View } from "@/lib/fund";

const OPTIONS: { view: View; label: string; href: string }[] = [
  { view: "combined", label: "Combined", href: "/?view=combined" },
  { view: "real", label: "Real", href: "/" },
  { view: "paper", label: "Paper only", href: "/?view=paper" },
];

export function ViewToggle({ view }: { view: View }) {
  return (
    <nav className="view-toggle" aria-label="Portfolio view">
      {OPTIONS.map((o) => (
        <Link key={o.view} href={o.href} aria-current={o.view === view ? "true" : undefined} scroll={false}>
          {o.view === view ? "● " : ""}
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
