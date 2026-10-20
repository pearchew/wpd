"use client";

import { useEffect, useRef, useState } from "react";
import { parsePastedCells } from "@/lib/admin/paste";

export function PasteTableDialog({
  onInsert,
  onCancel,
}: {
  onInsert: (rows: string[][], headerRow: boolean) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [header, setHeader] = useState(true);
  const ref = useRef<HTMLDialogElement>(null);
  const rows = parsePastedCells(text);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} className="admin-dialog" onCancel={onCancel} aria-labelledby="paste-title">
      <h3 id="paste-title">Paste a table</h3>
      <p className="sub">Copy the cells in Excel or Google Sheets, click the box below and press Ctrl+V (⌘V on a Mac).</p>
      <textarea
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste here"
        aria-label="Pasted cells"
      />
      <label className="check">
        <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> First row is the header
      </label>
      <p className="sub">Columns of numbers are right-aligned on the site automatically.</p>
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            {header && (
              <thead>
                <tr>{rows[0].map((c, i) => <th key={i}>{c}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(header ? rows.slice(1) : rows).map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-dialog-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="button" disabled={rows.length === 0} onClick={() => onInsert(rows, header)}>
          Insert table
        </button>
      </div>
    </dialog>
  );
}
