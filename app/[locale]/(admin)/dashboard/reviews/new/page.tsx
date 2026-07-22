import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ReviewForm } from "@/components/admin/review-form";

export default async function NewReviewPage() {
  const actor = await requireActor();
  if (!can(actor.role, "reviews", "create")) return <NoAccess />;

  const tours = await prisma.tour.findMany({
    where: { archivedAt: null },
    select: { id: true, slug: true, translations: { where: { locale: "en" }, select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <Link href="/en/dashboard/reviews" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Reviews
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New review</h2>
      <ReviewForm
        mode="create"
        tours={tours.map((t) => ({ id: t.id, title: t.translations[0]?.title ?? t.slug }))}
        initial={{
          customerName: "",
          customerCountry: "",
          tourId: "",
          rating: 5,
          body: "",
          travelDate: "",
          language: "en",
          source: "WEBSITE",
          featured: false,
          visible: true,
          displayOrder: 0,
        }}
      />
    </div>
  );
}
