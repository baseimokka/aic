import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import { getTransferFormData } from "@/lib/db/pages";
import { TransferForm } from "@/components/site/transfer-form";
import { StaggerGroup } from "@/components/site/stagger-group";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale).transfers;
  return {
    title: t.title,
    description: t.metaDescription,
    alternates: localizedAlternates(locale, "/transfers"),
  };
}

/**
 * Public transfer request page (Transfer module). Vehicles, locations and
 * route prices all come from the dashboard — nothing here is hardcoded.
 */
export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const data = await getTransferFormData();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{t.transfers.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{t.transfers.subtitle}</p>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]">
        <StaggerGroup className="flex flex-col gap-3">
          {[
            { title: t.transfers.point1Title, body: t.transfers.point1Body },
            { title: t.transfers.point2Title, body: t.transfers.point2Body },
            { title: t.transfers.point3Title, body: t.transfers.point3Body },
          ].map((point, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="font-serif text-lg font-semibold text-ink">{point.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
            </div>
          ))}
        </StaggerGroup>

        <TransferForm
          labels={t.transfers}
          booking={t.booking}
          data={data}
          locale={locale}
          whatsappHref="https://wa.me/201221416299"
        />
      </div>
    </main>
  );
}
