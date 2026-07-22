import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { DestinationForm } from "@/components/admin/destination-form";

export default async function NewDestinationPage() {
  const actor = await requireActor();
  if (!can(actor.role, "destinations", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/destinations" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Destinations
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New destination</h2>
      <DestinationForm
        mode="create"
        initial={{ name: "", slug: "", description: "", heroImagePath: null, order: 0, featured: false, seoTitle: "", metaDescription: "" }}
      />
    </div>
  );
}
