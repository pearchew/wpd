import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · WDP Fund" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <div className="admin">
      {s && (
        <div className="admin-bar">
          <Link href="/admin">Admin</Link>
          <span className="admin-bar-user">
            Signed in as {s.name} ({s.initials})
            {s.id !== 0 && (
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="link-button">Sign out</button>
              </form>
            )}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
