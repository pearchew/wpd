import type { RepoConfig } from "./config";
import { type CommitFile, commitFiles, getPull, openPull, readFile } from "./github";
import { localFile } from "./load";
import type { Session } from "./session";

/**
 * The append-only forms (trades, votes) share one pattern: rows go into the open pull request
 * for that form if there is one, otherwise into a new one. That keeps two changes from fighting
 * over the same CSV file.
 */

export const commitAuthor = (s: Session) => ({
  name: s.name,
  email: s.id ? `${s.id}+${s.login}@users.noreply.github.com` : `${s.login}@users.noreply.github.com`,
});

/** The branch of open change `pr`, after checking it really is one of this form's. */
export async function changeBranch(cfg: RepoConfig, prefix: string, pr: number): Promise<string | undefined> {
  const pull = await getPull(cfg, pr).catch(() => undefined);
  return pull && pull.state === "open" && pull.branch.startsWith(prefix) ? pull.branch : undefined;
}

/** Files as they are on `ref` (GitHub), or in this deployment's own copy when GitHub isn't connected. */
export async function readFiles(cfg: RepoConfig | undefined, ref: string | undefined, paths: string[]): Promise<(string | undefined)[]> {
  return cfg ? Promise.all(paths.map((p) => readFile(cfg, p, ref ?? cfg.base))) : paths.map(localFile);
}

/** Commit `files` to the open change's branch, or to a new branch with a new pull request. */
export async function commitToChange(
  cfg: RepoConfig,
  session: Session,
  opts: { prefix: string; branch?: string; pr?: number; files: CommitFile[]; message: string; title: string; body: string },
): Promise<{ number: number; url: string }> {
  const branch = opts.branch ?? `${opts.prefix}${session.initials.toLowerCase()}-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}`;
  await commitFiles(cfg, { branch, message: opts.message.slice(0, 200), files: opts.files, author: commitAuthor(session) });
  if (opts.branch && opts.pr) {
    const pull = await getPull(cfg, opts.pr);
    return { number: pull.number, url: pull.url };
  }
  const opened = await openPull(cfg, { branch, draft: false, title: opts.title.slice(0, 120), body: opts.body });
  return { number: opened.number, url: opened.url };
}
