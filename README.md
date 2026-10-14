# WDP Fund

**Conviction backed by fundamentals.** A three-page site that tracks our $100 practice portfolio against SPY and publishes the analysis behind every position. Full spec: [docs/PRD.md](docs/PRD.md). Page sketches: [docs/wireframes.md](docs/wireframes.md).

Next.js (App Router, TypeScript) · MDX · Recharts · Zod · Supabase · Vercel.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ledger, NAV, options and committee-rule tests
npm run build      # validates data first, then builds
```

The site reads real closes from Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set (see below). Without them it falls back to a deterministic fake market (`lib/prices/dummy.ts`) with a banner, so the repo still runs on a fresh clone. The fake prices will not match the real fills in `data/trades.csv`, so the numbers are only sensible against Supabase.

## Pages

| Route | What |
| --- | --- |
| `/` | Home: view toggle (`?view=real\|combined\|paper`, default Real; hidden while there are no paper trades), hero tiles, fund vs SPY, winners/losers, holdings, allocation and risk, research teaser |
| `/research` | Index: asset-class tabs, author filter (`?class=equities&author=A`), "Analysis in progress" cards |
| `/research/[ticker]` | One write-up: thesis, fair value, key outputs, price chart with fair-value line, MDX body, sell trigger, committee votes, Excel model |
| `/fund` | Inside the Fund: house rules, decision thresholds and the vote history, so a visitor can see how the fund works |
| `/api/cron/daily` | Daily price job (Vercel cron, weekdays 21:30 UTC) |

## Where things live

Everything we write or decide is a file in this repo. Only market data goes in Supabase. Holdings are never stored: they are replayed from the ledger.

```
content/research/<ticker>.mdx   one write-up per asset (frontmatter + MDX body)
data/trades.csv                 every buy, sell, dividend, deposit, paper trade
data/votes.csv                  every committee vote
data/instruments.csv            ticker, name, class, currency, feed symbol, contract details
data/team.csv                   initials, name, bio, avatar
data/meta.json                  launch date, reporting currency, last reconciled, risk-free rate
public/models/                  Excel models for download
public/avatars/                 8-bit faces
```

Ledger conventions: `deposit`, `withdrawal` and `fee` rows carry the amount in the **price** column. `dividend` with no `shares` is a total amount; with `shares` it is per share. `split` puts the ratio in `shares`. A rebalance is sell rows plus buy rows; never edit or delete old rows. Paper trades use `book=paper` and set `notional_slice`, the dollars of the fund the position represents in the Combined view.

## Update workflows

Edit files in GitHub's web editor, open a pull request, and Vercel posts a preview. If validation fails, the build fails and the previous version stays live.

- **Add analysis:** create `content/research/<ticker>.mdx` (set `status: in-progress` to show a placeholder card early), upload the model to `public/models/`, flip to `status: published`, merge.
- **Change positions:** add one row per broker fill to `data/trades.csv`.
- **Record a vote:** add one row per voter to `data/votes.csv`; a change of mind is a new row.
- **Weekly reconciliation:** compare site NAV to the broker, add any missing dividend or fee row, update `lastReconciled` in `data/meta.json`.

`npm run validate` checks known tickers, dates, voters, authors, the 25% cap, required frontmatter, model files and derivative fields. It runs automatically before every build.

## Going live

1. **Supabase:** the `wdp-fund` project exists and its tables are created (the same SQL is in `supabase/migrations/`). For a new project, run [supabase/schema.sql](supabase/schema.sql) in its SQL editor. Put the project URL and service-role key in `.env.local`, then `npm run db:check` confirms the tables exist.
2. **Vercel:** import the repo and set the variables from [.env.example](.env.example): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PRICE_API_KEY`, `CRON_SECRET`, and optionally `RESEND_API_KEY` + `ALERT_EMAIL` for failure emails.
3. As soon as the two Supabase variables exist, the site reads real closes and the demo banner disappears. `vercel.json` schedules the daily job.
4. **Current data:** `data/trades.csv` splits the $100 deposit evenly between NVDA and MSFT at the 2026-10-14 close, and `content/research/` has placeholder reports for both. Replace them with the real ledger and write-ups as you go. `votes.csv` and `team.csv` are placeholders too.

The price feed is behind one interface in [lib/feed](lib/feed/index.ts); Twelve Data is wired up. Check that it covers every ticker you hold (futures and options symbols especially) before relying on it, and note the free plan's 8-requests-a-minute limit. Run `npm run db:backfill` once to load history since launch (the daily job only fetches the last few days), then `npm run db:check` to see the latest close for every instrument.

## How the numbers work

- NAV = Σ shares × close (in the reporting currency) + cash. Fund and SPY are indexed to 100 at launch; the fund line is time-weighted, so deposits are not performance.
- **Real** is the headline. **Paper** is shown with its own P&L, margin and Greeks. **Combined** adds paper P&L scaled to its `notional_slice` (futures: contract % move × slice; options: per-share P&L × shares actually held when there is no slice). Paper P&L is never added at full notional.
- Verdict = each voter's latest vote per ticker; Include needs 2 of 3 and at least one Include from someone other than the research author.
- Risk (correlation, risk contribution, Sharpe, diversification benefit) is computed from daily returns since launch.
- All positions are valued from daily closes so the timelines line up.

## Known limits

- The dummy market calendar only knows 2026 US holidays; the real feed is the source of truth.
- Prices are not adjusted for splits or dividends beyond what the ledger records.
- Non-USD tickers need a daily FX pair in the `fx` table (`GBPUSD` and so on); pence quoting (`GBp`) is not handled.
- The daily job and Supabase reader are written but have only been exercised against dummy mode, not a live project.
