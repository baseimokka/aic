import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { TestimonialForm } from "@/components/admin/testimonial-form";

export default async function NewTestimonialPage() {
  const actor = await requireActor();
  if (!can(actor.role, "testimonials", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/testimonials" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Testimonials
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New testimonial</h2>
      <TestimonialForm
        mode="create"
        initial={{ authorName: "", authorCountry: "", quote: "", avatarPath: null, rating: 5, order: 0, featured: true }}
      />
    </div>
  );
}
