# WDP Fund: ASCII wireframes

Low-fidelity layouts for the three pages in the PRD: Home, Research (with the asset page) and Inside the Fund. The numbers are sample data built from the playbook split (Option 1). The team uses the placeholder faces `[A] [B] [C]`.

Legend: `[A]` = 8-bit face · `♛` crown · `☠` skull · `┄` SPY / dashed line · `◆` trade marker · `┆┄┆` greyed "in progress" card · `▒` amber paper accent

---

## 1. Home `/` (default `?view=real`)

```
================================================================================
 WDP FUND              Home · Research · Inside the Fund            [A] [B] [C]
================================================================================
                                                       hover [B] ┌────────────┐
                                                                 │ Person B   │
                                                                 │ NVDA · JNJ │
                                                                 │ CAT · GLD  │
                                                                 │ MES (paper)│
                                                                 └────────────┘

                                    WDP Fund
                       Conviction backed by fundamentals.

        [ Combined | ● Real | Paper only ]   Real capital, $100 invested
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

### Home: how the other two toggle states change the top of the page

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

## 2. Research index `/research`

```
================================================================================
 WDP FUND              Home · Research · Inside the Fund            [A] [B] [C]
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

     Clicking [B] in the top bar lands here with Author = [B] preselected.
                At 375 px the cards stack into a single column.

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

## 2b. Asset page `/research/msft`

```
================================================================================
 WDP FUND              Home · Research · Inside the Fund            [A] [B] [C]
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

## 3. Inside the Fund `/fund`

```
================================================================================
 WDP FUND              Home · Research · Inside the Fund            [A] [B] [C]
================================================================================
                                Inside the Fund
  How the fund is run: the paper book, the committee's decisions and the team.

▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▒ PAPER BOOK · Paper — not real capital                        (amber accent) ▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒

    Account $4,440 (initial margin + premium)  ·  Equity $4,405  ·  P&L −$35
    $4,600 ┤               ╭──╮
    $4,500 ┤        ╭──────╯  ╰──╮
    $4,440 ●────────╯            ╰────╮          ╭─────╮
    $4,400 ┤                          ╰──────────╯     ╰────● $4,405
           Oct 20                   ▲ Nov 4 margin call              Nov 13

  ┌─ MES · Micro E-mini S&P 500 · long 1 ─────────────────────────── [B] B ──
  │ Entry 6,820   Mark 6,905   P&L +$425   Return on margin +17.0%
  │ Notional $34,525   Leverage 13.8×   Basis +12 pts
  │ Roll yield −0.4% (contango)   Margin-call days: none
  │
  ┌─ MCL · Micro WTI crude · long 1 ──────────────────────────────── [C] C ──
  │ Entry $71.20   Mark $68.90   P&L −$230   Return on margin −20.9%
  │ Notional $6,890   Leverage 6.3×   Basis −$0.35
  │ Roll yield +0.9%/mo (backwardation)   Margin-call days: Nov 4
  │
  ┌─ SPY Dec 19 600 put · long 1 ─────────────────────────────────── [A] A ──
  │ Premium $8.40   Mark $6.10   P&L −$230   Return on premium −27.4%
  │ Black-Scholes $6.45 vs market $6.10   Implied vol 15.2%
  │ Today's move −$23  =  Δ −$18   Θ −$9   Vega +$4
  │


                              INVESTMENT COMMITTEE
 ──────────────────────────────────────────────────────────────────────────────
  HOUSE RULES
  · No position above 25%            · At least three asset classes
  · Include needs 2 of 3 votes; the owner's vote alone never carries it
  · No trade under about $5          · Sell trigger written at entry

     DECISION THRESHOLDS
     Include  fair value ≥ 15% above price (stocks), or lowers vol / raises
              Sharpe at a 10% weight (bonds, gold)
     Watch    0–15% upside
     Reject   fair value below price, or the risk case fails

 VOTE HISTORY  newest first                  Asset: [ All ▾ ]  Voter: [ All ▾ ]
 DATE     ASSET  VOTER  VOTE      CONVICTION  NOTE
 Nov 9    MSFT   [B]    Include   High        Copilot seat data changed my mind
 Nov 2    COST   [C]    Watch     Low         Model not finished
 Oct 25   JPM    [A]    Watch     Medium      NII has peaked
 Oct 18   XOM    [A]    Include   High
 Oct 18   XOM    [B]    Watch     Medium      Waiting for Q3 earnings
 Oct 18   XOM    [C]    Include   High
 ...                                                            Show all 42 →

    WEEKLY CHECK-INS
    ▸ Week 4 · Nov 10   NAV reconciled to broker; added missing JNJ dividend
    ▸ Week 3 · Nov 3    MCL margin call (paper); GLD bought at 7.4%
    ▸ Week 2 · Oct 27   Rebalance: trimmed NVDA back to 11%
    ▸ Week 1 · Oct 20   Launch, $100 deployed across 11 holdings
    ┆ Month-one post-mortem: coming Nov 19 ┆


                                    THE TEAM
 ──────────────────────────────────────────────────────────────────────────────
    ████████                  ████████                  ▄▄▄▄▄▄▄▄
   █▀▀▀▀▀▀▀▀█                █▀▀▀▀▀▀▀▀█                ██████████
   █ ■    ■ █                █[■]─[■] █                █ ■    ■ █
   █   ▄▄   █                █   ▄▄   █                █    ▄   █
   █  ▀▀▀▀  █                █   ──   █                █  ╰──╯  █
    ▀▀▀▀▀▀▀▀                  ▀▀▀▀▀▀▀▀                  ▀▀▀▀▀▀▀▀

   Person A                  Person B                  Person C
   Short bio placeholder,    Short bio placeholder,    Short bio placeholder,
   one or two lines.         one or two lines.         one or two lines.
   Research: MSFT · JPM ·    Research: NVDA · JNJ ·    Research: COST · XOM ·
   NEE · IEF · SPY put       CAT · GLD · MES           LQD · MCL

================================================================================
 The WDP Fund is a student learning exercise, not investment advice.
================================================================================
```

---

## Phone width (375 px), Home top

```
                      ┌─────────────────────────────────┐
                      │ WDP FUND            [A][B][C] ≡ │
                      ├─────────────────────────────────┤
                      │ Conviction backed by            │
                      │ fundamentals.                   │
                      │                                 │
                      │ [Combined|● Real|Paper]         │
                      │ Real capital, $100 invested     │
                      │ ─────────────────────────────── │
                      │ NAV $103.42     +3.42%          │
                      │ SPY +2.10%      ▲ +1.32 pts     │
                      │ As of Nov 13 · Reconciled Nov 10│
                      │ ─────────────────────────────── │
                      │ [chart, full width]             │
                      │ ─────────────────────────────── │
                      │ Winners/losers: 2 cols × 3 rows │
                      │ Holdings: table scrolls ⇆       │
                      └─────────────────────────────────┘
```
