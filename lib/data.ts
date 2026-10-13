import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  CheckinFrontmatterSchema,
  InstrumentSchema,
  MetaSchema,
  ResearchFrontmatterSchema,
  TeamSchema,
  TradeSchema,
  VoteSchema,
  type CheckinFrontmatter,
  type Instrument,
  type Meta,
  type ResearchFrontmatter,
  type TeamMember,
  type Trade,
  type Vote,
} from "./schemas";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), "utf8");
}

function parseCsv<T>(rel: string, schema: ZodType<T>): T[] {
  const parsed = Papa.parse<Record<string, string>>(read(rel), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  if (parsed.errors.length) {
    throw new Error(`${rel}: ${parsed.errors.map((e) => `row ${e.row}: ${e.message}`).join("; ")}`);
  }
  return parsed.data.map((row, i) => {
    const r = schema.safeParse(row);
    if (!r.success) {
      const issues = r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ");
      throw new Error(`${rel} row ${i + 2}: ${issues}`);
    }
    return r.data;
  });
}

/** Splits `---\nyaml\n---\nbody` without pulling in a heavy dependency. */
export function splitFrontmatter(raw: string): { data: unknown; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter block");
  return { data: parseYaml(m[1]), body: m[2] };
}

export const instruments = (): Instrument[] => parseCsv("data/instruments.csv", InstrumentSchema);
export const trades = (): Trade[] => parseCsv("data/trades.csv", TradeSchema);
export const votes = (): Vote[] => parseCsv("data/votes.csv", VoteSchema);
export const team = (): TeamMember[] => parseCsv("data/team.csv", TeamSchema);
export const meta = (): Meta => MetaSchema.parse(JSON.parse(read("data/meta.json")));

export interface ResearchDoc {
  slug: string;
  front: ResearchFrontmatter;
  body: string;
}

export function researchDocs(): ResearchDoc[] {
  const dir = path.join(/*turbopackIgnore: true*/ ROOT, "content/research");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const { data, body } = splitFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
      const front = ResearchFrontmatterSchema.parse(data);
      return { slug: file.replace(/\.mdx$/, ""), front, body };
    });
}

export interface CheckinDoc {
  slug: string;
  front: CheckinFrontmatter;
  body: string;
}

export function checkinDocs(): CheckinDoc[] {
  const dir = path.join(/*turbopackIgnore: true*/ ROOT, "content/checkins");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const { data, body } = splitFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
      return {
        slug: file.replace(/\.mdx$/, ""),
        front: CheckinFrontmatterSchema.parse(data),
        body,
      };
    })
    .sort((a, b) => b.front.date.localeCompare(a.front.date));
}
