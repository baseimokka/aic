import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { TourEditor } from "@/components/admin/tour-editor";
import { getCurrencySettings } from "@/lib/admin/currencies";

async function taxonomies() {
  const [cats, dests] = await Promise.all([
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" }, include: { translations: { where: { locale: "en" }, select: { name: true } } } }),
    prisma.destination.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" }, include: { translations: { where: { locale: "en" }, select: { name: true } } } }),
  ]);
  return {
    categories: cats.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug })),
    destinations: dests.map((d) => ({ id: d.id, name: d.translations[0]?.name ?? d.slug })),
  };
}

export default async function NewTourPage() {
  const actor = await requireActor();
  if (!can(actor.role, "tours", "create")) return <NoAccess />;
  const [{ categories, destinations }, { currencies, defaultCurrency }] = await Promise.all([
    taxonomies(),
    getCurrencySettings(),
  ]);

  return (
    <div>
      <Link href="/en/dashboard/tours" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Tours
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New tour</h2>
      <TourEditor
        mode="create"
        categories={categories}
        destinations={destinations}
        currencies={currencies}
        initial={{
          title: "",
          slug: "",
          categoryId: "",
          destinationId: "",
          tourType: "",
          durationDays: 1,
          basePrice: 0,
          currency: defaultCurrency,
          discountType: "",
          discountValue: null,
          discountStartsAt: "",
          discountEndsAt: "",
          pickupType: "",
          cancellationPolicy: "",
          guideLanguages: [],
          familyFriendly: false,
          coupleFriendly: false,
          soloFriendly: false,
          featured: false,
          popularityScore: 0,
          status: "ACTIVE",
          overview: "",
          itinerary: "",
          highlights: [],
          included: [],
          excluded: [],
          customFacts: [],
          seoTitle: "",
          metaDescription: "",
          ogImagePath: null,
        }}
      />
    </div>
  );
}
