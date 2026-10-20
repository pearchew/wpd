import { NextResponse, type NextRequest } from "next/server";
import { adminUsers, env, oauthConfigured } from "@/lib/admin/config";
import { SESSION_COOKIE, encodeSession } from "@/lib/admin/session";

export async function GET(req: NextRequest) {
  const fail = (error: string) => {
    const res = NextResponse.redirect(new URL(`/admin/sign-in?error=${error}`, req.url));
    res.cookies.delete("wdp_oauth_state");
    return res;
  };
  if (!oauthConfigured()) return fail("setup");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("wdp_oauth_state")?.value) return fail("state");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("GITHUB_OAUTH_CLIENT_ID"),
      client_secret: env("GITHUB_OAUTH_CLIENT_SECRET"),
      code,
      redirect_uri: new URL("/api/auth/github/callback", req.url).toString(),
    }),
  });
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return fail("github");

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${access_token}`, Accept: "application/vnd.github+json" },
  });
  if (!userRes.ok) return fail("github");
  const user = (await userRes.json()) as { login: string; id: number; name: string | null };

  const allowed = adminUsers().find((u) => u.login === user.login.toLowerCase());
  if (!allowed) return fail("not-allowed");

  // Only the identity is kept; the GitHub token is thrown away. Writes use the server's own GITHUB_TOKEN.
  const { value, maxAge } = encodeSession({ login: user.login, id: user.id, name: user.name ?? user.login, initials: allowed.initials });
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.delete("wdp_oauth_state");
  res.cookies.set(SESSION_COOKIE, value, { httpOnly: true, secure: true, sameSite: "lax", maxAge, path: "/" });
  return res;
}
