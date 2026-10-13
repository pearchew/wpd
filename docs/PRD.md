# WDP Fund Website — PRD

Oct 13, 2026 · Pierson Chu

> **For Claude Code:** this file is the spec for the WDP Fund website. Build it phase by phase (see "Milestones"), starting with Phase 1. Items under "Open questions" are not decided yet: use the placeholder or default noted, keep it configurable, and don't block on them. Runs entirely on free tiers (Vercel Hobby, Supabase free, a free price API).

## Overview

The WDP Fund website is a three-page public site that shows how our $100 practice portfolio is performing against SPY and publishes the analysis behind every position. Tagline: **Conviction backed by fundamentals.**

**Who it is for**

- The three of us: one place to track the fund, log trades and votes, and publish research.
- Friends, classmates and recruiters: a credible, slightly playful showcase of real valuation work.

**Goals**

1. Show real-capital performance vs SPY on the home page, updated daily after the US close.
2. Keep paper-traded derivatives visible but clearly separated, with an optional scaled combined view.
3. Publish one write-up per asset, credited to its author, released whenever it is ready.
4. Let any of us update analysis, positions and votes by editing files in GitHub, with no code changes.
5. Run entirely on free tiers (Vercel, Supabase, a free price API).

**Non-goals**

- Tick-by-tick live prices. Daily closes are honest and enough for a weekly-reviewed fund.
- Investment advice, sign-ups or any way for visitors to invest.
- An analyst leaderboard. We publish at different times, so comparing people would be unfair.
- An admin dashboard or CMS. GitHub is the editing interface.

## Sitemap and navigation

The site has three pages — Home, Research and Inside the Fund — plus one page per asset under Research.

```
                 Top bar on every page
   WDP Fund · Home · Research · Inside the Fund · team faces
          │                  │                    │
          ▼                  ▼                    ▼
   Home  /             Research  /research   Inside the Fund  /fund
   - Hero + toggle     - 4 asset-class tabs  - Paper book
   - Fund vs SPY       - Card per asset      - Committee log + votes
   - Winners/losers    - Filter by author    - House rules
   - Holdings table    - In-progress cards   - Team bios
   - Allocation/risk         │
   - Research teaser         ▼
          │            Asset page  /research/[ticker]
          └──links────▶ Full write-up, model, votes
```

Holdings rows and teaser lines on Home link straight to the asset page; clicking a face in the top bar opens Research filtered to that person's work.

## Home page

The home page answers three questions in ten seconds: how the fund is doing, what it holds, and whether it beats SPY. Sections run top to bottom in this order.

| # | Section | What it shows | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | "WDP Fund" wordmark left; three 8-bit faces right | Hover a face: name and assets covered. Click: Research filtered to that author. Doubles as the team intro. |
| 2 | Tagline | Conviction backed by fundamentals | Under the wordmark in the hero. |
| 3 | View toggle | `[ Combined \| ● Real \| Paper only ]` | Defaults to Real. Sits above the hero tiles and switches every section below it. |
| 4 | Hero tiles | NAV, return since inception, SPY return, gap vs SPY | Green/red gap. "As of [date], US close" timestamp and a "Reconciled with broker: [date]" note. |
| 5 | Performance chart | Fund vs SPY, both indexed to 100 at launch | 1W / 1M / since-inception toggles; markers on trade and rebalance dates. |
| 6 | Winners and losers | 3×2 grid: top row best 3, bottom row worst 3, since purchase | Each tile: ticker, asset class, % return, $ contribution, sparkline, author's pixel face, one-line note from the research. Pixel crown on #1, skull on the worst. |
| 7 | Holdings table | Ticker, asset class, weight, value, return since buy, author, verdict, fair value vs price | Rows link to the asset's research page. Assets without research show price and return only. |
| 8 | Allocation and risk | Donut by asset class; weight vs risk-contribution bars; correlation heatmap; Sharpe; diversification benefit | Computed from stored daily returns. |
| 9 | Research teaser | Equities / Fixed Income / Commodities / Derivatives dropdowns | One line per asset: thesis, fair value vs price, verdict, "by ____". Unpublished assets show an "Analysis in progress" card. Links to full write-ups. |

**Grid edge cases**

- Rank by % return since first purchase; show $ contribution alongside so weight is visible.
- An asset without research shows its return and skips the one-line note.
- Fewer than 6 positions in the current view (likely in Paper only): show a single ranked row instead of top 3 and bottom 3.

**Footer (every page):** "The WDP Fund is a student learning exercise, not investment advice."

## Real, Paper and Combined views

Real capital is the headline; paper derivatives are shown separately or scaled to position size, never added at full notional. One Micro E-mini contract controls about 5× the S&P 500 level in dollars and one option covers 100 shares, so unscaled paper P&L would swamp a $100 fund.

| | Combined | Real (default) | Paper only |
| --- | --- | --- | --- |
| Hero tiles | Real NAV + scaled overlay, return vs SPY | $100 NAV, return vs SPY | Paper P&L ($), return on margin, peak leverage |
| Chart | Real line solid, combined line dashed, SPY | Fund vs SPY | Paper equity curve + one line per contract |
| Winners/losers | Real and paper positions together | Real holdings | Paper positions |
| Holdings table | Stocks + derivative rows, scaled | Real holdings only | Futures and options: notional, margin, Greeks |
| Allocation/risk | Includes overlay exposure | Real weights and risk contribution | Notional exposure by contract |
| Label | "Includes paper derivatives, scaled to position size" | "Real capital, $100 invested" | "Paper trades, no real capital" |
| Accent colour | Muted | Main brand colour | Amber |

**Overlay scaling rules (Combined view)**

- Options on a held stock: per-share option P&L × fractional shares actually held. Example: protective put P&L per share × 0.06 NVDA shares.
- Futures: contract % move × a fixed notional slice of the fund, set per contract in the ledger (e.g. WTI treated as $10, 10% of the fund).
- The combined line is dashed and carries a one-line note explaining the scaling.

**Paper-only metrics**

- $ P&L per contract, return on margin, notional and leverage.
- Days that would have triggered a margin call.
- Options: entry premium, current mark, and daily move split into delta, theta and vega.

**Behaviour**

- The view lives in the URL (`?view=real|paper|combined`) so it can be linked.
- No `?view=` → Real. A refresh or new visit never lands on paper numbers by accident.
- All positions, real and paper, are valued from daily closes so the timelines line up.

## Research page

The Research page holds the full write-up for every asset, grouped by asset class, each credited to its author and published when ready.

**Index (`/research`)**

- Four tabs: Equities, Fixed Income, Commodities, Derivatives (Paper).
- One card per asset: name, ticker, method, fair value vs price, verdict, byline, last updated.
- Filter by author (also reached by clicking a face in the top bar).
- Unpublished assets show a greyed "Analysis in progress" card.

**Asset page (`/research/[ticker]`)**

- Header: **Microsoft (MSFT)** · Equities · DCF, then "Research by ____ · Updated [date]".
- Thesis in one sentence.
- Valuation method and fair value, with key assumptions.
- What the market price implies (reverse DCF / implied growth or ROTE).
- Biggest risk and sell trigger.
- Committee verdict and vote history for that asset.
- Download link to the Excel model.
- Price chart since purchase with the fair value drawn as a line.

**Method by asset type**

| Asset type | Method shown | Key output |
| --- | --- | --- |
| Stocks (most) | DCF | Fair value, terminal-value share of EV, sensitivity grid |
| Banks | Residual income / P/B | Implied ROTE vs 5-year average |
| Dividend payers | Two-stage DDM | Fair value, sustainable growth check |
| Bond ETFs | Representative bond | Yield, duration, loss on +1pt rates, credit spread |
| Gold | Scorecard | Real rates, USD, correlation with the portfolio |
| Futures (paper) | Cost of carry | Notional, leverage, roll yield, basis |
| Options (paper) | Black-Scholes | Model vs market price, implied vol, Greeks |

A byline is per piece, not per asset owner, so if the split between us changes each write-up still credits whoever wrote it.

## Inside the Fund page

Inside the Fund (`/fund`) shows how the fund is run: the paper book, the committee's decisions and the team.

**Paper book**

- Labelled "Paper — not real capital" with the amber accent.
- Paper equity curve, starting from the agreed paper account size (initial margin per contract).
- One card per position, each with a byline: entry, current mark, $ P&L, return on margin, notional, leverage.
- Futures: roll yield (contango/backwardation) and a list of margin-call days.
- Options: model vs market price, implied vol, delta/theta/vega attribution of the daily move.

**Investment committee log**

- House rules shown at the top: no position above 25%, at least three asset classes, Include needs 2 of 3 votes and the owner's vote alone never carries it, no trade under about $5, sell trigger written at entry.
- Decision thresholds: Include if fair value ≥ 15% above price (stocks) or it lowers volatility / raises Sharpe at a 10% weight (bonds, gold); Watch at 0–15% upside; Reject if fair value is below price or the risk case fails.
- Vote history per asset, newest first, so changes of mind stay visible.
- Weekly check-in notes and, after month one, the post-mortem.

**Team**

- The three 8-bit faces large, each with a name, a short bio, and links to their published research.
- No explanation of the fund name.

## Visual design

The look is an annual-report base with an 8-bit accent layer: the editorial style makes the numbers credible, the pixel art makes it fun.

**Base theme (annual report)**

- Cream page, serif headings, a clean sans for body text, tabular figures for every number.
- Thin rules instead of heavy cards; one deep accent colour for the Real view.
- Light and dark mode.

**8-bit layer (accents only)**

- Three 16×16 pixel faces in the top bar, team section and next to each byline and grid tile.
- A pixel font only for small labels (grid tiles, badges), never for numbers or body text.
- Pixel crown on the best performer, skull on the worst.
- Pixel favicon: "WDP" in a small accent-coloured square.
- Faces drawn by each of us in a free pixel editor (e.g. Piskel) or generated as SVGs from descriptions, so all three match. Until then, use placeholder pixel faces.

**Colour by view**

| View | Accent | Purpose |
| --- | --- | --- |
| Real | Main brand colour | Default, real money |
| Combined | Muted version | Signals a modelled number |
| Paper only | Amber | Screenshots can't be mistaken for real returns |

Gains and losses use green and red throughout, independent of the view accent. Layout works at phone width with no horizontal scroll; wide tables scroll inside their own container.

## Data model

Everything we write or decide lives as files in the GitHub repo; only market data lives in Supabase. Current holdings are never stored — they are computed from the trade ledger.

```
wdp-fund/
├── content/research/   one .mdx per asset (msft.mdx, xom.mdx, …)
├── data/
│   ├── trades.csv      every buy, sell, dividend, deposit, paper trade
│   ├── votes.csv       every committee vote
│   ├── instruments.csv ticker, name, asset class, currency, price-feed symbol
│   ├── team.csv        initials, name, bio, avatar file
│   └── meta.json       launch date, reporting currency, last reconciled date
├── public/models/      Excel models for download
└── public/avatars/     8-bit faces
```

**Research file frontmatter**

```yaml
---
ticker: XOM
name: Exxon Mobil
assetClass: Equities        # Equities | Fixed Income | Commodities | Derivatives
method: DCF
status: published           # or in-progress → "Analysis in progress" card
author: ____
updated: 2026-10-12
fairValue: 128
thesis: One-sentence thesis used in the teaser and grid
sellTrigger: Fair value reached, or oil below $60 for a quarter
model: /models/xom-dcf.xlsx
---
```

**trades.csv**

```csv
date,book,ticker,action,shares,price,fees,currency,notional_slice,note
2026-10-19,real,CASH,deposit,,100,,USD,,Starting capital
2026-10-19,real,MSFT,buy,0.0312,512.40,0,USD,,Initial
2026-11-03,real,JNJ,dividend,,0.04,,USD,,Quarterly dividend
2026-10-20,paper,MCL,buy,1,71.20,,USD,10,Long front-month
```

- `book` = real or paper; drives the three views.
- `action` = buy, sell, dividend, deposit, withdrawal, fee, split.
- `notional_slice` = $ of the fund a paper position represents in the Combined view.
- Shares and prices copied from the broker's fill confirmation.

**votes.csv**

```csv
date,ticker,voter,vote,conviction,note
2026-10-18,XOM,____,Include,High,
2026-10-18,XOM,____,Watch,Medium,Waiting for Q3 earnings
```

Current verdict = each voter's latest vote per ticker, with the 2-of-3 rule applied and the owner's vote alone never carrying Include.

**Supabase tables**

| Table | Columns | Written by |
| --- | --- | --- |
| prices | date, ticker, close, adj_close, currency | Daily job |
| fx | date, pair, rate | Daily job |
| nav_snapshots | date, book, nav, spy_close, combined_nav | Daily job |
| job_runs | date, status, error | Daily job |

**Calculations**

- Holdings = cumulative shares per ticker from trades; cash = deposits + sells + dividends − buys − fees.
- NAV = Σ shares × close (converted to the reporting currency) + cash.
- Fund and SPY both indexed to 100 at launch date.
- Returns, covariance, correlation, risk contribution and Sharpe computed from daily snapshots; methods as in the Practice Portfolio Playbook.

## Update workflows

Every change is a file edit in GitHub's web editor; Vercel rebuilds the site automatically, and a failed check keeps the previous version live.

**Add a piece of analysis**

1. Create `content/research/<ticker>.mdx` on a new branch with the frontmatter and write-up. Set `status: in-progress` to show the placeholder card early.
2. Upload the Excel model to `public/models/`.
3. Open a pull request. Vercel posts a preview link.
4. The other two review the preview and comment as sceptics.
5. Set `status: published` and merge. The teaser, holdings table, grid and Research page all update.

**Change positions**

1. Place the trade at the broker as a dollar amount, limit order, during US hours.
2. Add one row per fill to `trades.csv` (shares and price from the confirmation; fees included).
3. A rebalance = sell rows + buy rows. Never edit or delete old rows.
4. Record dividends as they land.
5. Paper trades: same file, `book=paper`, with `notional_slice` set.

**Record a vote**

1. Add one row per voter to `votes.csv` after the committee meets.
2. A change of mind is a new row; old rows stay as history.
3. Assets can be voted on without being held; they appear in Research with their verdict.

**Weekly reconciliation**

1. Compare the site NAV with the broker statement.
2. If they differ, find the missing row (usually a dividend, fee or FX charge) and add it.
3. Update the "Reconciled with broker" date in `data/meta.json`.

## Tech stack and architecture

The site is a Next.js app on Vercel's free plan: content builds from the GitHub repo on every merge, and one daily job fetches prices into Supabase.

```
 CONTENT PATH (on every merge)
 GitHub repo ──on merge──▶ Vercel build ──deploy──▶ Website (Next.js)
 .mdx, CSVs, models         validation checks            ▲
                            fail → last version stays    │ read
                            preview link per PR          │
 DATA PATH (daily, after US close)                       │
 Price API (free) ──fetch──▶ Vercel daily job ──write──▶ Supabase (free)
 closes + FX                 computes NAV snapshot       prices, fx,
 key in env vars             emails owner on failure     nav_snapshots, job_runs
```

| Component | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript | Static pages + daily revalidation; MDX support |
| Hosting | Vercel Hobby | Free; auto-deploy and preview link per pull request |
| Database | Supabase free tier | Postgres for prices, FX and NAV history |
| Price data | A free API (Twelve Data, Finnhub or Financial Modeling Prep) | Daily closes for US and London tickers; pick after checking coverage |
| Scheduling | Vercel cron, once a day | Free plan allows roughly daily runs, enough for a weekly-reviewed fund |
| Charts | Recharts or Visx | Line, bars, donut, heatmap, sparklines |
| Content | MDX with frontmatter | Each of us writes in Markdown |
| Validation | Schema check (e.g. Zod) run before build | Bad data blocks the deploy |
| Alerts | Email from the daily job on failure | Catches silent price-feed or Supabase problems |

## Risks and mitigations

The biggest risks are wrong numbers on the page, not downtime; most mitigations are ledger discipline and automatic checks.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missing dividends or fees in the ledger | NAV drifts from the broker; dividend payers look worse | Record every cash event; weekly reconciliation |
| UK-listed UCITS funds and GBP prices | Wrong NAV from currency mix | Reporting currency decided before launch; FX stored daily; feed symbol per ticker in `instruments.csv` |
| Typo in a CSV or frontmatter | Broken or misleading page | Pre-deploy validation: known tickers, valid dates, known voters, 25% cap, required fields; failed check = no deploy |
| Vercel free plan blocks deploys from collaborators' commits to a private repo | Only one person can publish | Public repo (no secrets in it), or one person merges; confirm current Vercel terms at setup |
| Supabase free project pauses after inactivity | Chart stops updating | Daily job keeps it active; job failures logged and emailed to the owner |
| Free price API rate limits or symbol gaps | Missing closes | Batch one request per day; fall back to previous close and flag it |
| Stock splits | Share counts wrong | Use broker share counts; split recorded as a ledger row |
| API keys leaked | Account abuse | Keys only in Vercel environment variables |
| Personal data exposed | Privacy | No broker screenshots or account numbers in the repo |
| Paper P&L mistaken for real | Misleading claims | Real default, amber paper accent, labels on every view |

## Milestones, acceptance criteria and open questions

Ship in four phases so a working tracker is live before any research is written.

**Phases**

1. **Foundation:** repo, Next.js app on Vercel, Supabase tables, daily price job, ledger parsing, validation checks.
2. **Home page (Real view):** top bar, hero tiles, performance chart, holdings table, winners/losers grid.
3. **Research and committee:** Research index and asset pages, teaser dropdowns, in-progress cards, bylines, votes and verdicts, Inside the Fund page.
4. **Paper and risk:** Paper and Combined views, paper book, allocation and risk section, 8-bit avatars and badges.

**Acceptance criteria**

- [ ] Site NAV matches the broker statement to within $0.05 after a week of trading.
- [ ] A new `.mdx` file merged on GitHub appears on the site with no code change.
- [ ] A malformed CSV row blocks the deploy and the previous version stays live.
- [ ] A fresh visit always lands on the Real view.
- [ ] Paper view never shows the real-capital label, and vice versa.
- [ ] Winners/losers grid falls back to one row with fewer than 6 positions.
- [ ] Daily job failure triggers an email within 24 hours.
- [ ] Every page is usable at 375 px wide.

**Open questions** (default to use until decided in brackets)

- [ ] Which asset split is final: the playbook's 14 instruments or the 6-per-person table? [seed both lists as sample data; keep `instruments.csv` editable]
- [ ] Reporting currency: USD or GBP? US-listed or UCITS versions? [USD, configurable in `meta.json`]
- [ ] Launch date (Day 7 of the playbook) for indexing to 100. [first trade date in `trades.csv`]
- [ ] Paper account size and `notional_slice` per contract. [initial margin; $10 slice]
- [ ] Which free price API, and does it cover every ticker we hold? [abstract behind one provider interface]
- [ ] Public or private repo?
- [ ] Names, bios and 8-bit faces for the three of us. [placeholders A, B, C]

## Appendix: candidate asset splits

**Option 1 — playbook (14 instruments):** A: MSFT, JPM, NEE, IEF, SPY options (paper). B: NVDA, JNJ, CAT, GLD, MES (paper). C: COST, XOM, LQD, WTI/MCL (paper). Benchmark SPY.

**Option 2 — 6 per person (each covers every asset type):**

| Type | Person A | Person B | Person C |
| --- | --- | --- | --- |
| Stock (DCF) | MSFT | NVDA | XOM |
| Stock (other method) | JPM (bank model) | NEE (dividend model) | JNJ (dividend model) |
| Bond | IEF | TIP | LQD |
| Commodity | CPER | GLD | USO |
| Futures (paper) | MHG | MGC | MCL |
| Options (paper) | Covered call on MSFT | Protective put on NVDA | Long call on XOM |
