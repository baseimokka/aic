import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { CookieConsent } from "@/components/site/cookie-consent";
import { GoogleAnalytics } from "@/components/site/google-analytics";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader locale={locale} />
      <div id="main" className="flex-1">
        {children}
      </div>
      <SiteFooter locale={locale} />
      <WhatsAppButton />
      <CookieConsent locale={locale} labels={getDictionary(locale).cookie} />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </>
  );
}
