import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { type Node, inline, tableFromRows, toMarkdown } from "@/lib/admin/markdown";
import { parsePastedCells } from "@/lib/admin/paste";
import { emptyDraft, fromMdx, modelPath, problems, starterBody, toMdx, withInstrument } from "@/lib/admin/report";
import { splitFrontmatter } from "@/lib/frontmatter";
import { ResearchFrontmatterSchema } from "@/lib/schemas";

const t = (text: string, ...marks: string[]): Node => ({ type: "text", text, marks: marks.map((type) => ({ type })) });
const p = (...content: Node[]): Node => ({ type: "paragraph", content });
const doc = (...content: Node[]): Node => ({ type: "doc", content });

describe("editor → markdown", () => {
  it("writes headings, paragraphs and marks", () => {
    const md = toMarkdown(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Valuation")] },
        p(t("A "), t("bold", "bold"), t(" and "), t("italic", "italic"), t(" word.")),
      ),
    );
    expect(md).toBe("## Valuation\n\nA **bold** and _italic_ word.\n");
  });

  it("keeps delimiters tight around spaces and merges adjacent runs", () => {
    expect(inline([t("bold ", "bold"), t("both", "bold", "italic"), t(" plain")])).toBe("**bold _both_** plain");
  });

  it("escapes characters MDX would read as JSX or markdown", () => {
    const md = toMarkdown(doc(p(t("P/E <20x and {growth} * 2_000")), p(t("# not a heading")), p(t("1. not a list"))));
    expect(md).toBe("P/E \\<20x and \\{growth\\} \\* 2\\_000\n\n\\# not a heading\n\n1\\. not a list\n");
  });

  it("writes links and lists", () => {
    const link = { type: "text", text: "10-K", marks: [{ type: "link", attrs: { href: "https://sec.gov/x" } }] };
    const md = toMarkdown(
      doc(
        p(link),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("one"))] }, { type: "listItem", content: [p(t("two"))] }] },
        { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [p(t("first"))] }] },
      ),
    );
    expect(md).toBe("[10-K](https://sec.gov/x)\n\n- one\n- two\n\n1. first\n");
  });

  it("writes tables, right-aligning numeric columns", () => {
    const table = tableFromRows(
      [
        ["Scenario", "Growth", "Fair value", "Note"],
        ["Bear", "6.0%", "$141", "a | b"],
        ["Base", "9.9%", "$182", ""],
      ],
      true,
    );
    expect(toMarkdown(doc(table))).toBe(
      [
        "| Scenario | Growth | Fair value | Note |",
        "| --- | ---: | ---: | --- |",
        "| Bear | 6.0% | $141 | a \\| b |",
        "| Base | 9.9% | $182 |   |",
        "",
      ].join("\n"),
    );
  });

  it("adds a header row when the pasted cells have none", () => {
    const table = tableFromRows([["a", "1"]], false);
    expect(toMarkdown(doc(table))).toContain("| Column 1 | Column 2 |");
  });

  it("produces markdown the site's MDX renderer accepts", async () => {
    const md = toMarkdown(
      doc(p(t("Price <Foo> {x} </div> & more")), tableFromRows([["A", "B"], ["<1>", "{2}"]], true)),
    );
    const out = await serialize(md, { mdxOptions: { remarkPlugins: [remarkGfm] } });
    expect(out.compiledSource).toContain("Foo");
  });
});

describe("paste from Excel", () => {
  it("splits tab-separated rows, keeps quoted newlines and drops empty columns", () => {
    const text = 'Scenario\tGrowth\t\r\nBear\t6.0%\t\r\n"Base\ncase"\t9.9%\t\r\n';
    expect(parsePastedCells(text)).toEqual([
      ["Scenario", "Growth"],
      ["Bear", "6.0%"],
      ["Base\ncase", "9.9%"],
    ]);
  });
});

describe("report files", () => {
  const draft = {
    ...emptyDraft("B", "2026-10-20"),
    ticker: "jnj",
    name: "Johnson & Johnson",
    exchange: "NYSE",
    thesis: "Steady: dividends: and growth",
    keyNumbers: [{ label: "Dividend yield", value: "3.1", unit: "%", asOf: "2026-10-20", source: "Company filings" }],
  };
  const strategy = {
    family: "Event-driven" as const,
    rule: "Buy after a positive earnings surprise",
    entry: "Q3 beat by 5%",
    exit: "20 trading days, or a close below the pre-earnings price",
    holding: "20 days",
    papers: "Bernard & Thomas (1989)",
  };

  it("round-trips through MDX and passes the site's schema", () => {
    const full = { ...draft, view: "Long" as const, conviction: "High" as const, strategy };
    const mdx = toMdx(full, "## What it is\n\nText.");
    const { data, body } = splitFrontmatter(mdx);
    expect(ResearchFrontmatterSchema.safeParse(data).success).toBe(true);
    expect(body.trim()).toBe("## What it is\n\nText.");
    const back = fromMdx(mdx).draft;
    expect(back.ticker).toBe("JNJ");
    expect(back.exchange).toBe("NYSE");
    expect(back.thesis).toBe(draft.thesis);
    expect(back.keyNumbers).toEqual(draft.keyNumbers);
    expect(back.strategy).toEqual(strategy);
    expect(back.view).toBe("Long");
  });

  it("asks for a view, conviction and strategy before publishing, and entry and exit only for long or short", () => {
    expect(problems(draft)).toEqual({});
    const pub = problems({ ...draft, status: "published" });
    expect(pub.view).toBeDefined();
    expect(pub.conviction).toBeDefined();
    expect(pub.family).toBeDefined();
    const watch = { ...draft, status: "published" as const, view: "Watch" as const, conviction: "Low" as const };
    expect(problems({ ...watch, strategy: { ...strategy, entry: "", exit: "" } })).toEqual({});
    const short = problems({ ...watch, view: "Short", strategy: { ...strategy, entry: "", exit: "" } });
    expect(short.entry).toBeDefined();
    expect(short.exit).toBeDefined();
  });

  it("stamps the first publish date and keeps it on later edits", () => {
    const pub = { ...draft, status: "published" as const, view: "Neutral" as const, conviction: "Medium" as const, strategy };
    const first = fromMdx(toMdx(pub, "x")).draft;
    expect(first.published).toBe("2026-10-20");
    expect(fromMdx(toMdx({ ...first, updated: "2026-11-02" }, "x")).draft.published).toBe("2026-10-20");
  });

  it("starts the write-up with the sections for the asset type", () => {
    const heads = (md: string) => md.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
    const stock = heads(starterBody("stock", "Equities"));
    const future = heads(starterBody("future", "Derivatives"));
    expect(stock).toContain("Peer / pair");
    expect(stock).toContain("Currency exposure");
    expect(stock).not.toContain("Contract specs");
    expect(future).toEqual(expect.arrayContaining(["Contract specs", "Curve and inventories", "Supply-demand balance"]));
    expect(future).not.toContain("Peer / pair");
    expect(heads(starterBody("etf", "Commodities"))).toContain("Curve and inventories");
    for (const core of ["What it is", "Price drivers", "Catalyst calendar", "Evidence", "Valuation check", "Risks", "What would change our mind", "Event log", "Review notes", "Sources"]) {
      expect(stock).toContain(core);
      expect(future).toContain(core);
    }
  });

  it("adds a new asset to instruments.csv once", () => {
    const csv = "ticker,name,asset_class,currency,feed_symbol,kind,multiplier,underlying\nMSFT,Microsoft,Equities,USD,MSFT,stock,1,\n";
    const asset = { kind: "stock" as const, currency: "usd", feedSymbol: "" };
    const once = withInstrument(csv, draft, asset);
    expect(once).toBe(`${csv}JNJ,Johnson & Johnson,Equities,USD,JNJ,stock,1,\n`);
    expect(withInstrument(once, draft, asset)).toBe(once);
  });

  it("names uploaded models after the ticker", () => {
    expect(modelPath("JNJ", "My DDM v2.xlsx")).toBe("/models/jnj-my-ddm-v2.xlsx");
    expect(modelPath("JNJ", "jnj-ddm.xlsx")).toBe("/models/jnj-ddm.xlsx");
  });
});
