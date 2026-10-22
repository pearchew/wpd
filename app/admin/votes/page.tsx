import { VoteForm } from "@/components/admin/VoteForm";
import { readFiles } from "@/lib/admin/change";
import { repoConfig } from "@/lib/admin/config";
import { listPulls } from "@/lib/admin/github";
import { requireSession } from "@/lib/admin/session";
import { addedRows, parseInstruments } from "@/lib/admin/trades";
import { VOTES_PREFIX, parseVotes } from "@/lib/admin/votes";
import { meta, researchDocs } from "@/lib/data";
import { getFundData } from "@/lib/fund";
import { getTeam } from "@/lib/team";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record vote" };

export default async function RecordVote({ searchParams }: { searchParams: Promise<{ ticker?: string }> }) {
  const session = await requireSession();
  const { ticker } = await searchParams;
  const cfg = repoConfig();
  // Votes join the open vote change if there is one, so two changes never fight over votes.csv.
  const open = cfg ? (await listPulls(cfg, VOTES_PREFIX).catch(() => []))[0] : undefined;
  const [votesCsv, instCsv] = await readFiles(cfg, open?.branch, ["data/votes.csv", "data/instruments.csv"]);
  const [baseVotes] = open ? await readFiles(cfg, undefined, ["data/votes.csv"]) : [undefined];

  const votes = parseVotes(votesCsv ?? "");
  const benchmark = meta().benchmark;
  const assets = parseInstruments(instCsv ?? "")
    .filter((i) => i.ticker !== benchmark)
    .map((i) => ({ ticker: i.ticker, name: i.name, assetClass: i.asset_class as string }));
  const pendingCount = open && baseVotes && votesCsv ? addedRows(baseVotes, votesCsv).length : 0;

  const d = await getFundData();
  const research = Object.fromEntries(
    researchDocs().map(({ front }) => {
      const series = d.closes[front.ticker];
      return [
        front.ticker,
        {
          author: front.author,
          status: front.status,
          thesis: front.thesis,
          view: front.status === "published" ? front.view : undefined,
          conviction: front.status === "published" ? front.conviction : undefined,
          strategy: front.strategy?.family,
          price: series?.[series.length - 1],
          currency: d.instruments.get(front.ticker)?.currency ?? d.meta.reportingCurrency,
        },
      ];
    }),
  );
  const held = [...d.real, ...d.paper].map((h) => h.ticker);

  return (
    <VoteForm
      me={session.initials}
      votes={votes}
      assets={assets}
      research={research}
      held={held}
      team={getTeam().map((t) => ({ initials: t.initials, name: t.name, avatar: t.avatar }))}
      initialTicker={ticker?.toUpperCase()}
      openPr={open && { number: open.number, url: open.url, pending: pendingCount }}
      connected={Boolean(cfg)}
    />
  );
}
