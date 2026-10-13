import Link from "next/link";
import { Face } from "./Face";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { coverage, displayTicker, getTeam } from "@/lib/team";

export function TopBar() {
  const people = getTeam();
  const covered = coverage();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="wordmark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/icon.svg" alt="" width={26} height={26} />
          WDP Fund
        </Link>
        <NavLinks />
        <div className="topbar-right">
          <div className="faces">
            {people.map((p) => (
              <Link
                key={p.initials}
                href={`/research?author=${p.initials}`}
                className="face-link"
                aria-label={`${p.name}: research`}
              >
                <Face initials={p.initials} size={32} />
                <span className="face-tip">
                  <strong>{p.name}</strong>
                  {(covered[p.initials] ?? []).map(displayTicker).join(" · ") || "No research yet"}
                </span>
              </Link>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
