import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { ReviewForm } from "@/components/admin/review-form";
import { archiveReview, restoreReview } from "../actions";

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "reviews", "view")) return <NoAccess />;

  const { id } = await params;
  const [review, tours] = await Promise.all([
    prisma.review.findUnique({ where: { id } }),
    prisma.tour.findMany({
      where: { archivedAt: null },
      select: { id: true, slug: true, translations: { where: { locale: "en" }, select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!review) notFound();

  return (
    <div>
      <Link href="/en/dashboard/reviews" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Reviews
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{review.customerName}</h2>
        {can(actor.role, "reviews", "delete") ? (
          <ArchiveDialog
            id={review.id}
            archived={Boolean(review.archivedAt)}
            name={review.customerName}
            entityLabel="review"
            archiveAction={archiveReview}
            restoreAction={restoreReview}
            redirectTo="/en/dashboard/reviews"
          />
        ) : null}
      </div>
      <ReviewForm
        mode="edit"
        id={review.id}
        tours={tours.map((t) => ({ id: t.id, title: t.translations[0]?.title ?? t.slug }))}
        initial={{
          customerName: review.customerName,
          customerCountry: review.customerCountry ?? "",
          tourId: review.tourId ?? "",
          rating: review.rating,
          body: review.body,
          travelDate: review.travelDate ? review.travelDate.toISOString().slice(0, 10) : "",
          language: review.language,
          source: review.source,
          featured: review.featured,
          visible: review.visible,
          displayOrder: review.displayOrder,
        }}
      />
    </div>
  );
}
