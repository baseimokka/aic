import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, localeCookieName, localeCookieMaxAge } from "@/lib/i18n/config";

const localeList = locales as readonly string[];

function hasLocalePrefix(pathname: string): boolean {
  return localeList.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

function detectLocale(req: NextRequest): string {
  // 1. An explicit prior choice wins (persisted by the locale switcher / previous visits).
  const chosen = req.cookies.get(localeCookieName)?.value;
  if (chosen && localeList.includes(chosen)) return chosen;

  // 2. Otherwise negotiate from Accept-Language, honouring q-weights (highest first).
  const header = req.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
        const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
        return { lang: tag.split("-")[0].toLowerCase(), q: Number.isFinite(q) ? q : 0 };
      })
      .filter((x) => x.lang)
      .sort((a, b) => b.q - a.q);
    const match = ranked.find((x) => localeList.includes(x.lang));
    if (match) return match.lang;
  }
  return defaultLocale;
}

/** Persist the active locale so a later visit to a bare path resolves to it. */
function rememberLocale(res: NextResponse, locale: string): NextResponse {
  res.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  });
  return res;
}

/**
 * Edge proxy (Next 16 successor to middleware). Handles (CLAUDE.md §8):
 *  1. Locale resolution / redirect — every public path carries a locale prefix.
 *  2. Blog redirect — non-English blog paths → /en/blog/... (blog is English-only, §21).
 *  3. Admin gating — placeholder; real Auth.js session check lands in Phase 3.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Ensure a locale prefix.
  if (!hasLocalePrefix(pathname)) {
    const locale = detectLocale(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return rememberLocale(NextResponse.redirect(url), locale);
  }

  const segments = pathname.split("/"); // ["", locale, ...rest]
  const locale = segments[1];

  // 2. Blog is English-only — redirect other locales to the English article, preserving the slug.
  if (segments[2] === "blog" && locale !== "en") {
    const url = req.nextUrl.clone();
    url.pathname = `/en/${segments.slice(2).join("/")}`;
    return NextResponse.redirect(url);
  }

  // 3. The admin console (and its login) is English-only — mirror the blog rule.
  if ((segments[2] === "dashboard" || segments[2] === "login") && locale !== "en") {
    const url = req.nextUrl.clone();
    url.pathname = `/en/${segments.slice(2).join("/")}`;
    return NextResponse.redirect(url);
  }

  // 4. Admin gating: no session cookie → straight to login. This is the fast
  //    UX path only — the real security boundary is auth() in the dashboard
  //    layout plus requirePermission() in every Server Action (§11).
  if (segments[2] === "dashboard") {
    const hasSession =
      req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/en/login";
      url.search = pathname === "/en/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  // 5. Remember the locale being browsed so a later visit to a bare path resolves to it.
  //    Skip the English-only sections (blog, admin) — reading an English-only page must
  //    not overwrite a visitor's site-wide language preference.
  const res = NextResponse.next();
  const englishOnly = segments[2] === "blog" || segments[2] === "dashboard" || segments[2] === "login";
  if (!englishOnly && req.cookies.get(localeCookieName)?.value !== locale) {
    rememberLocale(res, locale);
  }
  return res;
}

export const config = {
  // Skip Next internals, the API, and files with an extension.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
