import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { TourEditor } from "@/components/admin/tour-editor";
import { getOfferedCurrencies } from "@/lib/admin/currencies";
import { archiveTour, restoreTour } from "../actions";

/** Date → YYYY-MM-DD for a <input type="date">. */
function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "tours", "view")) return <NoAccess />;

  const { id } = await params;
  const [tour, cats, dests, currencies] = await Promise.all([
    prisma.tour.findUnique({
      where: { id },
      include: {
        translations: { where: { locale: "en" } },
        images: { orderBy: { sortOrder: "asc" } },
        faqs: {
          where: { archivedAt: null },
          orderBy: { order: "asc" },
          include: { translations: { where: { locale: "en" }, select: { question: true, answer: true } } },
        },
      },
    }),
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" }, include: { translations: { where: { locale: "en" }, select: { name: true } } } }),
    prisma.destination.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" }, include: { translations: { where: { locale: "en" }, select: { name: true } } } }),
    getOfferedCurrencies(),
  ]);
  if (!tour) notFound();

  const en = tour.translations[0];
  const title = en?.title ?? tour.slug;
  const status: "ACTIVE" | "DISABLED" = tour.status === "ACTIVE" ? "ACTIVE" : "DISABLED";

  return (
    <div>
      <Link href="/en/dashboard/tours" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Tours
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink line-clamp-1">{title}</h2>
        {can(actor.role, "tours", "delete") ? (
          <ArchiveDialog id={tour.id} archived={Boolean(tour.archivedAt)} name={title} entityLabel="tour" archiveAction={archiveTour} restoreAction={restoreTour} redirectTo="/en/dashboard/tours" />
        ) : null}
      </div>

      <TourEditor
        mode="edit"
        id={tour.id}
        categories={cats.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug }))}
        destinations={dests.map((d) => ({ id: d.id, name: d.translations[0]?.name ?? d.slug }))}
        currencies={currencies}
        images={tour.images.map((img) => ({ id: img.id, path: img.path, alt: img.alt }))}
        faqs={tour.faqs.map((f) => ({
          id: f.id,
          question: f.translations[0]?.question ?? "",
          answer: f.translations[0]?.answer ?? "",
        }))}
        initial={{
          title: en?.title ?? "",
          slug: tour.slug,
          categoryId: tour.categoryId ?? "",
          destinationId: tour.destinationId ?? "",
          tourType: tour.tourType,
          durationDays: tour.durationDays,
          basePrice: Number(tour.basePrice),
          currency: tour.currency,
          discountType: tour.discountType ?? "",
          discountValue: tour.discountValue == null ? null : Number(tour.discountValue),
          discountStartsAt: toDateInput(tour.discountStartsAt),
          discountEndsAt: toDateInput(tour.discountEndsAt),
          pickupType: tour.pickupType ?? "",
          cancellationPolicy: tour.cancellationPolicy ?? "",
          guideLanguages: tour.guideLanguages,
          familyFriendly: tour.familyFriendly,
          coupleFriendly: tour.coupleFriendly,
          soloFriendly: tour.soloFriendly,
          featured: tour.featured,
          popularityScore: tour.popularityScore,
          status,
          overview: en?.overview ?? "",
          itinerary: en?.itinerary ?? "",
          highlights: en?.highlights ?? [],
          included: en?.included ?? [],
          excluded: en?.excluded ?? [],
          customFacts: en?.customFacts ?? [],
          seoTitle: en?.seoTitle ?? "",
          metaDescription: en?.metaDescription ?? "",
          ogImagePath: en?.ogImagePath ?? null,
        }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="tour" entityId={tour.id} />
      </div>
    </div>
  );
}
