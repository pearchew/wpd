import type { RepoConfig } from "./config";

/**
 * The small slice of the GitHub API the admin forms need: read a file, commit several files to a
 * branch in one go, and open or update the pull request for it. Plain fetch, no SDK.
 */

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function gh<T>(cfg: RepoConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path.replace("{repo}", `repos/${cfg.owner}/${cfg.repo}`)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new GitHubError(`GitHub ${init.method ?? "GET"} ${path}: ${res.status} ${body.message ?? res.statusText}`, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** A text file's contents at a branch, or undefined when it doesn't exist there. */
export async function readFile(cfg: RepoConfig, path: string, ref: string): Promise<string | undefined> {
  try {
    const f = await gh<{ content: string; encoding: string }>(cfg, `/{repo}/contents/${enc(path)}?ref=${encodeURIComponent(ref)}`);
    return Buffer.from(f.content, f.encoding as BufferEncoding).toString("utf8");
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return undefined;
    throw e;
  }
}

export interface PullSummary {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  branch: string;
  nodeId: string;
  updatedAt: string;
  body: string;
}

interface RawPull {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  head: { ref: string };
  node_id: string;
  updated_at: string;
  body: string | null;
}

const summary = (p: RawPull): PullSummary => ({
  number: p.number,
  title: p.title,
  url: p.html_url,
  draft: p.draft,
  branch: p.head.ref,
  nodeId: p.node_id,
  updatedAt: p.updated_at,
  body: p.body ?? "",
});

/** Open pull requests whose branch starts with `prefix`, newest first. */
export async function listPulls(cfg: RepoConfig, prefix: string): Promise<PullSummary[]> {
  const pulls = await gh<RawPull[]>(cfg, `/{repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`);
  return pulls.filter((p) => p.head.ref.startsWith(prefix)).map(summary);
}

export async function getPull(cfg: RepoConfig, n: number): Promise<PullSummary & { state: string }> {
  const p = await gh<RawPull & { state: string }>(cfg, `/{repo}/pulls/${n}`);
  return { ...summary(p), state: p.state };
}

export async function pullFiles(cfg: RepoConfig, n: number): Promise<string[]> {
  const files = await gh<{ filename: string; status: string }[]>(cfg, `/{repo}/pulls/${n}/files?per_page=100`);
  return files.filter((f) => f.status !== "removed").map((f) => f.filename);
}

/** One file in a commit: text is stored as-is, bytes are uploaded as a base64 blob. */
export type CommitFile = { path: string; text: string } | { path: string; bytes: Buffer };

/**
 * Commit `files` as one commit on `branch`. A new branch starts from `base`; an existing one gets
 * the commit on top of its current head.
 */
export async function commitFiles(
  cfg: RepoConfig,
  opts: { branch: string; message: string; files: CommitFile[]; author: { name: string; email: string } },
): Promise<string> {
  const existing = await gh<{ object: { sha: string } }>(cfg, `/{repo}/git/ref/heads/${enc(opts.branch)}`).catch((e) => {
    if (e instanceof GitHubError && e.status === 404) return undefined;
    throw e;
  });
  const parent = existing ?? (await gh<{ object: { sha: string } }>(cfg, `/{repo}/git/ref/heads/${enc(cfg.base)}`));
  const parentSha = parent.object.sha;
  const parentCommit = await gh<{ tree: { sha: string } }>(cfg, `/{repo}/git/commits/${parentSha}`);

  const tree = await Promise.all(
    opts.files.map(async (f) => {
      if ("text" in f) return { path: f.path, mode: "100644", type: "blob", content: f.text };
      const blob = await gh<{ sha: string }>(cfg, `/{repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: f.bytes.toString("base64"), encoding: "base64" }),
      });
      return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );
  const newTree = await gh<{ sha: string }>(cfg, `/{repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
  });
  const commit = await gh<{ sha: string }>(cfg, `/{repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: opts.message, tree: newTree.sha, parents: [parentSha], author: opts.author }),
  });

  if (existing) {
    await gh(cfg, `/{repo}/git/refs/heads/${enc(opts.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
  } else {
    await gh(cfg, `/{repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${opts.branch}`, sha: commit.sha }) });
  }
  return commit.sha;
}

export async function openPull(
  cfg: RepoConfig,
  opts: { branch: string; title: string; body: string; draft: boolean },
): Promise<PullSummary> {
  const p = await gh<RawPull>(cfg, `/{repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ head: opts.branch, base: cfg.base, title: opts.title, body: opts.body, draft: opts.draft }),
  });
  return summary(p);
}

/** Draft → ready for review. REST can't do this, so it's the one GraphQL call. */
export async function markReady(cfg: RepoConfig, nodeId: string): Promise<void> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { id } } }",
      variables: { id: nodeId },
    }),
    cache: "no-store",
  });
  const out = (await res.json()) as { errors?: { message: string }[] };
  if (!res.ok || out.errors?.length) {
    throw new GitHubError(`GitHub mark ready: ${out.errors?.map((e) => e.message).join("; ") ?? res.status}`, res.status);
  }
}
