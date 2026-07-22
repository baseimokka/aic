# AIC Travel × SoHolidays — Tourism Platform

Premium Egypt tourism platform: public multilingual marketing site (booking **requests** only —
no online payments in Phase 1) plus a full internal management console (CRM, CMS, operations).
Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma/PostgreSQL, Auth.js, Zod and
Resend. Architecture and rules live in `CLAUDE.md` (implementation source of truth) and the PRD.

## Commands

```bash
npm run dev          # dev server (http://localhost:3000)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build (prerenders all locale/tour pages)
npm run start        # serve the production build
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed dev data (guarded; see prisma/seed.ts)
npm run db:studio    # prisma studio
npm run migrate:legacy  # FROZEN one-shot legacy import tooling — do not run again
                        # (migration completed & verified 2026-07-23; see docs/migration/)
```

## Environment variables

Copy these into `.env` locally and into the production environment. `.env*` is gitignored —
never commit secrets.

### Required in production

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (pooled) — **secret** |
| `DIRECT_URL` | Postgres direct (non-pooled) connection for Prisma migrations — **secret** |
| `AUTH_SECRET` | Auth.js session/JWT secret (≥32 random bytes) — **secret** |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://www.aictravel.com` — canonicals, hreflang, sitemap, robots and OG URLs derive from it |
| `RESEND_API_KEY` | Resend API key for booking/contact emails — **secret** |
| `NOTIFY_EMAIL_TO` | Inbox that receives new booking/contact notifications |
| `NOTIFY_EMAIL_FROM` | From-address for internal notifications (verified Resend domain) |
| `BOOKING_EMAIL_FROM` | From-address for customer confirmation emails (verified Resend domain) |

### Optional / infrastructure

| Variable | Purpose |
|---|---|
| `STORAGE_PROVIDER` | Media storage adapter; `local` (default) — VPS filesystem via `StorageService` |
| `UPLOADS_DIR` | Absolute path of the persistent uploads volume (default `<cwd>/uploads`); nginx serves `/uploads/*` from it in production |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Only if media is ever served from another origin/CDN; empty for same-origin `/uploads` |
| `TRUSTED_PROXY_HOPS` | Number of reverse-proxy hops in front of Node (rate-limit IP resolution behind nginx) |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement id — analytics load only after cookie consent |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Google Search Console site-verification token |
| `SEED_FORCE` | Opt-in guard override for `db:seed` — never set in production |
| `SEED_PASSWORD` | Password for dev seed accounts (`db:seed` refuses to run without it) — never set in production |

### Frozen migration tooling only (safe to remove from production env)

`LEGACY_DB_SERVER`, `LEGACY_DB_PORT`, `LEGACY_DB_NAME`, `LEGACY_DB_USER`, `LEGACY_DB_PASSWORD`
— read-only credentials used once by `scripts/migrate-legacy/` (kept frozen as the migration
audit trail; excluded from lint on purpose).

## Key locations

- `app/[locale]/(site)` public site · `app/[locale]/(admin)/dashboard` management console
- `lib/rbac` permission matrix (single source for server guards + UI gating)
- `lib/storage` provider-agnostic media storage (Sharp → WebP pipeline)
- `prisma/schema.prisma` data model — translation tables per entity, `en` fallback
- `docs/migration/` legacy-migration analysis, plan, run reports, id-map and post-migration audit
- `docs/final-prelaunch-checklist.md` launch checklist (manual review, deployment, post-deploy)
