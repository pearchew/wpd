# WDP Fund: ASCII wireframes

Low-fidelity layouts for the pages in the PRD: Home, Inside the Fund, Research (with the asset page), Fund Rules and the team admin. The numbers are sample data built from the playbook split (Option 1). The team uses the placeholder faces `[A] [B] [C]`.

Updated Oct 20, 2026: Home is trimmed to the hero, the chart and Our analysts; positions moved to Inside the Fund (`/inside`); the old Inside the Fund is now Fund Rules (`/fund`); the faces left the top bar; the team admin (`/admin`) is new.

Legend: `[A]` = 8-bit face · `♛` crown · `☠` skull · `┄` SPY / dashed line · `◆` trade marker · `┆┄┆` greyed "in progress" card · `▒` amber paper accent · `[☾]` theme toggle · `(•)` selected option

---

## 1. Home `/` (default `?view=real`)

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================

                                Fund performance
                          Real capital, $100 invested

                       [ Combined | ● Real | Paper only ]
 ──────────────────────────────────────────────────────────────────────────────
         NAV          SINCE INCEPTION          SPY             GAP VS SPY
       $103.42             +3.42%             +2.10%          ▲ +1.32 pts
 ──────────────────────────────────────────────────────────────────────────────
     As of Nov 13, 2026, US close  ·  Reconciled with broker: Nov 10, 2026


    PERFORMANCE  Fund vs SPY, indexed to 100 at launch   [ 1W | 1M | ● All ]
 ──────────────────────────────────────────────────────────────────────────────
 104 ┤
 103 ┤                                        ╭──╮    ╭───── Fund  103.4
 102 ┤                       ╭──╮    ╭────────╯  ╰────╯  ┄┄┄┄ SPY   102.1
 101 ┤            ╭───╮  ╭───╯  ╰────╯     ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
 100 ●────────────╯   ╰──╯  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  99 ┤ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
     └─────────────────────◆─────────────────────────◆────────────────────
     Oct 19              Oct 27                    Nov 6              Nov 13
                         ◆ rebalance               ◆ buy GLD


                                 OUR ANALYSTS
 ──────────────────────────────────────────────────────────────────────────────
 ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
 │          [A]           │ │          [B]           │ │          [C]           │
 │        Person A        │ │        Person B        │ │        Person C        │
 │ Likes cash-flow models │ │ Chases growth, then    │ │ Energy, staples and    │
 │ and slow, boring       │ │ argues about the       │ │ anything with a        │
 │ compounders.           │ │ discount rate.         │ │ margin call.           │
 │ [Hong Kong] [US]       │ │ [Indonesia] [US]       │ │ [Energy] [Staples]     │
 │ [Commodities]          │ │ [Index futures]        │ │ [Options]              │
 └────────────────────────┘ └────────────────────────┘ └────────────────────────┘
        Focus tags come from the `focuses` column in data/team.csv.

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

### Home and Inside the Fund: the other two toggle states

The toggle only appears once `data/trades.csv` has a `book=paper` row. It sits above the hero tiles on Home and under the title on Inside the Fund; the grid and table lines below apply to Inside the Fund.

```
    [ Combined | Real | ● Paper only ]   ▒▒ Paper trades, no real capital ▒▒
 ──────────────────────────────────────────────────────────── (amber accent) ──
      PAPER P&L       RETURN ON MARGIN    PEAK LEVERAGE     MARGIN-CALL DAYS
         −$35              −0.8%              13.8×                1
 ──────────────────────────────────────────────────────────────────────────────
     Chart: paper equity curve + one line per contract (MES, MCL, SPY put)
       Grid:  only 3 positions, so a single ranked row instead of 3 × 2:
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │ ♛ #1 MES    [B] │ │ #2 MCL      [C] │ │ ☠ #3 SPY P  [A] │
  │ +$425  +17% RoM │ │ −$230 −21% RoM  │ │ −$230 −27% prem │
  └─────────────────┘ └─────────────────┘ └─────────────────┘
      Table: notional, margin and Greeks instead of weight and fair value


   [ ● Combined | Real | Paper only ]   Includes paper derivatives, scaled to
 ──────────────────────────────────── position size ──────── (muted accent) ──
  NAV REAL + OVERLAY  SINCE INCEPTION          SPY             GAP VS SPY
       $103.97             +3.97%             +2.10%          ▲ +1.87 pts
 ──────────────────────────────────────────────────────────────────────────────
           Chart: ─── real (solid)   ╌╌╌ combined (dashed)   ┄┄┄ SPY
     "Futures scaled to a $10 slice each; options × shares actually held."
```

---

## 2. Inside the Fund `/inside`

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================

                               Inside the Fund
                What the fund owns and how each position is doing.
                       Real capital, $100 invested

                        WINNERS & LOSERS  since purchase
──────────────────────────────────────────────────────────────────────────────
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ ♛ #1 NVDA         [B] │  │ #2 GLD            [B] │  │ #3 MSFT           [A] │
│ Equities              │  │ Commodities           │  │ Equities              │
│ +12.7%    +$1.27      │  │ +9.3%     +$0.65      │  │ +5.4%     +$0.54      │
│ ▁▂▂▃▅▄▆▇              │  │ ▁▁▂▃▃▄▅▆              │  │ ▂▁▃▃▄▄▅▅              │
│ AI capex runway long  │  │ Hedge vs real rates   │  │ Azure growth > 30%    │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ ☠ #11 NEE         [A] │  │ #10 JPM           [A] │  │ #9 LQD            [C] │
│ Equities              │  │ Equities              │  │ Fixed Income          │
│ -5.9%     -$0.59      │  │ -3.8%     -$0.38      │  │ -2.4%     -$0.17      │
│ ▇▆▆▅▄▄▃▂              │  │ ▅▆▅▄▄▃▃▃              │  │ ▄▄▃▄▃▃▂▃              │
│ Rate-sensitive, wait  │  │ NII peaking           │  │                       │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
           (LQD has no published research, so its note line is empty)


                   HOLDINGS   rows link to /research/[ticker]
──────────────────────────────────────────────────────────────────────────────
TICKER CLASS         WEIGHT  VALUE   RETURN  BY   VERDICT   FAIR VALUE / PRICE
──────────────────────────────────────────────────────────────────────────────
NVDA   Equities      10.9%   $11.27  +12.7%  [B]  Include   $210 / $182  +15%
MSFT   Equities      10.2%   $10.55  +5.4%   [A]  Include   $625 / $540  +16%
XOM    Equities      10.1%   $10.45  +4.5%   [C]  Include   $128 / $110  +16%
COST   Equities       9.9%   $10.24  +2.4%   [C]  ·         Analysis in progress
CAT    Equities       9.8%   $10.14  +1.4%   [B]  Watch     $410 / $385   +6%
JNJ    Equities       9.5%    $9.83  -1.7%   [B]  Include   $182 / $158  +15%
JPM    Equities       9.3%    $9.62  -3.8%   [A]  Watch     $290 / $268   +8%
NEE    Equities       9.1%    $9.41  -5.9%   [A]  Include    $92 / $76   +21%
GLD    Commodities    7.4%    $7.65  +9.3%   [B]  Include   Scorecard 4/5
IEF    Fixed Income   6.8%    $7.03  +0.4%   [A]  Include   Yield 4.1% · dur 7.2
LQD    Fixed Income   6.6%    $6.83  -2.4%   [C]  ·         Analysis in progress
CASH   ·              0.4%    $0.40
──────────────────────────────────────────────────────────────────────────────
TOTAL                100.0%  $103.42 +3.42%


                               ALLOCATION & RISK
 ──────────────────────────────────────────────────────────────────────────────
  By asset class               Weight vs risk contribution
       ▄▄████▄▄                Equities     weight ███████████████▊   78.8%
     ██▀      ▀██                           risk   █████████████████▉ 89.5%
    ██  $103.42 ██             Fixed Inc.   weight ██▋                13.4%
     ██▄      ▄██                           risk   ▌                   2.8%
       ▀▀████▀▀                Commodities  weight █▍                  7.4%
  ■ Equities      78.8%                     risk   █▌                  7.7%
  ■ Fixed Income  13.4%
  ■ Commodities    7.4%
  □ Cash           0.4%

    Correlation (daily returns)     █ 1.0  ▓ >0.6  ▒ 0.3–0.6  ░ 0–0.3  · <0
             MSFT NVDA JPM  NEE  JNJ  CAT  COST XOM  IEF  LQD  GLD
      MSFT   ████
      NVDA   ▓▓▓▓ ████
      JPM    ▒▒▒▒ ░░░░ ████
      NEE    ░░░░ ░░░░ ▒▒▒▒ ████
      JNJ    ░░░░ ···· ░░░░ ▒▒▒▒ ████
      CAT    ▒▒▒▒ ▒▒▒▒ ▓▓▓▓ ░░░░ ░░░░ ████
      COST   ▒▒▒▒ ░░░░ ░░░░ ▒▒▒▒ ▒▒▒▒ ░░░░ ████
      XOM    ░░░░ ░░░░ ▒▒▒▒ ░░░░ ░░░░ ▒▒▒▒ ░░░░ ████
      IEF    ···· ···· ···· ▒▒▒▒ ░░░░ ···· ░░░░ ···· ████
      LQD    ░░░░ ░░░░ ░░░░ ▒▒▒▒ ░░░░ ░░░░ ░░░░ ···· ▓▓▓▓ ████
      GLD    ···· ···· ···· ░░░░ ░░░░ ···· ░░░░ ░░░░ ▒▒▒▒ ░░░░ ████

        SHARPE  1.42 (SPY 1.05)   DIVERSIFICATION BENEFIT  −4.7 pts vol
                   13.1% portfolio vs 17.8% weighted average


                           RESEARCH   All research →
 ──────────────────────────────────────────────────────────────────────────────
 ▾ Equities (8)
   NVDA  Data-centre demand outlasts capex    $210 / $182  Include   by [B]
   MSFT  Azure + Copilot keep margins rising  $625 / $540  Include   by [A]
   XOM   Low-cost barrels fund buybacks       $128 / $110  Include   by [C]
   NEE   Rate cuts re-rate the utility         $92 / $76   Include   by [A]
   JNJ   Pharma pipeline offsets talc risk    $182 / $158  Include   by [B]
   CAT   Infrastructure cycle mostly priced   $410 / $385  Watch     by [B]
   JPM   Best bank, but NII has peaked        $290 / $268  Watch     by [A]
   ┆ COST  ░░ Analysis in progress ░░                              by [C] ┆
 ▸ Fixed Income (2)
 ▸ Commodities (1)
 ▸ Derivatives · Paper (3)

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

---

## 3. Research index `/research`

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================
                                    Research
           Every position, the analysis behind it, and who wrote it.

                                ┌──────────────┐
    │ ● Equities 8 │  Fixed Income 2   Commodities 1   Derivatives · Paper 3
 ┘              └──────────────────────────────────────────────────────────────
 Author: ( All ) ( [A] ) ( [B] ) ( [C] )                  Sort: [ Updated ▾ ]

 ┌────────────────────────────────────┐  ┌────────────────────────────────────┐
 │ Microsoft                     MSFT │  │ NVIDIA                        NVDA │
 │ DCF                                │  │ DCF                                │
 │ Fair value $625 · price $540 +16%  │  │ Fair value $210 · price $182 +15%  │
 │ Verdict: Include                   │  │ Verdict: Include                   │
 │ [A] Person A · updated Nov 10      │  │ [B] Person B · updated Nov 8       │
 └────────────────────────────────────┘  └────────────────────────────────────┘
 ┌────────────────────────────────────┐  ┌────────────────────────────────────┐
 │ JPMorgan Chase                 JPM │  │ NextEra Energy                 NEE │
 │ Residual income / P/B              │  │ Two-stage DDM                      │
 │ Fair value $290 · price $268  +8%  │  │ Fair value $92 · price $76  +21%   │
 │ Verdict: Watch                     │  │ Verdict: Include                   │
 │ [A] Person A · updated Nov 5       │  │ [A] Person A · updated Oct 30      │
 └────────────────────────────────────┘  └────────────────────────────────────┘
 ┌────────────────────────────────────┐  ┌────────────────────────────────────┐
 │ Johnson & Johnson              JNJ │  │ Caterpillar                    CAT │
 │ Two-stage DDM                      │  │ DCF                                │
 │ Fair value $182 · price $158 +15%  │  │ Fair value $410 · price $385  +6%  │
 │ Verdict: Include                   │  │ Verdict: Watch                     │
 │ [B] Person B · updated Nov 1       │  │ [B] Person B · updated Oct 28      │
 └────────────────────────────────────┘  └────────────────────────────────────┘
 ┌────────────────────────────────────┐  ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
 │ Exxon Mobil                    XOM │  ┆ Costco                        COST ┆
 │ DCF                                │  ┆ DCF                                ┆
 │ Fair value $128 · price $110 +16%  │  ┆ ░░ Analysis in progress ░░         ┆
 │ Verdict: Include                   │  ┆ Price $1,012 · since buy +2.4%     ┆
 │ [C] Person C · updated Oct 12      │  ┆ [C] Person C · started Nov 2       ┆
 └────────────────────────────────────┘  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘

     /research?author=B lands here with Author = [B] preselected.
                At 375 px the cards stack into a single column.

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

## 3b. Asset page `/research/msft`

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================
                             ← Research / Equities

                                Microsoft (MSFT)
                                 Equities · DCF
      [A] Research by Person A · Updated Nov 10, 2026   [ ⬇ Excel model ]

                                     THESIS
 ──────────────────────────────────────────────────────────────────────────────
      Azure and Copilot keep cloud growth above 25%, so operating margins
                          keep expanding through 2030.

                                 VALUATION  DCF
 ──────────────────────────────────────────────────────────────────────────────
      FAIR VALUE           PRICE              UPSIDE            VERDICT
         $625               $540               +16%             Include

                                Key assumptions
              Revenue CAGR (5y)   14.0%     WACC              8.5%
              Op. margin (yr 5)   47.0%     Terminal growth   3.0%
                        Terminal value share of EV: 68%

               Sensitivity: fair value by WACC × terminal growth
                              2.5%     3.0%     3.5%
                     8.0%     $640     $672     $712
                     8.5%     $598    [$625]    $657
                     9.0%     $561     $585     $612

                             WHAT THE PRICE IMPLIES
 ──────────────────────────────────────────────────────────────────────────────
  Reverse DCF: $540 implies ~11% revenue CAGR for five years (we assume 14%).

                              RISK & SELL TRIGGER
──────────────────────────────────────────────────────────────────────────────
      Biggest risk   AI capex outruns monetisation; FCF margin compresses.
 Sell trigger   Fair value reached, or Azure growth below 20% for two quarters.

                              PRICE SINCE PURCHASE
 ──────────────────────────────────────────────────────────────────────────────
  $625 ┤┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ fair value $625
  $575 ┤
  $550 ┤                                    ╭───╮
  $540 ┤                          ╭──╮  ╭───╯   ╰───────● $540
  $525 ┤           ╭────╮   ╭─────╯  ╰──╯
  $512 ●───────────╯    ╰───╯
       Oct 19 (bought $512.40)                         Nov 13

                     COMMITTEE   Verdict: INCLUDE (3 of 3)
 ──────────────────────────────────────────────────────────────────────────────
  DATE     VOTER  VOTE      CONVICTION  NOTE
  Nov 9    [B]    Include   High        Copilot seat data changed my mind
  Oct 18   [A]    Include   High
  Oct 18   [B]    Watch     Medium      Waiting for Q1 earnings
  Oct 18   [C]    Include   Medium

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

---

## 4. Fund Rules `/fund`

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================

                                 Fund Rules
                      How the fund decides what to own.

          HOUSE RULES                           DECISION THRESHOLDS
   · No position above 25%               Include  fair value ≥ 15% above price
   · At least three asset classes                 (stocks), or lowers vol / raises
   · Include needs 2 of 3 votes; the              Sharpe at a 10% weight
     owner's vote alone never carries     Watch    0–15% upside
   · No trade under about $5              Reject   fair value below price, or the
   · Sell trigger written at entry                 risk case fails

                                Vote history
              Newest first. A change of mind is a new vote.
                  Asset: [ All ▾ ]  Voter: [ All ▾ ]  [ Filter ]
 ──────────────────────────────────────────────────────────────────────────────
     DATE      ASSET   VOTER   VOTE      CONVICTION   NOTE
 ──────────────────────────────────────────────────────────────────────────────
   Sep 28     JPM     [A]     Watch     Medium       Accepting the NII point
   Sep 14     MSFT    [B]     Include   High         Copilot seat data changed
   Aug 13     MCL     [B]     Reject    Medium       Margin calls
   ...
                         Show all 44 votes →

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

---

## 5. Team admin `/admin` (sign-in required)

Not linked from the public pages. Every save opens or updates a pull request; nothing goes live until the owner merges it.

### 5a. Admin home `/admin`

```
================================================================================
 WDP FUND        Home · Research · Inside the Fund · Fund Rules            [☾]
================================================================================
 Admin                                           Signed in as Person A (A)  Sign out
 ──────────────────────────────────────────────────────────────────────────────
                                    Admin
     Every change here becomes a pull request. The owner publishes it once the
                                checks pass.

 ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 │ Research report │ │ Record trades   │ │ Add asset       │ │ Record vote     │
 │ Write or update │ │ Buy, sell,      │ │ Stock, ETF,     │ │ Include, Watch  │
 │ a write-up      │ │ deposit, split… │ │ future, option  │ │ or Reject       │
 └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

                       Changes waiting to be published
      Drafts are visible to the whole team, so you can read and comment first.
 ──────────────────────────────────────────────────────────────────────────────
  CHANGE                                       STATE              UPDATED
  Research: JNJ, Johnson & Johnson (Person B)  Draft              Oct 20   Edit
  Trades: buy 0.1248 JNJ, deposit $50          Waiting for owner  Oct 20   Add trades
  Votes: C Reject on MSFT (High)               Waiting for owner  Oct 20   Add a vote

                    Published and in-progress reports  [ New report ]
 ──────────────────────────────────────────────────────────────────────────────
  TICKER  NAME       STATUS     AUTHOR    UPDATED
  MSFT    Microsoft  Published  Person A  Oct 14   Edit · Vote
  NVDA    NVIDIA     Published  Person B  Oct 14   Edit · Vote
```

Sign-in page (`/admin/sign-in`): title, one line, and **[ Sign in with GitHub ]**. Accounts outside `ADMIN_USERS` get "That GitHub account isn't on the team list."

### 5b. Research report `/admin/research/new` and `/admin/research/edit`

```
 Admin › Research › New report
 ┌─ 1. The asset ───────────────────────── ✓ ┐ ┌─ Preview ───────────────────────┐
 │ Ticker [ JNJ    ] ✓ known asset           │ │   JNJ · Johnson & Johnson       │
 │ Name   [ Johnson & Johnson ]  (autofill)  │ │   Equities · Two-stage DDM      │
 │ Class  [ Equities ▾ ]  Method [ DDM ▾ ]   │ │   [B] by Person B               │
 │ (unknown ticker → "Add JNJ to the asset   │ │   Fair value $182 · price $158  │
 │  list": type, currency, feed symbol)      │ │   Upside +15.2%                 │
 ├─ 2. The call ─────────────────────── ⚠ 1 ┤ │   "Steady dividends, a cheap…"  │
 │ (•) In progress   ( ) Published           │ │                                 │
 │ Fair value [ 182 ]                        │ │   ## Valuation                  │
 │   Latest close $158 → +15.2% · Clears the │ │   ┌──────────┬────────┐         │
 │   15% Include bar                         │ │   │ Scenario │ Growth │         │
 │ Thesis       [ One sentence…   ] 57 / 160 │ │   │ Bear     │   6.0% │         │
 │ Sell trigger [                 ]          │ │   └──────────┴────────┘         │
 ├─ 3. Key outputs (optional) ───────────────┤ │   ## What the price implies     │
 │ [ Sustainable growth ] [ 9.9% ]  ✕        │ │   ## Biggest risk               │
 │ + add output                              │ │   ┌ SELL TRIGGER ─────────────┐ │
 ├─ 4. Excel model (optional) ───────────────┤ │   │ Fair value reached, or …  │ │
 │ ┌ ─ Drop an .xlsx here or choose ─ ┐      │ │   └───────────────────────────┘ │
 ├─ 5. The write-up ─────────────────────────┤ │   📊 Download the model         │
 │ [B][I][H2][H3][• List][1. List][Link]     │ └─────────────────────────────────┘
 │ [⊞ Table ▾]  in a table: [+ row][+ column]│
 │                [− row][− column][Delete]  │   ⊞ Table ▾
 │  ## Valuation                             │   ┌──────────────────────────────┐
 │  The DDM uses a five-year high-growth…    │   │ Paste from Excel / Sheets    │
 │  ┌──────────┬────────┬────────────┐       │   │ Blank table (3 × 2)          │
 │  │ Scenario │ Growth │ Fair value │       │   │ Valuation assumptions        │
 │  │ Bear     │   6.0% │       $141 │       │   │ Scenario table (bear/base/   │
 │  └──────────┴────────┴────────────┘       │   │   bull)                      │
 └───────────────────────────────────────────┘   └──────────────────────────────┘
 ──────────────────────────────────────────────────────────────────────────────
  ✓ All required fields done                [ Save draft ] [ Submit for review → ]
```

- Paste dialog: a box to paste copied cells into, "First row is the header", a preview table, and [ Insert table ]. Number columns are right-aligned on the site automatically.
- Phone: an [ Edit | Preview ] tab bar replaces the side-by-side preview; the action bar stays pinned at the bottom.

### 5c. Record trades `/admin/trades`

```
 Admin › Record trades
                                Record trades
     One row per broker fill. A rebalance is sells plus buys: add them all,
                              then submit once.
 ┌─ New trade ─────────────────────────────┐  Trades to submit
 │ Date [ 2026-10-20 ]  Action [ Buy ▾ ]   │  DATE    ACTION   ASSET SHARES PRICE  CASH
 │ Use the shares and price from the       │  Oct 20  Deposit  CASH         $50.00 +$50.00 Edit ✕
 │ broker's confirmation.                  │  Oct 20  Buy      MSFT  0.048 $520.41 −$24.98 Edit ✕
 │ Asset [ MSFT · Microsoft ▾ ]            │  Oct 20  Sell     NVDA 0.2245 $190.00 +$42.66 Edit ✕
 │   Holding 0.0931 · latest close $520.41 │
 │ (•) Shares  ( ) Dollar amount           │  After these trades
 │ Shares [0.1234] Price [520.41] Fees [0] │  HOLDING  SHARES NOW  AFTER   WEIGHT AT COST
 │   Prefilled from the latest close: use  │  MSFT     0.0931      0.1411  52.6%
 │   the fill price                        │  NVDA     0.2245      sold    ·
 │ Note [ New position          ]          │  Cash     $0.01       $67.69  47.4%
 │ −$24.98 cash          [ + Add to list ] │  ✓ Passes the ledger checks: cash stays
 └─────────────────────────────────────────┘    positive, no oversells, 25% cap
 ──────────────────────────────────────────────────────────────────────────────
  3 trades · cash $0.01 → $67.69                          [ Submit for review → ]
```

- A failing check lists the reason in red (e.g. "cash goes negative (−2534.36)") and disables Submit.
- With a trade change already open, a note names it and the button reads [ Add to #N → ].

### 5d. Record vote `/admin/votes?ticker=MSFT`

```
 Admin › Record vote
                                 Record vote
   Your own vote only. A change of mind is a new vote; the old one stays.
 ┌─ Your vote ─────────────────────────────┐  The committee on MSFT
 │ Asset [ MSFT · Microsoft ▾ ]            │  MEMBER           LATEST VOTE         CONV.  DATE
 │ ┃ Microsoft · Equities · held           │  [A] Person A (author)  Include       High   Oct 12
 │ ┃ "Cloud and AI monetisation…"          │  [B] Person B           Watch         Medium Oct 12
 │ ┃ Published · by Person A · fair value  │  [C] Person C (you)     Include → Reject  High  today
 │ ┃ $615 · price $520.41 · +18.2% upside  │  ┌──────────────────────────────────────┐
 │ ┃ Read the write-up ↗                   │  │ VERDICT NOW  →  WITH YOUR VOTE       │
 │ Vote       [ Include | Watch |█Reject█] │  │   Include          Watch             │
 │ Conviction [█High█ | Medium | Low ]     │  └──────────────────────────────────────┘
 │ Note [ Capex is running ahead…  ]       │  Include needs 2 of the 3 latest votes, and
 └─────────────────────────────────────────┘  the author's Include alone never carries it.
 ──────────────────────────────────────────────────────────────────────────────
  C · Reject · High on MSFT                                       [ Cast vote → ]
```

- Hints under the vote: the author's own Include can't carry it alone; a vote identical to your last one is recorded again with today's date.

### 5e. Add asset `/admin/assets`

```
 Admin › Add asset
 ┌─ New asset ─────────────────────────────┐  Row to be added
 │ Type [ Stock | ETF | Future |█Option█ ] │  ┌──────────────────────────────────┐
 │ Futures and options are paper trades    │  │ ticker,name,asset_class,…        │
 │ only.                                   │  │ NVDA261120C200,NVDA Nov 20 2026  │
 │ Underlying [ NVDA ▾ ]  Expiry [11/20/26]│  │ 200 call,Derivatives,USD,…  ⇆    │
 │ Call or put [█Call█ | Put ]             │  └──────────────────────────────────┘
 │ Strike [ 200 ]  Shares/contract [ 100 ] │  What happens next
 │ ┌ TICKER ──────────── FEED SYMBOL (OCC) │  1. The owner merges the pull request.
 │ │ NVDA261120C200      NVDA261120C0020…  │  2. The owner loads its price history
 │ Name [ NVDA Nov 20 2026 200 call ]      │     (npm run db:backfill).
 │ Currency [ USD ]                        │  3. Then it can be traded.
 └─────────────────────────────────────────┘  ▸ Assets already listed (3)
 ──────────────────────────────────────────────────────────────────────────────
  Option · NVDA261120C200                                        [ Add asset → ]
```

- Stock / ETF: ticker, name, asset class (not Derivatives), feed symbol.
- Future: ticker, name, underlying, underlying scale (MES on SPY = 10), $ per point, expiry, initial and maintenance margin, feed symbol (e.g. `MES=F`).
- A ticker already on the list is flagged as soon as it's typed.

### 5f. Delete `/admin/delete`

```
 Admin › Delete
 [ Assets 1 | Reports | Trades | Votes ]        Will be deleted
 ─────────────────────────────────────────      · Asset MSFT
  ☑ MSFT · Microsoft   stock  1 trade ·         · The MSFT report (with MSFT)
                              3 votes · report  · Trade 2026-10-14,real,MSFT,buy,… (with MSFT)
  ☐ NVDA · NVIDIA      stock  1 trade · …       · Vote 2026-10-12,MSFT,A,Include,… (with MSFT)
  ☐ SPY (benchmark, can't be deleted)           · File content/research/msft.mdx
                                                ✓ What's left still passes the site's checks
  On the Trades and Votes tabs, rows taken by   Why (optional) [ Entered on the wrong date ]
  a deleted asset show struck through,          ☐ I understand these come off the site once
  "with MSFT", and can't be unticked alone.        the pull request is merged
 ──────────────────────────────────────────────────────────────────────────────
  Deleting 1 asset(s), 1 report(s), 1 trade(s), 3 vote(s)   [ Open delete pull request → ]
```

- Removing a row the ledger depends on (e.g. the starting deposit) shows "cash goes negative" in red and disables the button.

---

## Phone width (375 px), Home top

```
                      ┌─────────────────────────────────┐
                      │ WDP FUND                    [☾] │
                      │ Home  Research  Inside   Fund   │
                      │                 the Fund Rules  │
                      ├─────────────────────────────────┤
                      │ Fund performance                │
                      │ Real capital, $100 invested     │
                      │ ─────────────────────────────── │
                      │ NAV $103.42     +3.42%          │
                      │ SPY +2.10%      ▲ +1.32 pts     │
                      │ As of Nov 13 · Reconciled Nov 10│
                      │ ─────────────────────────────── │
                      │ [chart, full width]             │
                      │ ─────────────────────────────── │
                      │ Our analysts: one card per row  │
                      └─────────────────────────────────┘
      On Inside the Fund: winners/losers 2 cols × 3 rows; holdings table
      scrolls ⇆ inside its own box. On admin forms the preview and the
      review panel stack under the form.
```
