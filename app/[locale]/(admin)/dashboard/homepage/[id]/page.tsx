import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { HomepageSectionForm } from "@/components/admin/homepage-section-form";

export default async function EditHomepageSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "homepage", "edit")) return <NoAccess />;

  const { id } = await params;
  const section = await prisma.homepageSection.findUnique({
    where: { id },
    include: { translations: { where: { locale: "en" }, select: { heading: true, body: true, ctaLabel: true } } },
  });
  if (!section) notFound();

  const en = section.translations[0];

  return (
    <div>
      <Link href="/en/dashboard/homepage" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Homepage
      </Link>
      <h2 className="mb-1 font-serif text-2xl font-semibold text-ink">Edit section</h2>
      <p className="mb-5 font-mono text-[12px] text-faint">{section.key}</p>
      <HomepageSectionForm
        id={section.id}
        initial={{
          heading: en?.heading ?? "",
          body: en?.body ?? "",
          ctaLabel: en?.ctaLabel ?? "",
          enabled: section.enabled,
        }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="homepage" entityId={section.id} />
      </div>
    </div>
  );
}
