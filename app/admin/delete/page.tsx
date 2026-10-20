import { DeleteForm } from "@/components/admin/DeleteForm";
import { repoConfig } from "@/lib/admin/config";
import { deleteSources } from "@/lib/admin/deleteSources";
import { DELETE_PREFIX } from "@/lib/admin/deletions";
import { listPulls } from "@/lib/admin/github";
import { requireSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delete" };

type Tab = "assets" | "reports" | "trades" | "votes";

export default async function Delete({ searchParams }: { searchParams: Promise<{ tab?: string; asset?: string; report?: string }> }) {
  await requireSession();
  const sp = await searchParams;
  const cfg = repoConfig();
  // Deletions join the open delete change if there is one, so two changes never fight over the same files.
  const open = cfg ? (await listPulls(cfg, DELETE_PREFIX).catch(() => []))[0] : undefined;
  const sources = await deleteSources(cfg, open?.branch);
  if (!sources) {
    return (
      <main className="page">
        <p className="admin-error">Couldn&apos;t read the data files.</p>
      </main>
    );
  }
  const tab: Tab = (["assets", "reports", "trades", "votes"] as const).find((t) => t === sp.tab) ?? (sp.report ? "reports" : "assets");
  return (
    <DeleteForm
      sources={sources}
      initialTab={tab}
      preselect={{ asset: sp.asset?.toUpperCase(), report: sp.report?.toLowerCase() }}
      openPr={open && { number: open.number, url: open.url }}
      connected={Boolean(cfg)}
    />
  );
}
