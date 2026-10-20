/** Admin settings, read from env vars. Server only: none of these reach the browser. */

/** An env var with surrounding spaces and line breaks removed: pasting into Vercel often brings one along. */
export const env = (name: string): string => (process.env[name] ?? "").trim();

export interface AdminUser {
  login: string;
  initials: string;
}

/** ADMIN_USERS="githublogin:A,otherlogin:B" maps each allowed GitHub account to team initials. */
export function adminUsers(): AdminUser[] {
  return env("ADMIN_USERS")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [login, initials] = pair.split(":").map((s) => s.trim());
      return { login: login.toLowerCase(), initials: (initials ?? "").toUpperCase() };
    })
    .filter((u) => u.login && u.initials);
}

export const oauthConfigured = (): boolean =>
  Boolean(env("GITHUB_OAUTH_CLIENT_ID") && env("GITHUB_OAUTH_CLIENT_SECRET") && env("ADMIN_SESSION_SECRET"));

/** Local-only sign-in for `npm run dev`: ADMIN_DEV_USER=A signs you in as A. Ignored in production. */
export const devUser = (): string | undefined =>
  process.env.NODE_ENV !== "production" ? env("ADMIN_DEV_USER").toUpperCase() || undefined : undefined;

export interface RepoConfig {
  token: string;
  owner: string;
  repo: string;
  base: string;
}

/** GITHUB_TOKEN (contents + pull requests: read/write on this repo), GITHUB_REPO="owner/name". */
export function repoConfig(): RepoConfig | undefined {
  const token = env("GITHUB_TOKEN");
  const [owner, repo] = env("GITHUB_REPO").split("/");
  if (!token || !owner || !repo) return undefined;
  return { token, owner, repo, base: env("GITHUB_BASE_BRANCH") || "main" };
}
