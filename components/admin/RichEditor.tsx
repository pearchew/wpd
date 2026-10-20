"use client";

import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import { type Node, tableFromRows, toMarkdown } from "@/lib/admin/markdown";
import { PasteTableDialog } from "./PasteTableDialog";

const TEMPLATES: { label: string; rows: string[][] }[] = [
  {
    label: "Valuation assumptions",
    rows: [
      ["Assumption", "Base case"],
      ["Revenue growth (5y)", ""],
      ["Operating margin (year 5)", ""],
      ["Discount rate", ""],
      ["Terminal growth", ""],
    ],
  },
  {
    label: "Scenario table (bear / base / bull)",
    rows: [
      ["Scenario", "Growth", "Fair value", "Upside"],
      ["Bear", "", "", ""],
      ["Base", "", "", ""],
      ["Bull", "", "", ""],
    ],
  },
];

export function RichEditor({
  markdown,
  onChange,
}: {
  markdown: string;
  /** `first` is the editor's initial render of `markdown`, not an edit. */
  onChange: (md: string, html: string, first: boolean) => void;
}) {
  const [pasting, setPasting] = useState(false);
  const [menu, setMenu] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Start typing…" }),
    ],
    content: marked.parse(markdown, { gfm: true, async: false }),
    editorProps: { attributes: { class: "prose rich-editor-content", "aria-label": "Write-up" } },
    onCreate: ({ editor }) => onChangeRef.current(toMarkdown(editor.getJSON() as Node), editor.getHTML(), true),
    onUpdate: ({ editor }) => onChangeRef.current(toMarkdown(editor.getJSON() as Node), editor.getHTML(), false),
  });

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  if (!editor) return <div className="rich-editor loading">Loading editor…</div>;

  const insertTable = (rows: string[][], header = true) =>
    editor.chain().focus().insertContent(tableFromRows(rows, header)).run();

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} menu={menu} setMenu={setMenu} onPaste={() => setPasting(true)} insertTable={insertTable} />
      <EditorContent editor={editor} />
      {pasting && (
        <PasteTableDialog
          onCancel={() => setPasting(false)}
          onInsert={(rows, header) => {
            setPasting(false);
            insertTable(rows, header);
          }}
        />
      )}
    </div>
  );
}

function Toolbar({
  editor,
  menu,
  setMenu,
  onPaste,
  insertTable,
}: {
  editor: Editor;
  menu: boolean;
  setMenu: (v: boolean) => void;
  onPaste: () => void;
  insertTable: (rows: string[][]) => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      table: e.isActive("table"),
    }),
  });
  const c = () => editor.chain().focus();
  const btn = (label: string, title: string, active: boolean, run: () => void) => (
    <button type="button" title={title} aria-label={title} aria-pressed={active} className={active ? "on" : ""} onClick={run}>
      {label}
    </button>
  );
  const setLink = () => {
    if (s.link) return c().unsetLink().run();
    const href = window.prompt("Link to (https://…)");
    if (href) c().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
      {btn("B", "Bold", s.bold, () => c().toggleBold().run())}
      {btn("I", "Italic", s.italic, () => c().toggleItalic().run())}
      {btn("H2", "Section heading", s.h2, () => c().toggleHeading({ level: 2 }).run())}
      {btn("H3", "Sub-heading", s.h3, () => c().toggleHeading({ level: 3 }).run())}
      {btn("• List", "Bulleted list", s.bullet, () => c().toggleBulletList().run())}
      {btn("1. List", "Numbered list", s.ordered, () => c().toggleOrderedList().run())}
      {btn("Link", "Link", s.link, setLink)}
      <span className="rich-menu-wrap">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={(e) => {
            e.stopPropagation();
            setMenu(!menu);
          }}
        >
          ⊞ Table ▾
        </button>
        {menu && (
          <span className="rich-menu" role="menu">
            <button type="button" role="menuitem" onClick={onPaste}>Paste from Excel / Sheets</button>
            <button type="button" role="menuitem" onClick={() => c().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}>
              Blank table (3 × 2)
            </button>
            {TEMPLATES.map((t) => (
              <button key={t.label} type="button" role="menuitem" onClick={() => insertTable(t.rows)}>
                {t.label}
              </button>
            ))}
          </span>
        )}
      </span>
      {s.table && (
        <span className="rich-table-tools" aria-label="Table">
          <button type="button" onClick={() => c().addRowAfter().run()}>+ row</button>
          <button type="button" onClick={() => c().addColumnAfter().run()}>+ column</button>
          <button type="button" onClick={() => c().deleteRow().run()}>− row</button>
          <button type="button" onClick={() => c().deleteColumn().run()}>− column</button>
          <button type="button" onClick={() => c().deleteTable().run()}>Delete table</button>
        </span>
      )}
    </div>
  );
}
