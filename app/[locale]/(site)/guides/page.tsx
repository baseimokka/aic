import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, localeNames, type Locale } from "@/lib/i18n/config";
import { getPublicGuides } from "@/lib/db/pages";
import { StaggerGroup } from "@/components/site/stagger-group";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).guidesPage.title };
}

function languageLabel(code: string): string {
  return code in localeNames ? localeNames[code as keyof typeof localeNames].english : code.toUpperCase();
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const g = t.guidesPage;
  const guides = await getPublicGuides();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{g.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{g.subtitle}</p>

      <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <div key={guide.name} className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 font-serif text-lg font-semibold text-ink">
                {guide.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">{guide.name}</h2>
                {guide.available && <span className="text-xs font-semibold text-success-deep">{g.available}</span>}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">{g.languages}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {guide.languages.map((code) => (
                  <span key={code} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft">
                    {languageLabel(code)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </StaggerGroup>
    </main>
  );
}
