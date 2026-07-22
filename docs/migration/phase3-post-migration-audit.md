# Phase 3 — Post-Migration Audit & Fix Report

**Date:** 2026-07-23 · **Scope:** application database + application code only.
The legacy SQL Server was never touched; migration scripts were never modified or re-run.
All data fixes were applied by idempotent one-shot scripts (since removed); all visual fixes
were verified in headless Chrome against the production build.

---

## 1. Data issues found & fixed (application DB)

### Tour content (all 183 translations scanned)
| Issue | Count | Fix |
|---|---|---|
| Un-decoded HTML entities (`&ocirc;` `&icirc;` `&ecirc;` `&acirc;` `&ugrave;` `&bdquo;` `&iacute;` `&lrm;` …) — mostly French rows + 4 FR FAQ answers | 132 fields | Decoded with a complete entity table; invisible controls (`&lrm;`) removed |
| Items truncated at exactly 200 chars mid-word (migration Zod cap) | 33 items | Trimmed back to the last complete word, ellipsis kept. **Original full text is only in the legacy DB — restore manually if wanted** (list in §5) |
| ALL-CAPS / broken-case titles (`CAIRO BY BUS`, `Jeep safari`, `Джип -сафари`…) | 15 titles | Explicit per-language recasing (e.g. "Cairo by Bus", "Kairo 2 Tage mit dem Bus", "Джип-сафари") |
| YouTube `<iframe>` embed stored as a "Safety" custom fact (luxury-yacht/de) | 1 | Removed |
| `jeep-safari/fr` itinerary empty (legacy had none) | 1 | Authored faithful FR translation of the EN itinerary |
| `cairo-2-days-by-bus`: both days merged into one "Day 1" line; `durationDays=1`, `tourType="Day tour"` despite being a 2-day tour (legacy Length said "15 HOURS") | 1 tour | Split EN/DE/RU itineraries into Day 1/Day 2 at the legacy day boundary; `durationDays→2`, `tourType→Multi-day` |
| `aswan-day-tour` had `tourType="Sea trip"` (legacy misfiling under Sea Trips) | 1 | → "Day tour" |
| Czech text in the **English** row (luxury-yacht excluded item) | 1 | Translated to English |
| English content in DE/FR rows of **active** tours (overviews, itineraries, highlights, included/excluded, custom facts) | ~45 fields across 8 tours | Authored faithful DE/FR translations (quad-sunset, dolphin-house-vip, jeep-safari, intro-diving, anthony-monasteries + short list items on 4 more) |
| Redundant `Duration :: N days` custom facts duplicating the structured Duration fact | 16 | Removed (hour-based ones like "16 hours" kept — they carry real info) |
| English custom-fact labels on non-EN pages (`Duration`, `What to bring`, …) | ~120 rows | Localized the 7 standard labels for de/ru/fr (Dauer/Durée/Продолжительность, Mitzubringen/À emporter/Что взять с собой, …) |
| Merged list item "Toiletten• Schnorchel-Guide" (utopia-island/de) | 1 | Split into two items |
| Duplicated words "Prise en charge en charge" (hurghada-makadi/fr) | 1 | De-duplicated |

### Categories
- `nilecruise` (contains the diving tours): ru said "Круиз по Нилу", fr "Croisière sur le Nil" → corrected to "Дайвинг" / "Plongée" to match canonical EN "Diving".
- `seatrip`: de "Hurghada Touren" → "Seereisen", fr "Excursions à Hurghada" → "Sorties en mer" (aligned with the legacy hero-banner phrasing).
- RU names de-capitalized (КАИР→Каир, ЛУКСОР→Луксор, МОРСКИЕ ПОЕЗДКИ→Морские поездки, САФАРИ→Сафари); FR names recased (visite du caire→Visites du Caire, visite de louxor→Visites de Louxor); de SAFARI→Safari.
- Junk descriptions removed (lorem-ipsum filler ×4, name-repeats like "KAIRO TOUREN"/"Tauchen"/"Lustige Touren" ×13). Real sentence descriptions kept.

### Destinations
- Junk fixed: en descriptions were lorem-filler ("We denounce with righteous indignation…"), ru names were wrong ("Egypt" for Hurghada, "Zengbar" for Sharm) — corrected/nulled.
- FR names were whole phrases ("Excursions à Hurghada") → proper place names.
- Added factual name rows for missing locales (it/ar/tr everywhere; full set for Cairo).
- **PO decision (2026-07-23): visited-place model.** Created **Luxor** and **Aswan** destinations (name rows in all 7 locales, no invented descriptions). Assigned the 11 reviewable tours:
  - → Cairo: cairo-by-bus, cairo-by-plane-from-hurghada, cairo-private-tour, cairo-2-days-by-bus
  - → Luxor: luxor-by-bus, luxor-private-tour, 2-day-luxor-tour…, abydos-osireion-and-dendera
  - → Aswan: aswan-day-tour, aswan-abu-simbel-two-days, 3-days-tour-aswan-and-abu-simbel (all three DISABLED)
  - **anthony-and-st-paul-monasteries stays unassigned** — it visits the Zafarana monasteries; no fitting destination exists and none was invented.

### Blog
- "TOP SEA TRIPS FOR KIDS" → "Top Sea Trips for Kids".
- Two excerpts began by repeating the post title → replaced with the post's own first sentence.
- `metaDescription` set for all 4 posts (derived from the excerpts, ≤160 chars).

### Homepage CMS
- All 6 sections verified against the renderer's keys — no orphans, no missing sections, order correct.
- Added manual translations (heading/body/CTA) for **de/ru/fr/it/tr** on all 6 sections (en/ar existed). Old-site terminology respected (DE "Maßgeschneiderte Touren", FR "Circuits sur mesure", RU "Индивидуальные туры", IT "Tour su misura").

### Hero banners (handoff doc §5)
- Created the **4 usable banners** (legacy boxes 5, 6, 2, 4) with the exact handoff text in en/de/ru/fr/it. Box 7 dropped (empty English headline, per plan).
- **No images invented:** `imagePath` is empty and every banner is **disabled** — they cannot appear publicly until a real image is uploaded and the banner enabled. Admin UI renders them safely (gradient placeholder).

## 2. Code issues found & fixed

| Issue | Fix |
|---|---|
| Homepage had **no `<h1>` and no hero** when zero banners are enabled (current state until hero images arrive); the featured section's −48 px overlap hung over nothing | Fallback hero band (navy, brand strings only — eyebrow / "AIC Travel" h1 / partnership line) renders when no banner is enabled — `app/[locale]/(site)/page.tsx` |
| "**1 days**" — day counts always used the plural in all locales | New `lib/i18n/plural.ts` (`formatDayCount`, Intl.PluralRules) + `dayOne/dayTwo/dayFew/dayMany` keys in all 7 catalogs; wired into tour cards and tour detail. Correct Russian few/many and Arabic forms |
| **tourType shown raw English on every locale** (card chips, detail meta, catalog filter) | `tourTypes` display map in all 7 catalogs + `tourTypeLabel()` with raw-value fallback (vocabulary stays free text per PRD); filter labels localized, URL values unchanged |
| **Unmatched URLs rendered Next's default unbranded black 404** (the localized `not-found.tsx` was unreachable — no catch-all) | Added `app/[locale]/(site)/[...rest]/page.tsx` (calls `notFound()`) + `app/[locale]/(site)/not-found.tsx` so the localized 404 renders **with site header/footer**; correct 404 status kept |
| ESLint error in frozen migration script | `scripts/migrate-legacy/**` excluded from lint (scripts must not be edited — documented in `eslint.config.mjs`) |

## 3. Verification performed

- **TypeScript** `tsc --noEmit`: 0 errors. **ESLint**: 0 errors (1 pre-existing advisory warning: Google-Fonts `<link>` in the root layout — deliberate; converting to `next/font` is a design-affecting change, left as-is).
- **Production build**: clean; 273 tour pages prerendered (39 active × 7 locales), 673 static pages total.
- **Full crawl of the production build ×3** (487 URLs: sitemap + every nav/card/footer link, all locales): **0 broken links, 0 unexpected error responses, 0 pages missing title/meta/h1, 0 duplicated h1**. Disabled tours 404 ✓. Unknown slugs 404 ✓.
- **Headless-Chrome visual pass ×3** (~60 screenshots reviewed): desktop + 390 px mobile + RTL. **0 console errors, 0 page errors, 0 failed requests** (other than the intentional 404 probe).
- **SEO**: sitemap 411 URLs — includes `/`, `/tours`, per-tour, `/about`, `/contact`, `/en/blog` + 4 articles, legal pages; disabled tours excluded; blog only under `/en`. Blog canonicals → `/en/blog/...` on every locale ✓. `/de/blog/x` → 302 `/en/blog/x` slug preserved ✓. hreflang ×8 (7 locales + x-default) ✓. JSON-LD on 299 pages (TravelAgency / Product with offer price = effective discounted price) — all parse ✓. robots.txt disallows `/api/`, `/dashboard` ✓.
- **Admin dashboard** (logged in as Super Admin): Dashboard, Tours (50), Categories (6), Destinations (6), FAQ (4), Blog (4), Vehicles (3), Hero Banners (4 disabled), Homepage (6 sections, 7/7 languages), Leads, Media, SEO, Analytics, Settings, Users, Audit, Testimonials, Reviews, Guides, Assignments, Notifications — all render; tour editor shows correct translation coverage badges.
- **Filters/search verified in browser**: category (`?category=nilecruise`), destination (`?destination=cairo`), search (`?q=luxor`), price slider bounds, duration, sort — all return correct result sets; discount badges/strikethrough pricing correct ($120→$110 −8% etc.); localized filter labels on `/de/tours`.

## 4. Pages manually reviewed (screenshots)

Home (en/de/ru/ar/mobile), Tours catalog (en/de/ar/mobile + 3 filter states), Tour detail
(cairo-by-bus en+mobile, 2-day-luxor en, jeep-safari fr/de, dolphin-house fr, intro-diving de,
luxor-by-bus de/ru, semi-submarine ru, luxury-yacht en, parasailing it, orange-bay ar),
Tailor-Made (desktop+mobile), Blog list, Blog article, FAQ (en/fr), About, Contact,
Destinations index, Destination detail (cairo, luxor, sharm empty-state), Experiences, Guides,
Partners, Transportation, Privacy, 404 — plus 23 admin screens.

## 5. Remaining manual tasks (not blockers unless noted)

1. **Media** (planned manual step): tour images, destination hero images, blog covers, hero-banner
   images. Hero banners: upload image → set it on the banner → enable. The site renders branded
   gradient placeholders meanwhile.
2. **33 truncated list items** (highlights/included/custom facts, mostly ru/de) — text beyond
   200 chars was lost at import; now tidy but shortened. Restore from the old site if desired.
3. **3 DISABLED tours have unfixed legacy content** — re-work before ever re-enabling:
   `paradise-class-semi-submarine` (de row is English), `cairo-2-days-by-bus` (de row is English),
   `black-white-desert` (messy EN source, emojis, "2 Days – 1 Night" content vs 1-day setup).
4. **anthony-and-st-paul-monasteries** has no destination (visits Zafarana; PO may add a
   destination or leave it category-only).
5. **Placeholder contact config**: footer phone `+20 100 000 0000`, `hello@aictravel.com`, and
   `wa.me/201000000000` are placeholders (real number +20 122 141 6299 per old site) — deliberate
   site-wide config swap before launch.
6. **`NEXT_PUBLIC_SITE_URL`** is `http://localhost:3000` in `.env` — must be the real domain in the
   production environment (canonicals/hreflang/robots/sitemap derive from it). Set GA4/GSC env vars too.
7. **Test users** (`*@aictravel.test`, `bassemsales@test.com`, seed password) — replace with real
   admin accounts before launch.
8. **ar/it/tr tour content** doesn't exist (never existed in legacy) — pages fall back to English
   by design; author via the dashboard when ready.
9. Curation (optional): suitability flags are all false, popularityScore all 0, no destination
   marked `featured`, blog posts' `publishedAt` = import date.

## 6. Production readiness

**Yes — production-ready for launch pending the §5 manual items** (media uploads, real contact
config, real admin users, production env vars). Build, types, lint, runtime, links, 404s, SEO
surface, RBAC-guarded admin, and all imported content verified; every fix visually confirmed
in the browser against the production build.
