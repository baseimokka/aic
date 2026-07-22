import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { HeroBannerForm } from "@/components/admin/hero-banner-form";

export default async function NewHeroBannerPage() {
  const actor = await requireActor();
  if (!can(actor.role, "heroBanners", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/hero-banners" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Hero banners
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New hero banner</h2>
      <HeroBannerForm
        mode="create"
        initial={{ headline: "", subheadline: "", ctaLabel: "", ctaUrl: "", imagePath: null, order: 0, enabled: true, showSearch: true, startsAt: "", endsAt: "" }}
      />
    </div>
  );
}
