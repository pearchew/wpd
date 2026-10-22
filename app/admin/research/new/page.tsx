import { ReportForm } from "@/components/admin/ReportForm";
import { repoConfig } from "@/lib/admin/config";
import { formContext } from "@/lib/admin/load";
import { emptyDraft, starterBody } from "@/lib/admin/report";
import { requireSession } from "@/lib/admin/session";
import { toISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "New report" };

export default async function NewReport() {
  const s = await requireSession();
  const cfg = repoConfig();
  return (
    <ReportForm
      initial={emptyDraft(s.initials, toISO(new Date()))}
      body={starterBody()}
      isNew
      ctx={await formContext(cfg)}
      connected={Boolean(cfg)}
    />
  );
}
