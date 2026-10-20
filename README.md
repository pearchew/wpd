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
| `/` | Home: view toggle (`?view=real\|combined\|paper`, default Real; hidden while there are no paper trades), hero tiles, fund vs SPY, our analysts |
| `/research` | Index: asset-class tabs, author filter (`?class=equities&author=A`), "Analysis in progress" cards |
| `/research/[ticker]` | One write-up: thesis, fair value, key outputs, price chart with fair-value line, MDX body, sell trigger, committee votes, Excel model |
| `/inside` | Inside the Fund: winners/losers, holdings, allocation and risk, research teaser (same `?view=` rule as Home) |
| `/fund` | Fund Rules: house rules, decision thresholds and the vote history, so a visitor can see how the fund works |
| `/admin` | Team admin (sign-in required): research, trade and vote forms that open pull requests. See [Team admin](#team-admin) |
| `/api/cron/daily` | Daily price job (Vercel cron, weekdays 21:30 UTC) |

## Where things live

> Collaborators: jump to [Updating the site](#updating-the-site-guide-for-collaborators) for the step-by-step guide.

Everything we write or decide is a file in this repo. Only market data goes in Supabase. Holdings are never stored: they are replayed from the ledger.

```
content/research/<ticker>.mdx   one write-up per asset (frontmatter + MDX body)
data/trades.csv                 every buy, sell, dividend, deposit, paper trade
data/votes.csv                  every committee vote
data/instruments.csv            ticker, name, class, currency, feed symbol, contract details
data/team.csv                   initials, name, bio, avatar, focuses
data/meta.json                  launch date, reporting currency, last reconciled, risk-free rate
public/models/                  Excel models for download
public/avatars/                 8-bit faces
```

Ledger conventions: `deposit`, `withdrawal` and `fee` rows carry the amount in the **price** column. `dividend` with no `shares` is a total amount; with `shares` it is per share. `split` puts the ratio in `shares`. A rebalance is sell rows plus buy rows; never edit or delete old rows. Paper trades use `book=paper` and set `notional_slice`, the dollars of the fund the position represents in the Combined view.

## Updating the site (guide for collaborators)

You never need to touch code to run the fund. Everything we decide is a plain file in this repo, and the site rebuilds itself whenever a change is merged.

### Which file do I edit?

| I want to… | Edit | Section |
| --- | --- | --- |
| Record a buy, sell, dividend, deposit, withdrawal, fee or split | `/admin` → Record trades (or `data/trades.csv`) | [Team admin](#team-admin), [Trades](#record-a-trade) |
| Track a new stock, ETF, future or option | `data/instruments.csv` | [New asset](#add-a-new-asset-to-the-site) |
| Write or update a research report | `/admin` on the site (or `content/research/<ticker>.mdx`) | [Team admin](#team-admin), [Reports](#write-or-update-a-research-report) |
| Upload an Excel model | `public/models/` | [Reports](#write-or-update-a-research-report) |
| Record a committee vote or a change of mind | `/admin` → Record vote (or `data/votes.csv`) | [Team admin](#team-admin), [Votes](#record-a-committee-vote) |
| Change a name, bio, focuses or pixel face | `data/team.csv`, `public/avatars/` | [Team](#change-the-team) |
| Mark the NAV as reconciled with the broker | `data/meta.json` | [Reconcile](#weekly-reconciliation) |
| Change the house rules or thresholds shown on Fund Rules | `app/fund/page.tsx` | [Rules](#change-the-house-rules-text) |

Anything else (layout, colours, new pages) is a code change. Ask the owner.

### How every change works

1. **Open the file on GitHub.** Go to the repo, browse to the file, and click the pencil icon (**Edit this file**). To add a new file use **Add file → Create new file**, and to upload one use **Add file → Upload files**.
2. **Make your edit** (details for each file below).
3. **Commit to a new branch.** Click **Commit changes…**, write a short message such as `Add NVDA buy`, choose **Create a new branch for this commit and start a pull request**, then **Propose changes**.
4. **Open the pull request.** Click **Create pull request**.
5. **Wait for the checks.** After a minute or two Vercel comments on the pull request:
   - ✅ **Ready** with a **Preview** link: open it and check your change looks right.
   - ❌ **Failed**: your data has a mistake. Click **Details** and read the build log. It says exactly what is wrong, for example `✗ trades.csv row 5: unknown ticker AMZN`. Fix it by editing the file again on the same branch; the check re-runs.
6. **Get a second pair of eyes.** For research reports, a teammate reads the preview and comments as a sceptic before merging.
7. **Ask the owner to merge** (see the caveat below). Within a couple of minutes of merging, the live site updates.

If a check fails, the live site is unaffected: the previous version stays up until a good change is merged.

### Caveat: only the owner merges (free Vercel plan)

We run on Vercel's free plan with a private repo. On that plan Vercel may refuse to deploy commits written by anyone other than the account owner, so a collaborator's change can pass its preview but never go live. To stay on the free plan:

- **Collaborators:** open a pull request as described above, but **do not merge it yourself**. Tell the owner it is ready.
- **The owner:** merges every pull request with **Create a merge commit**. Don't use "Squash and merge" or "Rebase and merge", which keep the collaborator as the commit's author and are the ones most likely to be blocked. A merge commit is authored by whoever clicks the button, which is the owner.
- **Owner, one-time setup:** on GitHub go to **Settings → General → Pull Requests** and untick *Allow squash merging* and *Allow rebase merging*, so the wrong option isn't offered. Also make sure your local git email is a GitHub-linked address (`git config user.email`), or your own commits can be blocked too.
- **Collaborators should not push straight to `main`** for the same reason; use pull requests.
- A collaborator's preview may show as blocked or awaiting authorisation for the same reason. If so, the owner can still review the change in GitHub's **Files changed** tab, and `npm run validate` locally runs the same data check as the preview.
- If a merged change still doesn't appear on the site, check **Deployments** in Vercel for a blocked entry and **Redeploy** it, or ask the maintainer.

> This setup hasn't been tested with a collaborator yet. The fixes if it doesn't work are to make the repo public, or upgrade Vercel to Pro and add collaborators to the team.

### Rules for the CSV files

- One row per line, commas between columns, **no spaces after commas**, no blank lines in the middle.
- Dates are `YYYY-MM-DD`. Numbers have no `$` signs or thousands separators.
- If a text field contains a comma, wrap that field in double quotes.
- Leave a column empty by writing nothing between the commas (`,,`). Keep the right number of commas on every row.
- **Never edit or delete old trade or vote rows.** The history is the point. To correct a mistake, add a new row that reverses it.

### Record a trade

The quickest way is **Record trades** in [Team admin](#team-admin). To edit the file by hand instead, open `data/trades.csv`. Add one row per broker fill at the bottom, using the **shares and price from the broker's confirmation**. The columns are:

```
date,book,ticker,action,shares,price,fees,currency,notional_slice,note
```

| Action | What to fill in | Example row |
| --- | --- | --- |
| Deposit | `ticker` = `CASH`, amount in the **price** column | `2026-10-20,real,CASH,deposit,,50,,USD,,Top-up` |
| Buy | shares, price per share, fees | `2026-10-20,real,JNJ,buy,0.1234,160.25,0,USD,,New position` |
| Sell | shares sold, price per share | `2026-10-27,real,NVDA,sell,0.05,230.10,0,USD,,Trim to 10%` |
| Dividend | amount received in the **price** column, shares empty | `2026-11-03,real,MSFT,dividend,,0.04,,USD,,Quarterly dividend` |
| Withdrawal | `ticker` = `CASH`, amount in **price** | `2026-11-10,real,CASH,withdrawal,,20,,USD,,Taking money out` |
| Fee | `ticker` = `CASH`, amount in **price** | `2026-11-10,real,CASH,fee,,0.50,,USD,,FX charge` |
| Stock split | the ratio in **shares** (2 for a 2-for-1) | `2026-12-01,real,NVDA,split,2,,,USD,,2-for-1 split` |

Things to know:

- **A rebalance is just sell rows plus buy rows.** Add both.
- **Cash can't go negative.** If you buy more than the cash on hand, add a deposit row first (same date or earlier). The check will fail otherwise.
- **You can't sell more than you hold.**
- **Record every cash event.** Missing dividends and fees are the usual reason the site's NAV drifts away from the broker's.
- **The ticker must already be in `data/instruments.csv`** and must have prices in the database. See the next section for a new asset.
- **No position above 25%** once the fund holds four or more positions. The check fails if one is over.
- **Paper trades** (futures and options, no real money) use `book` = `paper` and fill in `notional_slice`, the dollars of the fund the position stands in for in the Combined view. They need `kind`, `underlying`, `expiry` and margin details in `instruments.csv`. The Paper and Combined views appear automatically as soon as there is a paper row.

### Add a new asset to the site

The site needs a price history for every asset before you record a trade in it, otherwise the page will fail to load. Do it in this order:

1. **Add the instrument.** Open `data/instruments.csv` and add a row. For a normal stock or ETF, copy an existing row and change the first five columns:
   ```
   ticker,name,asset_class,currency,feed_symbol,kind,multiplier,underlying,underlying_scale,expiry,strike,option_type,margin,maint_margin
   JNJ,Johnson & Johnson,Equities,USD,JNJ,stock,1,,,,,,,
   ```
   - `asset_class` must be exactly one of `Equities`, `Fixed Income`, `Commodities`, `Derivatives`.
   - `feed_symbol` is the symbol the price provider uses (usually the ticker).
   - `kind` is `stock`, `etf`, `future` or `option`.
2. **Merge that pull request first**, then ask the **owner** to load the prices: they run `npm run db:backfill` on their machine, or click **Run** on the cron job in Vercel (Settings → Cron Jobs). The daily job picks up the new ticker automatically from then on.
3. **Then** open a second pull request with the trade (and the report).

### Write or update a research report

Each asset has one file: `content/research/<ticker>.mdx`, with the ticker in **lower case** (`msft.mdx`, `nvda.mdx`).

**To add a new report:** use **Add file → Create new file**, type the path `content/research/jnj.mdx` (typing the slashes creates the folders), and paste this template:

```
---
ticker: JNJ
name: Johnson & Johnson
assetClass: Equities
method: Two-stage DDM
status: in-progress
author: B
updated: 2026-10-20
fairValue: 182
thesis: One sentence on why we own it, shown on the site.
sellTrigger: Fair value reached, or a talc settlement above $15bn.
model: /models/jnj-ddm.xlsx
keyOutputs:
  - label: Sustainable growth
    value: 9.9%
---

## Valuation

Write the analysis here in plain text. Use a table for the assumptions:

| Assumption | Base case |
| --- | ---: |
| Cost of equity | 7.0% |
| Terminal growth | 3.0% |

## What the price implies

Reverse DCF or implied growth.

## Biggest risk

What would make us wrong.
```

What each field means:

| Field | Notes |
| --- | --- |
| `ticker` | Must be in `instruments.csv`, same letters as the file name. |
| `assetClass` | Must match the one in `instruments.csv`. |
| `method` | Free text, e.g. `DCF`, `Residual income / P/B`, `Two-stage DDM`, `Scorecard`. |
| `status` | `in-progress` shows a greyed "Analysis in progress" card on the Research page only. `published` shows it everywhere (Home, holdings table, Research). |
| `author` | The writer's initials, as in `data/team.csv` (`A`, `B` or `C`). A byline is per report. |
| `updated` | Change it to today's date whenever you edit the report. |
| `fairValue` | Your model's fair value per share. **Required to publish.** |
| `thesis` | One sentence, shown on cards and the asset page. |
| `sellTrigger` | **Required to publish.** Written when we buy, not after. |
| `model` | Optional link to the Excel file in `public/models/`. If set, the file must exist. |
| `keyOutputs` | Optional headline numbers for the method (up to four look best). |

**To update an existing report:** open the file, edit the text or numbers, bump `updated`, and follow the normal pull request flow.

**To upload the Excel model:** use **Add file → Upload files**, upload into `public/models/`, and set `model: /models/<file name>.xlsx` in the report.

**To publish:** change `status: in-progress` to `status: published` (with `fairValue` and `sellTrigger` filled in) and merge.

Tips for the report body:

- It is Markdown with `##` headings and `|` tables. Use `**bold**` and `-` bullet lists.
- ⚠️ **Do not type `<` or `{` `}` in the text.** The report format reads them as code and the build fails. Write "less than" instead of `<`, and avoid curly brackets.
- A fair value of any kind is only as good as the model behind it. Don't publish a number you can't defend.

### Team admin

The easiest way to write research is the form at **`/admin`** on the live site. Sign in with GitHub, then **Research report → New report**, or **Edit** next to an existing one.

- Fill in the asset, the call (fair value, thesis, sell trigger), any key outputs, and attach the Excel model.
- The write-up is a normal word-processor editor: bold, headings, lists and links from the toolbar. **⊞ Table** pastes cells copied from Excel or Google Sheets, inserts a blank table or a starter template, and shows + row / + column buttons while you're in a table. Number columns are right-aligned on the site automatically.
- The preview on the right (the **Preview** tab on a phone) shows how the page will look.
- **Save draft** opens a draft pull request that the whole team can read and comment on. **Submit for review** marks it ready for the owner. Saving again updates the same pull request.
- A ticker the site doesn't know yet (stocks and ETFs) is added to `instruments.csv` in the same pull request.
- Only one change per report at a time: **Edit** on a report that already has one open takes you to that one.

**Record trades** (`/admin/trades`): add one row per broker fill (date, action, asset, shares or a dollar amount, price, fees, note), then submit them together. The price starts at the latest close; replace it with the fill price from the broker. Before anything is sent, the form runs the same checks as the build (cash stays positive, no selling more than you hold, the 25% cap) and shows each holding and the cash before and after. While a trade change is waiting for the owner, new trades are added to that same pull request, so two changes never clash over `trades.csv`. Real-book stocks and ETFs only; paper derivatives still go in by hand.

**Record vote** (`/admin/votes`, or **Vote** next to a report on `/admin`): pick the asset, then Include, Watch or Reject and your conviction. You always vote as yourself: the voter and date come from your sign-in. The form shows each member's latest vote and the verdict now and with your vote, using the same rules as the site. Like trades, votes cast while a vote change is waiting are added to that same pull request.

**Owner setup (once):**

1. Create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps). Callback URL: `https://<your site>/api/auth/github/callback`.
2. Create a fine-grained personal access token for this repo only, with **Contents** and **Pull requests** set to read and write.
3. In Vercel → Settings → Environment Variables, set `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `ADMIN_SESSION_SECRET` (any long random string), `ADMIN_USERS` (e.g. `pearchew:A,friend1:B,friend2:C`), `GITHUB_TOKEN` and `GITHUB_REPO` (`owner/repo`). Redeploy.

Without these the form still opens, but saving only shows the file it would commit. Locally, `ADMIN_DEV_USER=A npm run dev` signs you in as A without GitHub.

### Record a committee vote

The quickest way is **Record vote** in [Team admin](#team-admin): each person casts their own. To edit the file by hand instead, open `data/votes.csv` and add **one row per voter**:

```
date,ticker,voter,vote,conviction,note
2026-10-20,JNJ,A,Include,High,Pipeline looks strong
2026-10-20,JNJ,B,Watch,Medium,Waiting for earnings
2026-10-20,JNJ,C,Include,Medium,
```

- `voter` is the person's initials from `data/team.csv`.
- `vote` is `Include`, `Watch` or `Reject`. `conviction` is `High`, `Medium` or `Low`.
- **A change of mind is a new row**, never an edit. Each person's **latest** vote counts, and older rows stay in the history.
- You can vote on an asset we don't hold yet; it just needs to be in `instruments.csv`.
- **How the verdict is decided:** `Include` needs 2 of the 3 latest votes, and the report's author voting `Include` alone never carries it (at least one other person has to agree). Two `Reject`s mean `Reject`. Everything else is `Watch`.

### Weekly reconciliation

Once a week, compare the site's NAV with the broker statement.

1. If they differ, find the missing row (usually a dividend, a fee or an FX charge) and add it to `data/trades.csv`.
2. When they match, open `data/meta.json` and set `"lastReconciled"` to today's date, e.g. `"lastReconciled": "2026-10-20"`. Until you do, the site doesn't show a "Reconciled with broker" date.

### Change the team

- **Name or bio:** edit the row in `data/team.csv` (`initials,name,bio,avatar,focuses`). The initials are used by every report and vote, so don't change them.
- **Focuses:** the tags on each analyst card on the home page. Separate them with `|`, e.g. `Hong Kong|US|Commodities`.
- **Pixel face:** upload a square image into `public/avatars/` (a 16×16 pixel drawing saved as SVG or PNG works best, e.g. from Piskel) and set the `avatar` column to `/avatars/<file name>`.

### Change the house rules text

The rules and thresholds on **Fund Rules** are written in `app/fund/page.tsx` (look for the `RULES` list near the top and the "Decision thresholds" text). Edit the wording there. Note that changing the text does not change what the checks enforce: the 25% cap, for example, also lives in `data/meta.json` (`maxPositionWeight`) and the vote logic is in code.

### Other settings in `data/meta.json`

| Field | What it does |
| --- | --- |
| `launchDate` | `null` means "the date of the first trade". Set a date to index the fund and SPY to 100 on that day instead. |
| `reportingCurrency` | The currency NAV is shown in (`USD`). |
| `riskFreeRate` | Used for the Sharpe ratio (`0.04` is 4%). |
| `benchmark` | The comparison ticker (`SPY`); it must be in `instruments.csv`. |
| `maxPositionWeight` | The position cap used by the checks (`0.25`). |

### What the site does by itself

- **Prices:** a daily job fetches the closing prices each weekday at 21:30 UTC (after the US close) and stores them in the database. Nobody needs to enter prices.
- **NAV, returns, charts, risk:** calculated from `data/trades.csv` and those prices. They change every day without any edit.
- **After a merge:** the site redeploys in a minute or two. Pages refresh their prices on their own.

### Troubleshooting

| What you see | Why | Fix |
| --- | --- | --- |
| The Vercel check fails with `unknown ticker` | The ticker isn't in `data/instruments.csv` | Add it first (see "Add a new asset") |
| `cash goes negative` | A buy is larger than the cash on hand | Add a deposit row, or reduce the buy |
| `sells more X than is held` | A sell exceeds the holding | Check the share count |
| `… over the 25% cap` | One position is too big | Reduce it, or check the numbers |
| `published research needs fairValue and sellTrigger` | Missing field | Fill both in, or set `status: in-progress` |
| `model file … does not exist` | The `model:` path doesn't match an uploaded file | Upload the file or fix the name |
| A report page errors or the build fails with no validation message | A `<` or `{` in the report text | Remove or reword it |
| The site shows an error for one ticker | No prices stored for it yet | Ask the owner to run the price backfill |
| NAV doesn't match the broker | A missing dividend, fee or FX charge | Add the row, then reconcile |

### Owner-only tasks

These need the secret keys, so they aren't part of the normal pull request flow:

- Vercel environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PRICE_API_KEY`, `CRON_SECRET`), set under Settings → Environment Variables. Never put them in the repo.
- Loading price history for new assets: `npm run db:backfill`.
- Checking the database and daily job: `npm run db:check`, or Vercel → Settings → Cron Jobs → **Run**.

### Running it on your own computer (optional)

```bash
git clone https://github.com/pearchew/wpd.git && cd wpd
npm install
npm run validate   # checks every data file, the same check Vercel runs
npm run dev        # http://localhost:3000
```

Without the secret keys the site shows made-up prices and an orange demo banner, which is fine for checking that your files parse and the pages render. It will not show real returns.

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
