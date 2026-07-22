"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale } from "@/lib/i18n/config";

export default function NotFound() {
  const pathname = usePathname();
  const seg = pathname.split("/")[1];
  const locale = isLocale(seg) ? seg : defaultLocale;
  const t = getDictionary(locale);
  const n = t.notFound;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-serif text-7xl font-semibold text-accent">404</p>
      <h1 className="mt-4 font-serif text-3xl font-medium text-ink">{n.title}</h1>
      <p className="mt-3 max-w-md text-muted">{n.body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className="inline-flex h-12 items-center rounded-xl bg-accent px-6 font-semibold text-white hover:bg-accent-deep">
          {n.home}
        </Link>
        <Link href={`/${locale}/tours`} className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 font-semibold text-ink hover:bg-surface-2">
          {n.tours}
        </Link>
      </div>
    </main>
  );
}
