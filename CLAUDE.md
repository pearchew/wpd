# WDP Fund: notes for Claude

Spec is [docs/PRD.md](docs/PRD.md); page sketches are [docs/wireframes.md](docs/wireframes.md). Read the README first.

- `npm run dev | build | test | typecheck | validate`. `build` runs `validate` first (Zod checks over `data/` and `content/`).
- Data flow: CSV/MDX files → `lib/data.ts` → `lib/calc/ledger.ts` (replays trades, builds the NAV timeline) → `lib/fund.ts` (`getFundData`, view selections) → server components. Prices come from `lib/prices` (dummy generator, or Supabase when its env vars are set).
- Pages never store holdings; they are always replayed from `data/trades.csv`.
- `?view=` is real by default; never default to paper. Paper numbers must keep the amber accent and "no real capital" label.
- Numbers use tabular figures; the pixel font (`.pixel`) is for small labels only, never numbers or body text.
- Keep the layout centred and usable at 375px with no page-level horizontal scroll (wide tables scroll inside `.table-wrap`).
- `npm run seed:dummy` overwrites all sample data. Don't run it once real data is in.
