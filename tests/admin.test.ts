import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { type Node, inline, tableFromRows, toMarkdown } from "@/lib/admin/markdown";
import { parsePastedCells } from "@/lib/admin/paste";
import { emptyDraft, fromMdx, modelPath, problems, toMdx, withInstrument } from "@/lib/admin/report";
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
    method: "Two-stage DDM",
    fairValue: "$182",
    thesis: "Steady: dividends: and growth",
    keyOutputs: [{ label: "Sustainable growth", value: "9.9%" }],
  };

  it("round-trips through MDX and passes the site's schema", () => {
    const mdx = toMdx(draft, "## Valuation\n\nText.");
    const { data, body } = splitFrontmatter(mdx);
    expect(ResearchFrontmatterSchema.safeParse(data).success).toBe(true);
    expect(body.trim()).toBe("## Valuation\n\nText.");
    const back = fromMdx(mdx).draft;
    expect(back.ticker).toBe("JNJ");
    expect(back.fairValue).toBe("182");
    expect(back.thesis).toBe(draft.thesis);
    expect(back.keyOutputs).toEqual(draft.keyOutputs);
  });

  it("asks for a fair value and sell trigger before publishing", () => {
    expect(problems(draft)).toEqual({});
    const pub = problems({ ...draft, status: "published", fairValue: "" });
    expect(pub.fairValue).toBeDefined();
    expect(pub.sellTrigger).toBeDefined();
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
