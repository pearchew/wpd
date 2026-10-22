import { TradeForm } from "@/components/admin/TradeForm";
import { repoConfig } from "@/lib/admin/config";
import { listPulls, readFile } from "@/lib/admin/github";
import { localFile } from "@/lib/admin/load";
import { requireSession } from "@/lib/admin/session";
import { TRADES_PREFIX, addedRows, parseInstruments, parseTrades } from "@/lib/admin/trades";
import { meta } from "@/lib/data";
import { toISO } from "@/lib/dates";
import { getFundData } from "@/lib/fund";
import { getPriceBook } from "@/lib/prices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record trades" };

export default async function RecordTrades() {
  await requireSession();
  const cfg = repoConfig();
  // New trades join the open trade change if there is one, so two changes never fight over trades.csv.
  const open = cfg ? (await listPulls(cfg, TRADES_PREFIX).catch(() => []))[0] : undefined;
  const ref = open?.branch ?? cfg?.base;
  const [tradesCsv, instCsv, baseCsv] = cfg
    ? await Promise.all([
        readFile(cfg, "data/trades.csv", ref!),
        readFile(cfg, "data/instruments.csv", ref!),
        open ? readFile(cfg, "data/trades.csv", cfg.base) : undefined,
      ])
    : [localFile("data/trades.csv"), localFile("data/instruments.csv"), undefined];

  const trades = parseTrades(tradesCsv ?? "");
  const instruments = parseInstruments(instCsv ?? "");
  const pendingLines = open && baseCsv && tradesCsv ? addedRows(baseCsv, tradesCsv) : [];
  const header = (tradesCsv ?? "").split("\n")[0];
  const pending = pendingLines.length ? parseTrades(`${header}\n${pendingLines.join("\n")}`) : [];

  const d = await getFundData();
  const book = await getPriceBook();
  const prices: Record<string, number> = {};
  for (const [t, series] of Object.entries(d.closes)) {
    const last = series?.[series.length - 1];
    if (last) prices[t] = last;
  }

  return (
    <TradeForm
      today={toISO(new Date())}
      trades={trades}
      pending={pending}
      instruments={instruments.filter((i) => i.ticker !== meta().benchmark || trades.some((t) => t.ticker === i.ticker))}
      prices={prices}
      fx={{ dates: book.dates, fx: book.fx }}
      reportingCurrency={meta().reportingCurrency}
      maxWeight={meta().maxPositionWeight}
      openPr={open && { number: open.number, url: open.url }}
      connected={Boolean(cfg)}
    />
  );
}
