import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { GuideForm } from "@/components/admin/guide-form";

export default async function NewGuidePage() {
  const actor = await requireActor();
  if (!can(actor.role, "guides", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/guides" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Guides
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New guide</h2>
      <GuideForm mode="create" initial={{ name: "", languages: [], contact: "", availabilityStatus: "AVAILABLE" }} />
    </div>
  );
}
