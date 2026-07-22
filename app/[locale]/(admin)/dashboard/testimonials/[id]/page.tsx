import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { archiveTestimonial, restoreTestimonial } from "../actions";

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "testimonials", "view")) return <NoAccess />;

  const { id } = await params;
  const t = await prisma.testimonial.findUnique({
    where: { id },
    include: { translations: { where: { locale: "en" }, select: { quote: true } } },
  });
  if (!t) notFound();

  return (
    <div>
      <Link href="/en/dashboard/testimonials" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Testimonials
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{t.authorName}</h2>
        {can(actor.role, "testimonials", "delete") ? (
          <ArchiveDialog
            id={t.id}
            archived={Boolean(t.archivedAt)}
            name={t.authorName}
            entityLabel="testimonial"
            archiveAction={archiveTestimonial}
            restoreAction={restoreTestimonial}
            redirectTo="/en/dashboard/testimonials"
          />
        ) : null}
      </div>
      <TestimonialForm
        mode="edit"
        id={t.id}
        initial={{
          authorName: t.authorName,
          authorCountry: t.authorCountry ?? "",
          quote: t.translations[0]?.quote ?? "",
          avatarPath: t.avatarPath,
          rating: t.rating,
          order: t.order,
          featured: t.featured,
        }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="testimonial" entityId={t.id} />
      </div>
    </div>
  );
}
