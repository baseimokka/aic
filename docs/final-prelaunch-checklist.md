# Final Pre-Launch Checklist

Everything automated is done and verified (see `docs/migration/phase3-post-migration-audit.md`).
This file lists only what remains for **manual** action and review.

---

## 1. Remaining manual tasks

- [ ] **Upload all media** (see §2) — the site deliberately renders branded gradient placeholders until then.
- [ ] **Hero banners**: for each of the 4 prepared banners (Dashboard → Hero Banners — text already entered from the legacy site), upload/select a real image, then **enable** it. They are disabled on purpose and cannot appear publicly until this is done.
- [ ] **Contact configuration** (site-wide swap before launch):
  - WhatsApp links use placeholder `wa.me/201000000000` (real number per old site: +20 122 141 6299)
  - Footer phone `+20 100 000 0000` and `hello@aictravel.com` are placeholders
- [ ] **Real admin accounts**: create your own Super Admin, then archive/delete the seed users (`admin/sara/nadia/tarek@aictravel.test`, `bassemsales@test.com`) — they all share the seed password.
- [ ] **Decide on the monasteries tour destination**: `anthony-and-st-paul-monasteries…` is intentionally unassigned (it visits Zafarana; no matching destination exists).
- [ ] **3 DISABLED tours** need content rework before ever re-enabling: `paradise-class-semi-submarine` (German row is English), `cairo-2-days-by-bus` (German row is English), `black-white-desert` (messy English source, emojis, day-count mismatch).
- [ ] Optionally restore the **33 truncated list items** (text beyond 200 chars was lost at import; full text only exists on the old site) — list in the phase-3 audit report.
- [ ] Optional curation: family/couple/solo flags (all false), popularity scores (all 0), featured destinations (none), real blog `publishedAt` dates, ar/it/tr tour content (English fallback shows meanwhile).
- [ ] `uploads/` currently contains **stale dev-era files** (demo/unsplash images + thumbs). One is in use: the About-page hero (`/uploads/hero/mo-gabrail-…webp`). When preparing the production volume, copy that file (or replace the About hero) and start otherwise clean.

## 2. Media still to upload

| Where | What |
|---|---|
| Tours (50) | Gallery images per tour (dashboard → Tours → Images; alt text required) |
| Destinations (6) | Hero image each (Hurghada, Sharm El Sheikh, Marsa Alam, Cairo, Luxor, Aswan) |
| Hero banners (4) | One wide image each, then enable |
| Blog posts (4) | Cover images |
| About page | Confirm/replace the current hero photo |
| Testimonials | None exist yet — avatars only if/when testimonials are added |

## 3. Public pages to review manually

For each: desktop + mobile (360–390 px) + at least one RTL check (ar).

- [ ] Home — en, ar (RTL), de (note: hero is the brand fallback until banners get images)
- [ ] Tours catalog `/en/tours` — filters (destination/category/type/duration/price/suitability), search, sort, pagination
- [ ] Tour detail — a discounted tour (e.g. `cairo-by-bus`), a multi-day (`2-day-luxor-tour-…`), one per extra locale (de/ru/fr sample)
- [ ] Tailor-Made `/en/tailor-made`
- [ ] Destinations index + one populated (`/en/destinations/luxor`) + one empty (`sharm-el-sheikh` no-tours state)
- [ ] Blog `/en/blog` + each of the 4 articles
- [ ] FAQ, About, Contact, Experiences, Guides, Partners, Transportation
- [ ] Privacy Policy, Terms & Conditions
- [ ] 404 (any bad URL) — branded, localized, keeps header/footer
- [ ] Blog language redirect: `/de/blog/<slug>` → `/en/blog/<slug>`
- [ ] Cookie banner: Reject vs Accept (GA must load only after Accept)

## 4. Dashboard pages to test (log in as Super Admin)

- [ ] Dashboard KPIs · Analytics
- [ ] Tours: open/edit one tour, all 5 tabs (Basics/Content/Images/FAQ/SEO); translation coverage badges
- [ ] Categories · Destinations (6, incl. new Luxor/Aswan) · FAQ · Blog · Vehicles (3)
- [ ] Hero Banners: the 4 prepared, disabled banners — edit → attach image → enable (this is the real workflow test)
- [ ] Homepage sections: 6 sections, 7/7 languages
- [ ] Leads (empty CRM — will fill from your form tests) · Assignments · Guides
- [ ] Media library + upload (WebP conversion + thumbnail + required alt)
- [ ] SEO overview · Settings · Users · Audit log (your test edits must appear)
- [ ] RBAC spot-check: log in as each seed role once **before** archiving them — Sales sees Leads not CMS; Content sees CMS not Leads; Operations sees Guides/Vehicles/Assignments

## 5. Forms to test

- [ ] Booking request (tour page): happy path → success state, lead in CRM with correct tour/price/status NEW, notification email arrives
- [ ] Booking request validation: bad email, missing consent, missing required fields
- [ ] Bot protection: honeypot + challenge visible-and-accessible; rapid repeat submits → rate-limit notice
- [ ] Tailor-made form → lead with trip preferences in special requests
- [ ] Contact form → email notification
- [ ] One non-English submission (e.g. `/de`) — confirmation email should be localized

## 6. Emails to test

Preview in dev: `GET /api/dev/booking-email` (HTML), `?format=text`, `?variant=general`
(dev-only route — automatically 404s in production).
Real send test: `POST /api/dev/booking-email?to=you@example.com` (needs `RESEND_API_KEY`).

- [ ] Customer booking confirmation (tour + general variants; desktop + phone client)
- [ ] Internal notification to `NOTIFY_EMAIL_TO`
- [ ] From-addresses use the verified Resend domain (`BOOKING_EMAIL_FROM` / `NOTIFY_EMAIL_FROM`) — not `onboarding@resend.dev`
- [ ] SPF/DKIM pass on real inboxes (check spam folder)

## 7. SEO items to verify (after deploy, on the real domain)

- [ ] `NEXT_PUBLIC_SITE_URL` set to the production domain **before building** — canonicals/hreflang/sitemap/robots all derive from it (currently localhost in dev `.env`)
- [ ] `https://<domain>/sitemap.xml` — ~411 URLs, no disabled tours, blog only under `/en`
- [ ] `robots.txt` — `Disallow: /api/`, `/dashboard`, correct Host/Sitemap lines
- [ ] Canonicals on blog pages point to `/en/blog/…` from every locale
- [ ] hreflang alternates (7 locales + x-default) on localized pages
- [ ] Rich results test on one tour page (Product + Offer) and one blog article
- [ ] OG preview (paste a tour URL into WhatsApp/Facebook) — sensible title/description
- [ ] Submit sitemap in Google Search Console; set `NEXT_PUBLIC_GSC_VERIFICATION`
- [ ] GA4 real-time shows visits only after consent

## 8. Deployment checklist (VPS)

- [ ] Node LTS + process manager (pm2/systemd) for `next start`
- [ ] Production env vars set (see README table): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (fresh ≥32-byte value — do not reuse dev), `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `NOTIFY_EMAIL_TO/FROM`, `BOOKING_EMAIL_FROM`, `UPLOADS_DIR`, `TRUSTED_PROXY_HOPS`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`. Legacy `LEGACY_DB_*` vars are **not** needed in production
- [ ] `prisma migrate deploy` against the production DB (schema already matches — verify no pending migrations)
- [ ] **Do not run `db:seed` in production**
- [ ] `UPLOADS_DIR` on a persistent volume outside the build dir; nginx serves `/uploads/*` directly from it (with path-traversal protection), proxies everything else to Node
- [ ] nginx: HTTPS (certbot), HTTP→HTTPS redirect, correct `X-Forwarded-For` chain matching `TRUSTED_PROXY_HOPS`
- [ ] `npm run build` on the server (or CI) **after** env vars are in place
- [ ] DB backup schedule (pg_dump or provider snapshots) + uploads volume backup

## 9. Post-deployment checklist

- [ ] Smoke: home (all 7 locales load), one tour page, booking request end-to-end on production (then archive that lead)
- [ ] Confirm `/api/dev/booking-email` returns 404 in production
- [ ] Login works over HTTPS; `/dashboard` unreachable logged-out; audit log records a test edit
- [ ] Upload one real image through the dashboard → appears on the site via nginx `/uploads`
- [ ] Enable hero banners once images are up; verify homepage carousel + h1
- [ ] Run Lighthouse on home + one tour page (mobile) — Core Web Vitals green
- [ ] Verify 404 page + redirect rules on the real domain
- [ ] GSC: submit sitemap, request indexing for home + top tours
- [ ] Watch server logs + Resend dashboard for the first real bookings
- [ ] Rotate/remove any credentials that were used during development

## Known accepted items (no action unless you decide otherwise)

- `npm audit`: 4 advisories in Next's **bundled** sharp (libvips CVEs), fix requires `next@16.2.11` — version upgrades were out of scope for this pass; decide post-review
- Google Fonts loaded via `<link>` in the root layout (deliberate; `next/font` migration would alter font delivery)
- `scripts/migrate-legacy/` kept frozen as the migration audit trail (uncommitted; excluded from lint)
