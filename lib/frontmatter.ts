import { parse as parseYaml } from "yaml";

/** Splits `---\nyaml\n---\nbody` without pulling in a heavy dependency. No fs, so the admin form can use it too. */
export function splitFrontmatter(raw: string): { data: unknown; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter block");
  return { data: parseYaml(m[1]), body: m[2] };
}
