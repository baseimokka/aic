# CLAUDE.md — AIC Travel × SoHolidays Tourism Platform

> Implementation context for Claude Code and Claude Design.
> Companion to **PRD v2.1**. This file is the single source of truth for how the platform is built. When PRD v2.1 and this file agree, follow both. If a detail is missing here, defer to PRD v2.1; never invent scope or remove approved features.

---

## 1. Project Overview

A premium tourism platform for Egypt targeting international travelers, plus a full internal management system for sales, content, and operations. It is both a marketing website and a tourism company management system.

- **Model:** Booking **requests** only. **No online payments in Phase 1.**
- **Branding:** AIC Travel in partnership with SoHolidays — both brands visible on homepage, footer, about, and trust elements.
- **Primary language:** English at launch; architecture fully multilingual (`en`, `ar`, `de`, `ru`, `tr` ,`it`,`fr` ), with RTL for Arabic.
- **Priority:** Mobile-first (down to 360px), fast, SEO-strong, WCAG AA.

Do not redesign, reduce scope, change business decisions, or introduce online payments in Phase 1.

---

## 2. Architecture Decisions

| Concern | Decision |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Backend | Next.js Server Actions / API Routes |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js |
| Validation | Zod (shared client + server) |
| Media | **Local filesystem on the VPS** via a provider-agnostic `StorageService` (Sharp for processing). No external media service in V1. |
| Email | Resend |
| Analytics | Google Analytics 4 + Google Search Console |
| i18n | Locale-segmented routes + **translation tables** (no JSON translations) |
| WhatsApp (Phase 1) | `wa.me` deep links only |

Locale routing is segment-based: `/[locale]/...` with `en` as default and fallback locale.

---

## 3. Folder Structure

```
/app
  /[locale]
    /(site)                  # public marketing site
      /page.tsx              # homepage
      /tours                 # catalog + filters
      /tours/[slug]          # tour detail
      /destinations
      /about
      /contact
      /blog                  # served under en only (see §8)
      /blog/[slug]
      /privacy-policy
      /terms-and-conditions
      /not-found.tsx         # localized 404
    /(admin)                 # protected dashboard
      /dashboard
      /tours
      /categories
      /homepage
      /hero-banners
      /blog
      /leads
      /guides
      /vehicles
      /assignments
      /users
      /media
      /seo
      /analytics
      /audit-logs
/app/api
  /booking-request           # public booking request submission
  /contact                   # public contact submission
  /admin/media/upload        # admin image upload (RBAC + Sharp → StorageService)
  /admin/*                   # admin mutations not handled by server actions
  /webhooks/*                # future (payments Phase 3)
/app/uploads/[...path]       # serves stored files in dev (nginx serves them in prod)
/lib
  /db                        # prisma client + query helpers (locale fallback lives here)
  /auth                      # Auth.js config + rbac helpers
  /rbac                      # permission matrix + can() guard
  /validation                # zod schemas (shared)
  /storage                   # StorageService (provider-agnostic), local FS adapter, Sharp pipeline
  /audit                     # audit log helper
  /i18n                      # locale config, middleware helpers
/components
  /ui                        # design-system primitives
  /site                      # public feature components
  /admin                     # dashboard feature components
/messages                    # UI string catalogs per locale (en.json, ar.json, ...)
/prisma
  schema.prisma
  /migrations
/middleware.ts               # locale + blog redirect + auth gating
```

Keep public (`site`) and admin components separated. Do not mix admin logic into public routes.

---
## Internationalization (i18n)

Supported Languages:

- en
- ar
- de
- ru
- fr
- it
- tr

English is the canonical content language.

All user-facing pages must support every language except:

- Blog (English only)
- Admin Dashboard (English only)

## 4. RBAC Permission Matrix

Roles are fixed: **Super Admin, Sales Admin, Content Admin, Operations Admin**. Permissions per resource: **V**iew / **C**reate / **E**dit / **D**elete.

| Resource | Super Admin | Sales Admin | Content Admin | Operations Admin |
|---|---|---|---|---|
| Tours | V C E D | V | V C E D | V |
| Categories | V C E D | — | V C E D | — |
| Homepage | V C E D | — | V C E D | — |
| Hero Banners | V C E D | — | V C E D | — |
| Blog | V C E D | — | V C E D | — |
| Leads | V C E D | V C E D | — | V |
| Guides | V C E D | — | — | V C E D |
| Vehicles | V C E D | — | — | V C E D |
| Assignments | V C E D | — | — | V C E D |
| Users | V C E D | — | — | — |
| Media Library | V C E D | — | V C E D | V |
| SEO | V C E D | — | V C E D | — |
| Analytics | V | V | V | V |

### Enforcement
- Enforce **server-side** in every Server Action / API Route via a single guard, e.g. `requirePermission(user, 'Leads', 'edit')`.
- Represent the matrix as a typed structure in `/lib/rbac` and derive both the server guard and UI gating from it (one source of truth).
- UI hides actions a role lacks, but UI gating is never the security boundary.
- `Users` mutations are Super Admin only. `Analytics` is view-only for all roles.

```ts
// /lib/rbac/matrix.ts (shape example)
type Action = 'view' | 'create' | 'edit' | 'delete';
type Resource =
  | 'tours' | 'categories' | 'homepage' | 'heroBanners' | 'blog'
  | 'leads' | 'guides' | 'vehicles' | 'assignments'
  | 'users' | 'media' | 'seo' | 'analytics';

export const MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  SUPER_ADMIN:      { /* all resources: view, create, edit, delete */ },
  SALES_ADMIN:      { tours: ['view'], leads: ['view','create','edit','delete'], analytics: ['view'] },
  CONTENT_ADMIN:    { tours:['view','create','edit','delete'], categories:['view','create','edit','delete'],
                      homepage:['view','create','edit','delete'], heroBanners:['view','create','edit','delete'],
                      blog:['view','create','edit','delete'], media:['view','create','edit','delete'],
                      seo:['view','create','edit','delete'], analytics:['view'] },
  OPERATIONS_ADMIN: { tours:['view'], leads:['view'], guides:['view','create','edit','delete'],
                      vehicles:['view','create','edit','delete'], assignments:['view','create','edit','delete'],
                      media:['view'], analytics:['view'] },
};
```

---

## 5. Translation Strategy

**Translation tables only. No JSON translations.**

- One companion translation model per translatable entity, one row per locale.
- Base table = locale-independent data (ids, pricing, relations, status, ordering, timestamps).
- Translation table = all localized text (title, overview, itinerary text, descriptions, localized SEO fields, localized slug where applicable).
- Unique constraint `(<parentId>, locale)`.
- `en` is the fallback. Centralize fallback resolution in a shared query helper in `/lib/db`.

Pattern:
```
Tour            → TourTranslation
BlogPost        → BlogPostTranslation
Category        → CategoryTranslation
HomepageSection → HomepageSectionTranslation
```

Any other translatable entity (e.g. Hero Banner text, Destination, FAQ) follows the same `Entity → EntityTranslation` pattern.

Translation rows are authored **manually** per locale by Content Admins in the dashboard (§17). There is no automatic translation.

---

## 6. Database Models

Core models (illustrative fields; extend as needed without removing PRD requirements). Localized text is marked *(translation)* and lives in the companion table.

**Tour** (base): `id`, `slug`, `categoryId`, `destinationId`, `durationDays`, `basePrice`, `currency`, `tourType`, `familyFriendly`, `coupleFriendly`, `soloFriendly`, `featured`, `popularityScore`, `status(active/disabled)`, `images[]`, `included[]`, `excluded[]`, `createdAt`, `updatedAt`.
**TourTranslation**: `id`, `tourId`, `locale`, `title`, `overview`, `itinerary`, `seoTitle`, `metaDescription`, `ogImagePath`, unique `(tourId, locale)`. **TourImage**: `id`, `tourId`, `path`, `alt`, `sortOrder`.

> All media columns store a **relative file path** (e.g. `/uploads/tours/luxor-01.webp`), never a vendor id: `TourImage.path`, `Destination.heroImagePath`, `Testimonial.avatarPath`, `HeroBanner.imagePath`, `BlogPost.coverImagePath`, `TourTranslation.ogImagePath`, `BlogPostTranslation.ogImagePath`, `Media.path` (unique). See §12.

**Category** (base): `id`, `slug`, `order`, `status`. **CategoryTranslation**: `id`, `categoryId`, `locale`, `name`, `description`, unique `(categoryId, locale)`.

**HomepageSection** (base): `id`, `key`, `order`, `enabled`, `type`. **HomepageSectionTranslation**: `id`, `sectionId`, `locale`, `heading`, `body`, `ctaLabel`, unique `(sectionId, locale)`.

**HeroBanner** (base): `id`, `imagePath`, `order`, `enabled`, `ctaUrl`. **HeroBannerTranslation**: `id`, `bannerId`, `locale`, `headline`, `subheadline`, `ctaLabel`, unique `(bannerId, locale)`.

**BlogPost** (base, English-only content but modeled for consistency): `id`, `slug`, `categoryId`, `featured`, `status(draft/published)`, `coverImagePath`, `publishedAt`. **BlogPostTranslation**: currently only `en` rows created; schema supports others.

**Lead / BookingRequest**: `id`, `tourId`, `fullName`, `email`, `phone`, `country`, `preferredDate`, `travelers`, `specialRequests`, `status(New/Contacted/Negotiating/Confirmed/Cancelled)`, `assignedStaffId`, `createdAt`. Related: `LeadNote` (internal notes), `LeadCommunication` (communication history).

**Guide**: `id`, `name`, `languages[]`, `contact`, `availabilityStatus`.
**Vehicle**: `id`, `name`, `capacity`, `type`, `status`.
**Assignment**: `id`, `leadId`(confirmed booking), `guideId`, `vehicleId`, `scheduledDate`, `createdAt`.

**User**: `id`, `email`, `name`, `role(SUPER_ADMIN/SALES_ADMIN/CONTENT_ADMIN/OPERATIONS_ADMIN)`, auth fields.
**Media**: files stored on the local filesystem via `StorageService`; DB stores `path` (unique, relative), `type`, `alt`, `width`, `height`, `format`, references.
**AuditLog**: `id`, `actorId`, `actionType`, `resourceType`, `resourceId`, `createdAt`.

`enum Locale { en ar de ru tr }`

---

## 7. Prisma Modeling Guidance

- Use a Prisma `enum Locale { en ar de ru tr }` and `enum Role { ... }` and `enum LeadStatus { ... }`.
- Every translation model: relation to parent (`onDelete: Cascade`), `locale Locale`, `@@unique([parentId, locale])`, and `@@index([locale])`.
- Index localized routing slugs. If slugs are localized, place them on the translation table and index `(locale, slug)`.
- Centralize locale-aware reads in `/lib/db` helpers, e.g. `getTour(slug, locale)` that queries the requested locale then falls back to `en` — so the fallback rule is defined once.
- Use `@@index` on foreign keys and on frequently filtered fields (Tour: `categoryId`, `destinationId`, `featured`, `status`; Lead: `status`, `assignedStaffId`, `country`).
- Keep migrations clean and incremental; never edit an applied migration.
- Do not store localized strings on base tables — this is the most common way translation architecture drifts; keep it strict.

---

## 8. API Route Structure

Prefer **Server Actions** for admin mutations (co-located with dashboard routes, guarded by RBAC). Use **API Routes** for public submissions and anything needing a stable external endpoint.

- `POST /api/booking-request` — public; Zod-validated; rate-limited + bot-protected; creates a Lead with status `New`; triggers Resend notification; returns success message.
- `POST /api/contact` — public; same protections; email notification.
- `GET /api/tours/search` (or a server-loaded catalog query) — public tours search by keyword (tour title, destination); combinable with filters + sorting; locale-aware with `en` fallback; returns the no-results state cleanly when empty. Keep it a read-only query; no mutation, no audit log.
- Admin mutations (tours, blog, leads, assignments, etc.) — Server Actions in `/(admin)`, each calling `requirePermission(...)` first, then writing an audit entry via the audit helper.
- `middleware.ts` handles: locale resolution/redirect, **blog redirect for non-English locales → `/en/blog/...`** (see §15), and auth gating for `/(admin)`.
- `/api/webhooks/*` reserved for Phase 3 payments — not implemented in Phase 1.

---

## 9. Dashboard Modules

All modules from PRD v2.1 are present; none removed. Each module's available actions are gated by the RBAC matrix (§4).

- **Tours** — create/edit/disable/delete, images, pricing, categories, SEO, translations.
- **Categories**, **Homepage CMS** (hero banners, ordering, CTA buttons, featured tours, sections, promo blocks).
- **Hero Banners** — media + ordering + localized text.
- **Blog** — categories, featured, SEO, related, search (English content).
- **Leads (CRM)** — statuses New/Contacted/Negotiating/Confirmed/Cancelled, customer + booking info, assigned staff, internal notes, communication history.
- **Guides**, **Vehicles**, **Assignments** (guide + vehicle → confirmed bookings), scheduling.
- **Users** — Super Admin only.
- **Media Library** — local-filesystem-backed via `StorageService`.
- **SEO** — tour + blog + technical SEO.
- **Analytics** — KPIs (total leads, confirmed bookings, conversion rate, top requested tours, leads by country, monthly performance).
- **Audit Logs** — bounded scope (§13).

---

## 10. Coding Standards

- TypeScript strict; no `any` in shipped code.
- Server Components by default; add `"use client"` only where interactivity requires it.
- Validate all external input with Zod at the server boundary; share schemas between client and server.
- No hardcoded user-facing strings — route through the i18n string catalog (`/messages`) for UI chrome; content text comes from translation tables.
- Use CSS **logical properties** (`margin-inline`, `padding-inline`, `start/end`) everywhere so RTL (Arabic) works without rework.
- Keep components small and typed; colocate feature logic; do not touch unrelated code when implementing a task (strict scope discipline).
- Centralize cross-cutting concerns (RBAC guard, audit logging, locale fallback) — never inline-duplicate them.
- Use `next/image` for all imagery, sourced from local storage (`/uploads/...`, pre-optimized to WebP by Sharp).

---

## 11. Security Requirements

- **RBAC enforced server-side** on every mutation (§4). UI gating is cosmetic only.
- **Secure authentication** via Auth.js; protect all `/(admin)` routes in middleware.
- **Server-side validation** with Zod on every form and mutation; client validation is convenience only.
- **Rate limiting** on `booking-request` and `contact` endpoints (per IP/session).
- **Bot protection**: honeypot field + CAPTCHA/challenge on public forms; must remain WCAG AA accessible.
- **Activity logging** via the audit system (§13).
- Never trust client-supplied identifiers for authorization; always resolve the actor from the session.
- Secrets (Resend, DB, Auth) in environment variables only. Local media storage needs no secret; `UPLOADS_DIR`/`STORAGE_PROVIDER` are non-secret config.

---

## 12. Media Storage Rules (Local Filesystem on the VPS)

**Local filesystem storage is the committed V1 media platform** for: Tour Images, Hero Images, Blog Images, Destination Images, Guide Images, Gallery Assets, Marketing Assets. **No external media service (Cloudinary, S3, Spaces, …) is used or permitted in V1** unless a future version explicitly approves one.

- **`StorageService` abstraction is mandatory** — the application never touches the filesystem (or any vendor SDK) directly. It talks only to the provider-agnostic interface in `/lib/storage` (`upload()`, `delete()`, `getUrl()`, `exists()`). Swapping to S3 / DigitalOcean Spaces later is a single new adapter selected by `STORAGE_PROVIDER`, with **zero business-logic changes**.
- **Store only the relative file path** in Postgres (e.g. `/uploads/tours/luxor-01.webp`); never store binary in Postgres.
- Files live under `UPLOADS_DIR` (default `<cwd>/uploads`, a persistent volume in prod — outside the Next build so they survive redeploys), organized by folder taxonomy: `tours/`, `hero/`, `blog/`, `destinations/`, `guides/`, `gallery/`, `marketing/`.
- **All image uploads are processed server-side with Sharp**: EXIF-rotate, downscale oversized originals, re-encode to **compressed WebP**, and generate thumbnails when required (`/lib/storage/image.ts`).
- Uploads go through a single **RBAC-guarded** server route (`POST /api/admin/media/upload`) — Sharp → `StorageService.upload()`. No client ever writes to disk or receives storage credentials.
- Files are served under `/uploads/*` — by **nginx directly from the volume in production** (fast, bypasses Node) and by the `app/uploads/[...path]` route handler in development. Both guard against path traversal.
- Deliver via **`next/image`** for responsive sizing on top of the already-compressed WebP files (Core Web Vitals). Same-origin `/uploads` paths need no `remotePatterns`.
- Enforce required `alt` text on upload for accessibility (WCAG AA).
- Lazy-load galleries; use appropriately sized `next/image` `sizes` per breakpoint (mobile-first).

---

## 13. Audit Log Rules

Bounded scope — log administrative mutations only. **Do not log every user interaction.**

Log these action types: **create, update, delete, status change, assignment change.**

- Do **not** log reads, views, navigation, filter use, or searches.
- Each logged mutation writes exactly one `AuditLog` row: `actorId`, `actionType`, `resourceType`, `resourceId`, `createdAt`.
- Treat **status changes** (e.g. lead status transitions) and **assignment changes** (guide/vehicle → confirmed booking) as their own action types, distinct from generic updates.
- Implement centrally: a shared `logAudit(...)` helper called from Server Actions, or Prisma middleware scoped to the mutating models — one path, no duplication.

---

## 14. Mobile-First Design Requirements

Mobile is the highest priority (down to **360px**), then tablet, then desktop.

Give special attention (per PRD §16) to: Hero Banner, Navigation, Hamburger Menu, Tour Cards, Booking Forms, CTA Placement.

Design/build guidance:
- Sticky **WhatsApp** button on mobile; WhatsApp + Request Booking CTAs always reachable without scrolling far.
- Tour cards: single-column on mobile, scaling up responsively.
- Booking form: large touch targets, minimal fields visible per step, clear success state.
- Performance: image optimization (Sharp → WebP at upload + `next/image`), lazy loading, Core Web Vitals green.
- WCAG AA: contrast, focus states, keyboard nav, alt text, accessible bot-protection.
- Brand: premium AIC Travel × SoHolidays co-branding; both logos present in header/footer per PRD. **AIC Travel is the primary brand** (leads visually, primary logo placement); **SoHolidays is the official tourism partner** (supporting/partner lockup, secondary). Editorial, warm, Egypt-evoking aesthetic without stock-photo cliché. Use logical CSS properties so the same layout mirrors cleanly for Arabic RTL.

---

## 15. SEO Requirements

SEO is a first-class requirement (search-driven international tourism).

- SSR/SSG for catalog and tour detail pages; per-tour and per-blog metadata (SEO title, meta description, OG image) sourced from translation tables where localized.
- Technical SEO: `sitemap.xml`, `robots.txt`, structured data (JSON-LD for tours/articles), Open Graph, canonical URLs.
- **Sitemap core routes** — the sitemap must include: `/`, `/tours`, `/tours/[slug]` (one entry per active tour), `/about`, `/contact`, `/en/blog`, `/privacy-policy`, `/terms-and-conditions`, plus dynamically generated blog article URLs under `/en/blog/...`.
- **Blog canonical URLs always point to `/en/blog/...`** (blog is English-only, §21).
- **Non-English blog paths redirect to English** via middleware, preserving the slug (e.g. `/de/blog/nile-cruise-guide` → `/en/blog/nile-cruise-guide`).
- Localized routes for indexable content use hreflang alternates across supported locales (except blog, which is English-only).
- GA4 + Google Search Console wired in; GA4 respects cookie consent (§ GDPR).

---

## 17. Manual Translation Workflow

All translations are authored **manually**. There is no automatic or AI translation — the platform never calls an LLM or an external translation provider. Multilingual content exists only because a human entered it per locale. Does not change the translation-table strategy (§5) and never uses JSON localization.

### Flow
- English is the **source language**. Content Admin authors content in English first.
- For each additional locale (`ar`, `de`, `ru`, `tr`, `it`, `fr`), a Content Admin (or Super Admin) manually enters the translated text in the dashboard.
- Each locale's text is saved into the corresponding **translation table** (`TourTranslation`, `CategoryTranslation`, `HomepageSectionTranslation`, and the `Entity → EntityTranslation` companions for Hero Banner content, Testimonials, Destinations, FAQs, and localized SEO fields).
- Each language version is **independently editable**; a locale with no row falls back to `en` (§5).

### Applies to
Tours, Tour Categories, Homepage Sections, Hero Banner Content, Testimonials, Destinations, FAQs, and localized SEO Fields.
**Blog is excluded** (English-only, §8/§15).

### Dashboard requirements
For every translatable content type, the dashboard shows the English source alongside a per-locale manual editor. A locale simply has content or does not — no generation status is tracked, and an empty locale resolves to `en` at read time.

### Access control
Editing translations is a content operation available to the roles that already manage the underlying content (Super Admin, Content Admin) per the RBAC matrix (§4). No RBAC roles are added or changed.

---

## 18. Future Expansion Notes

Architecture must not block these (do not build them in Phase 1):

- **Phase 2:** Reviews System, Route Maps, Advanced Analytics, Marketing Campaign Management.
- **Phase 3:** Online Payments (webhook routes reserved), Promo Codes, Mobile Applications.
- **WhatsApp Business API** (logged conversations, automation) — future enhancement beyond Phase 1 `wa.me` deep links.
- **Additional languages** — supported by the translation-table pattern with no schema redesign.
- **Additional branches** — keep entities branch-extensible where reasonable, without adding branch logic now.

Never implement future-phase features in Phase 1. Keep the schema and structure open enough that they can be added later without breaking approved decisions.

---

*End of CLAUDE.md.*
