import Papa from "papaparse";

/** Excel and Sheets put copied cells on the clipboard as tab-separated text, quoting cells that contain tabs or newlines. */
export function parsePastedCells(text: string): string[][] {
  const rows = Papa.parse<string[]>(text.replace(/\r\n?/g, "\n").replace(/\n+$/, ""), { delimiter: "\t", skipEmptyLines: true }).data;
  // Drop columns that are empty all the way down (a stray selection edge).
  const width = Math.max(0, ...rows.map((r) => r.length));
  const keep = Array.from({ length: width }, (_, c) => rows.some((r) => (r[c] ?? "").trim() !== ""));
  return rows.map((r) => keep.flatMap((k, c) => (k ? [(r[c] ?? "").trim()] : []))).filter((r) => r.some(Boolean));
}
