import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { HeroBannerForm } from "@/components/admin/hero-banner-form";
import { archiveHeroBanner, restoreHeroBanner } from "../actions";

/** Date → YYYY-MM-DD for a <input type="date">. */
function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditHeroBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "heroBanners", "view")) return <NoAccess />;

  const { id } = await params;
  const banner = await prisma.heroBanner.findUnique({
    where: { id },
    include: { translations: { where: { locale: "en" }, select: { headline: true, subheadline: true, ctaLabel: true } } },
  });
  if (!banner) notFound();

  const en = banner.translations[0];
  const headline = en?.headline ?? "Hero banner";

  return (
    <div>
      <Link href="/en/dashboard/hero-banners" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Hero banners
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink line-clamp-1">{headline}</h2>
        {can(actor.role, "heroBanners", "delete") ? (
          <ArchiveDialog
            id={banner.id}
            archived={Boolean(banner.archivedAt)}
            name={headline}
            entityLabel="banner"
            archiveAction={archiveHeroBanner}
            restoreAction={restoreHeroBanner}
            redirectTo="/en/dashboard/hero-banners"
          />
        ) : null}
      </div>
      <HeroBannerForm
        mode="edit"
        id={banner.id}
        initial={{
          headline: en?.headline ?? "",
          subheadline: en?.subheadline ?? "",
          ctaLabel: en?.ctaLabel ?? "",
          ctaUrl: banner.ctaUrl ?? "",
          imagePath: banner.imagePath,
          order: banner.order,
          enabled: banner.enabled,
          showSearch: banner.showSearch,
          startsAt: toDateInput(banner.startsAt),
          endsAt: toDateInput(banner.endsAt),
        }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="heroBanner" entityId={banner.id} />
      </div>
    </div>
  );
}
