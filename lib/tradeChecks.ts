import type { Instrument, Meta, Trade } from "./schemas";

export interface LedgerCheck {
  errors: string[];
  /** Real-book cash after every row */
  cash: number;
  /** Real-book shares held, by ticker (positive only) */
  held: Record<string, number>;
  /** Real-book cost basis, by ticker */
  cost: Record<string, number>;
}

/**
 * The ledger rules `npm run validate` enforces on data/trades.csv, as a pure function so the
 * trade form can run the same checks before anything is committed. `rowOf(i)` names row i in messages.
 */
export function checkLedger(
  ledger: Trade[],
  inst: Instrument[],
  m: Pick<Meta, "maxPositionWeight">,
  rowOf: (i: number) => string = (i) => `trades.csv row ${i + 2}`,
): LedgerCheck {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(msg);
  const known = new Set(inst.map((i) => i.ticker));
  const qty = new Map<string, number>();
  const cost = new Map<string, number>();
  let cash = 0;
  const ordered = ledger.map((t, i) => ({ t, i })).sort((a, b) => a.t.date.localeCompare(b.t.date) || a.i - b.i);

  for (const { t, i: idx } of ordered) {
    const at = rowOf(idx);
    const cashRow = ["deposit", "withdrawal", "fee"].includes(t.action);
    if (!cashRow && !known.has(t.ticker)) fail(`${at}: unknown ticker ${t.ticker}`);
    if (cashRow && !(t.price && t.price > 0)) fail(`${at}: ${t.action} needs the amount in the price column`);
    if (["buy", "sell"].includes(t.action) && !(t.shares && t.shares > 0 && t.price && t.price > 0)) {
      fail(`${at}: ${t.action} needs positive shares and price`);
    }
    if (t.action === "split" && !(t.shares && t.shares > 0)) fail(`${at}: split needs the ratio in the shares column`);

    const i = inst.find((x) => x.ticker === t.ticker);
    if (t.book === "real" && i && (i.kind === "future" || i.kind === "option")) {
      fail(`${at}: ${t.ticker} is a derivative, so it must be a paper trade`);
    }
    if (t.book === "paper" && t.action === "buy" && i) {
      const hasSlice = !!t.notional_slice;
      const hasUnderlying = i.kind === "option" && i.underlying;
      if (!hasSlice && !hasUnderlying) fail(`${at}: paper buy needs notional_slice for the Combined view`);
    }

    const key = `${t.book}:${t.ticker}`;
    const sign = t.action === "buy" ? 1 : t.action === "sell" ? -1 : 0;
    if (sign) {
      const q = (qty.get(key) ?? 0) + sign * (t.shares ?? 0);
      if (t.book === "real" && q < -1e-9) fail(`${at}: sells more ${t.ticker} than is held`);
      qty.set(key, q);
      cost.set(key, (cost.get(key) ?? 0) + sign * (t.shares ?? 0) * (t.price ?? 0));
      if (t.book === "real") cash += -sign * (t.shares ?? 0) * (t.price ?? 0) - t.fees;
    }
    if (t.action === "split" && t.shares) qty.set(key, (qty.get(key) ?? 0) * t.shares);
    if (t.book === "real") {
      if (t.action === "deposit") cash += t.price ?? 0;
      if (t.action === "withdrawal" || t.action === "fee") cash -= t.price ?? 0;
      if (t.action === "dividend") cash += t.shares ? t.shares * (t.price ?? 0) : (t.price ?? 0);
    }
  }
  if (cash < -0.005) fail(`trades.csv: cash goes negative (${cash.toFixed(2)}); a deposit or sale is missing`);

  // 25% cap, measured on cost basis so validation never depends on the price feed
  const realKeys = [...qty.keys()].filter((k) => k.startsWith("real:") && (qty.get(k) ?? 0) > 1e-9);
  const capApplies = realKeys.length >= 4; // a cap is meaningless with fewer than four holdings
  const invested = realKeys.reduce((s, k) => s + (cost.get(k) ?? 0), 0);
  const total = invested + Math.max(cash, 0);
  for (const k of realKeys) {
    const w = (cost.get(k) ?? 0) / total;
    if (capApplies && w > m.maxPositionWeight) {
      fail(`${k.slice(5)} is ${(w * 100).toFixed(1)}% of the fund at cost, over the ${(m.maxPositionWeight * 100).toFixed(0)}% cap`);
    }
  }

  return {
    errors,
    cash,
    held: Object.fromEntries(realKeys.map((k) => [k.slice(5), qty.get(k)!])),
    cost: Object.fromEntries(realKeys.map((k) => [k.slice(5), cost.get(k)!])),
  };
}
