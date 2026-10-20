/**
 * Turns the report editor's document (TipTap JSON) into the markdown body of an MDX report.
 * Only the node types the editor offers are handled; anything else is dropped rather than
 * guessed at. Text is escaped so MDX never mistakes it for JSX (`<`, `{`) or for markdown syntax.
 */

export interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: Mark[];
  text?: string;
}

// Outermost first. Code is innermost because nothing inside a code span is parsed.
const MARK_ORDER = ["link", "bold", "italic", "strike", "code"];

const ESCAPE = /[\\`*_[\]<>{}~]/g;
const escapeText = (s: string) => s.replace(ESCAPE, (c) => `\\${c}`);

function open(m: Mark): string {
  switch (m.type) {
    case "link":
      return "[";
    case "bold":
      return "**";
    case "italic":
      return "_";
    case "strike":
      return "~~";
    default:
      return "";
  }
}

function close(m: Mark): string {
  switch (m.type) {
    case "link":
      return `](${String(m.attrs?.href ?? "").replace(/[()\s]/g, encodeURIComponent)})`;
    case "bold":
      return "**";
    case "italic":
      return "_";
    case "strike":
      return "~~";
    default:
      return "";
  }
}

const sameMark = (a: Mark, b: Mark) => a.type === b.type && (a.type !== "link" || a.attrs?.href === b.attrs?.href);

function codeSpan(text: string): string {
  const ticks = text.includes("`") ? "``" : "`";
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${ticks}${pad}${text}${pad}${ticks}`;
}

/** Inline content (text with marks, hard breaks) → one markdown string. */
export function inline(nodes: Node[] = [], opts: { inTable?: boolean } = {}): string {
  let out = "";
  const stack: Mark[] = [];

  // Delimiters must hug the text: "**bold** next", never "**bold **next".
  const closeTo = (depth: number) => {
    const trailing = out.match(/\s*$/)![0];
    out = out.slice(0, out.length - trailing.length);
    while (stack.length > depth) out += close(stack.pop()!);
    out += trailing;
  };

  for (const n of nodes) {
    if (n.type === "hardBreak") {
      closeTo(0);
      out += opts.inTable ? " " : "\\\n";
      continue;
    }
    if (n.type !== "text" || !n.text) continue;
    const marks = MARK_ORDER.flatMap((t) => (n.marks ?? []).filter((m) => m.type === t));
    const isCode = marks.some((m) => m.type === "code");
    const outer = marks.filter((m) => m.type !== "code");

    let keep = 0;
    while (keep < stack.length && keep < outer.length && sameMark(stack[keep], outer[keep])) keep++;
    closeTo(keep);

    let text = n.text;
    const lead = outer.length > keep ? text.match(/^\s*/)![0] : "";
    out += lead;
    text = text.slice(lead.length);
    for (const m of outer.slice(keep)) {
      out += open(m);
      stack.push(m);
    }
    let piece = isCode ? codeSpan(text) : escapeText(text);
    if (opts.inTable) piece = piece.replace(/\|/g, "\\|");
    out += piece;
  }
  closeTo(0);
  return out;
}

// A line that markdown would read as a heading, quote, list item or rule needs its first character escaped.
function guardLineStart(line: string): string {
  if (/^(#{1,6}(\s|$)|>|[-+]\s|\d+[.)]\s|(-\s*){3,}$|(=+)\s*$)/.test(line)) {
    const m = line.match(/^\d+/);
    return m ? `${m[0]}\\${line.slice(m[0].length)}` : `\\${line}`;
  }
  return line;
}

const paragraph = (n: Node) =>
  inline(n.content)
    .split("\n")
    .map(guardLineStart)
    .join("\n");

const indent = (s: string, pad: string) =>
  s
    .split("\n")
    .map((l, i) => (i === 0 || l === "" ? l : pad + l))
    .join("\n");

function list(n: Node, ordered: boolean): string {
  const start = Number(n.attrs?.start ?? 1);
  return (n.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${start + i}. ` : "- ";
      const body = (item.content ?? []).map(block).filter(Boolean).join("\n\n");
      return marker + indent(body, " ".repeat(marker.length));
    })
    .join("\n");
}

const NUMERIC = /^[(+\-−]?\s*[$€£¥]?\s*[+\-−]?\d[\d,]*(\.\d+)?\s*(%|x|×|bn|m|k|pts?|bps)?\)?$/i;

function table(n: Node): string {
  const rows = (n.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((p) => inline(p.content, { inTable: true }))
        .filter(Boolean)
        .join(" ")
        .trim(),
    ),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => [...r, ...Array(width - r.length).fill("")]);
  const [head, ...body] = padded;
  // Numbers read best right-aligned, like the tables in the existing reports. The first column is labels.
  const align = head.map((_, c) => {
    const cells = body.map((r) => r[c].replace(/\\/g, "")).filter(Boolean);
    return c > 0 && cells.length > 0 && cells.every((v) => NUMERIC.test(v)) ? " ---: " : " --- ";
  });
  const line = (cells: string[]) => `| ${cells.map((v) => v || " ").join(" | ")} |`;
  return [line(head), `|${align.join("|")}|`, ...body.map(line)].join("\n");
}

function block(n: Node): string {
  switch (n.type) {
    case "paragraph":
      return paragraph(n);
    case "heading": {
      const level = Math.min(Math.max(Number(n.attrs?.level ?? 2), 2), 3);
      return `${"#".repeat(level)} ${inline(n.content).replace(/\n/g, " ")}`;
    }
    case "bulletList":
      return list(n, false);
    case "orderedList":
      return list(n, true);
    case "blockquote":
      return (n.content ?? [])
        .map(block)
        .join("\n\n")
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "horizontalRule":
      return "---";
    case "table":
      return table(n);
    default:
      return "";
  }
}

/** The whole document → markdown, ending in a single newline. */
export function toMarkdown(doc: Node): string {
  const body = (doc.content ?? [])
    .map(block)
    .filter((s) => s.trim() !== "")
    .join("\n\n");
  return body ? `${body}\n` : "";
}

/** Rows of cells pasted from Excel or Sheets (tab-separated) → editor table JSON. */
export function tableFromRows(rows: string[][], headerRow: boolean): Node {
  const width = Math.max(1, ...rows.map((r) => r.length));
  const all = headerRow ? rows : [Array.from({ length: width }, (_, i) => `Column ${i + 1}`), ...rows];
  const cell = (type: string, text: string): Node => ({
    type,
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
  });
  return {
    type: "table",
    content: all.map((r, i) => ({
      type: "tableRow",
      content: Array.from({ length: width }, (_, c) => cell(i === 0 ? "tableHeader" : "tableCell", (r[c] ?? "").trim())),
    })),
  };
}
