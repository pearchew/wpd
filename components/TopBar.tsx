import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
