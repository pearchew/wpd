import { AssetForm } from "@/components/admin/AssetForm";
import { ASSETS_PREFIX } from "@/lib/admin/assets";
import { readFiles } from "@/lib/admin/change";
import { repoConfig } from "@/lib/admin/config";
import { listPulls } from "@/lib/admin/github";
import { requireSession } from "@/lib/admin/session";
import { addedRows, parseInstruments } from "@/lib/admin/trades";
import { toISO } from "@/lib/dates";
import { getFundData } from "@/lib/fund";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add asset" };

export default async function AddAsset() {
  await requireSession();
  const cfg = repoConfig();
  // New assets join the open asset change if there is one, so two changes never fight over instruments.csv.
  const open = cfg ? (await listPulls(cfg, ASSETS_PREFIX).catch(() => []))[0] : undefined;
  const [csv] = await readFiles(cfg, open?.branch, ["data/instruments.csv"]);
  const [baseCsv] = open ? await readFiles(cfg, undefined, ["data/instruments.csv"]) : [undefined];
  const instruments = parseInstruments(csv ?? "");
  const pending = open && baseCsv && csv ? addedRows(baseCsv, csv).map((l) => l.split(",")[0]) : [];

  const d = await getFundData();
  const priced = Object.entries(d.closes)
    .filter(([, s]) => s?.some((v) => v > 0))
    .map(([t]) => t);

  return (
    <AssetForm
      today={toISO(new Date())}
      instruments={instruments}
      priced={priced}
      pending={pending}
      openPr={open && { number: open.number, url: open.url }}
      connected={Boolean(cfg)}
    />
  );
}
