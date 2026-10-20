import { redirect } from "next/navigation";
import { oauthConfigured } from "@/lib/admin/config";
import { getSession } from "@/lib/admin/session";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "not-allowed": "That GitHub account isn't on the team list. Ask the owner to add it to ADMIN_USERS.",
  state: "The sign-in link expired. Try again.",
  github: "GitHub didn't confirm the sign-in. Try again.",
  setup: "Sign-in isn't set up on this deployment yet.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/admin");
  const { error } = await searchParams;
  const ready = oauthConfigured();
  return (
    <main className="page">
      <section className="hero">
        <h1>Team sign-in</h1>
        <p className="tagline">For the three of us: write research and propose changes without editing files.</p>
        {error && <p className="admin-error">{ERRORS[error] ?? "Sign-in failed."}</p>}
        {ready ? (
          <a className="button" href="/api/auth/github">Sign in with GitHub</a>
        ) : (
          <p className="empty">
            The owner needs to set <code>GITHUB_OAUTH_CLIENT_ID</code>, <code>GITHUB_OAUTH_CLIENT_SECRET</code>,{" "}
            <code>ADMIN_SESSION_SECRET</code> and <code>ADMIN_USERS</code>. See the README, &ldquo;Team admin&rdquo;.
          </p>
        )}
      </section>
    </main>
  );
}
