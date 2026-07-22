import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { FaqForm } from "@/components/admin/faq-form";

export default async function NewFaqPage() {
  const actor = await requireActor();
  if (!can(actor.role, "faqs", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/faq" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> FAQ
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New question</h2>
      <FaqForm mode="create" initial={{ question: "", answer: "", order: 0 }} />
    </div>
  );
}
