import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env, oauthConfigured } from "@/lib/admin/config";

export function GET(req: NextRequest) {
  if (!oauthConfigured()) return NextResponse.redirect(new URL("/admin/sign-in?error=setup", req.url));
  const state = randomBytes(16).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env("GITHUB_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", new URL("/api/auth/github/callback", req.url).toString());
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set("wdp_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
