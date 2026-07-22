import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FaqForm } from "@/components/admin/faq-form";
import { archiveFaq, restoreFaq } from "../actions";

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "faqs", "view")) return <NoAccess />;

  const { id } = await params;
  const faq = await prisma.faq.findUnique({
    where: { id },
    include: { translations: { where: { locale: "en" }, select: { question: true, answer: true } } },
  });
  if (!faq || faq.tourId) notFound();

  const en = faq.translations[0];
  const question = en?.question ?? "Question";

  return (
    <div>
      <Link href="/en/dashboard/faq" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> FAQ
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink line-clamp-1">{question}</h2>
        {can(actor.role, "faqs", "delete") ? (
          <ArchiveDialog
            id={faq.id}
            archived={Boolean(faq.archivedAt)}
            name={question}
            entityLabel="question"
            archiveAction={archiveFaq}
            restoreAction={restoreFaq}
            redirectTo="/en/dashboard/faq"
          />
        ) : null}
      </div>
      <FaqForm mode="edit" id={faq.id} initial={{ question: en?.question ?? "", answer: en?.answer ?? "", order: faq.order }} />

      <div className="mt-8">
        <TranslationsSection entityType="faq" entityId={faq.id} />
      </div>
    </div>
  );
}
