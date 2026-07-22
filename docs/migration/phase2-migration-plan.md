# Phase 2 — Detailed Migration Plan (Structured Data Only)

**Status:** Plan only — no import code exists yet. Executes only after this plan is approved.
The §5 overview/itinerary pairing was confirmed 2026-07-23.
**Source:** `aictravelDB` (SQL Server 2022 Express, read-only).
**Target:** PostgreSQL via Prisma (`DATABASE_URL` — currently Neon; confirm target env at run time).
**Excluded globally:** all media; leads (`O_Request`); hotels module; users; manual-content
tables (`O_Service`, `O_PageContent`, `O_DesVideo`, `O_DesSocialLinksNew`, `O_DesHomeBox`,
`O_Gallary`, `O_MailTemplate`); Tour 39. Per approved decisions (Phase 1 report §8).

---

## 1. Scope — What Gets Imported

| # | Legacy source | Target model | Rows in | Rows out |
|---|---|---|---|---|
| 1 | `O_TourCategory` (+Desc) | `Category` / `CategoryTranslation` | 6 (+43) | 6 (+30: en/de/ru/fr/it ×6) |
| 2 | `O_TourType` (+Desc) | `Destination` / `DestinationTranslation` | 4 (+17) | 4 (+12: en 4, de 3, ru 2, fr 3) |
| 3 | `O_Tour` (+Desc) | `Tour` / `TourTranslation` | 51 (+328) | **50** (+**183**: en 50, de 50, fr 42, ru 41) — Tour 39 excluded |
| 4 | `O_FAQ` (+Desc) | `Faq` / `FaqTranslation` | 4 (+28) | 4 (+16: en/de/ru/fr ×4) |
| 5 | `O_Blog` (+Desc en) | `BlogPost` / `BlogPostTranslation` | 4 (+22) | 4 (+4 en only) |
| 6 | `O_Fleet` | `Vehicle` | 3 | 3 |

Not scripted, by design: `HeroBanner` — `imagePath` is required and images are manual, so hero
banners are created **manually in the dashboard** after media upload. The script's only role is
to emit a handoff sheet (`docs/migration/handoff-hero-banners.md`) with the legacy headline/
subheadline text per locale (4 usable boxes; box 7 has an empty name and is dropped).

Locale map used everywhere: `1→en, 7→de, 8→ru, 12→fr` (and `21→it` where category/CMS rows
exist). LanguageIds 11/14/16/18 (ro/hu/po/cz) are skipped; skip counts land in the final report.

---

## 2. Global Transformation Rules

Applied uniformly before any row is written:

- **G1 — Trim & collapse:** every string: Unicode-trim, collapse runs of internal whitespace
  (incl. tabs) to one space. Fixes "LUXOR Tours ", "Marsa Alam Tours\t", " 3-Day PADI…", etc.
- **G2 — HTML → plain text:** no site surface renders HTML (overview/itinerary/blog body/FAQ
  answers all render as text; blog splits paragraphs on blank lines). Conversion: decode
  entities (`&nbsp;` `&rsquo;` `&mdash;`…), `<br>` → newline, block-element boundaries
  (`</p> </h2> </li>`…) → newline, strip all remaining tags, collapse 3+ newlines to `\n\n`.
- **G3 — HTML list → string[]:** for `Includes`/`Excludes`/`Highlights`: extract `<li>` items →
  entity-decode → strip tags → trim → drop empties. Fallback when no `<li>` present: split on
  `<br>`/newlines. Result feeds `included[]` / `excluded[]` / `highlights[]`.
- **G4 — Slug pipeline:** NFC-normalize → lowercase → spaces/underscores → `-` → strip
  non-`[a-z0-9-]` → collapse `-` runs → trim `-`. Uniqueness asserted per constraint scope
  (`Tour.slug` global; `TourTranslation` per `(locale, slug)`). Any collision aborts the dry
  run with a named report line (none expected — Tour 39's exclusion removed the known one).
- **G5 — Status map:** `1 → ACTIVE/enabled/published`, `2 → DISABLED` (tours) or skip-flag
  (other entities; none currently disabled except Service rows, which aren't migrated).
- **G6 — Timestamps:** legacy has none → `createdAt`/`updatedAt` = import run time (single
  fixed timestamp for the whole run, so the batch is identifiable).
- **G7 — Validation:** every transformed row is checked against the matching Zod schema in
  `/lib/validation` before insert (the script writes via Prisma directly, so this reproduces
  the server-boundary guarantees). Validation failure ⇒ row goes to the exceptions report, not
  the DB.
- **G8 — Id mapping:** legacy int id → new cuid recorded in `docs/migration/idmap.phase2.json`
  (per entity). Used for FK resolution during the run and kept as the permanent audit trail.

---

## 3. Execution Mechanics

*(§3 updated to match the implemented script — `scripts/migrate-legacy/`, run via
`npm run migrate:legacy -- <mode>`.)*

- **Tooling:** TypeScript (`tsx`), `mssql` for the read-only legacy connection (credentials via
  `LEGACY_DB_*` env vars in `.env`, never committed), Prisma client for writes (uses
  `DIRECT_URL` to bypass the pooler). No schema changes, no Prisma migrations involved.
- **Modes (exactly one):**
  - `--dry-run` (default) — transforms everything, runs all validations/uniqueness checks and
    the full reconcile against the target, **zero DB writes**; report shows what `--import`
    would do per row.
  - `--import` — performs the migration.
  - `--verify` — read-only post-import verification: presence of every expected entity,
    translation counts, currency/price/discount invariants, status + destination distribution,
    required-content non-emptiness, id-map integrity. Non-zero exit on any failed check.
- **Order (FK-driven):** Destinations → Categories → Tours (+translations) → FAQs → Blog →
  Vehicles → hero-banner handoff sheet (`docs/migration/handoff-hero-banners.md`).
- **Idempotency (deterministic matching):** for every legacy row, match (1) the persistent
  legacy-id → cuid map in `docs/migration/idmap.phase2.json` (stale entries dropped with a
  warning), then (2) the natural key — unique slug for Destination/Category/Tour/BlogPost,
  name for Vehicle, English question for Faq, `(parentId, locale)` for all translations.
  Matched rows are field-diffed: identical → **skipped (unchanged)**, different → **updated**;
  unmatched → **imported**. Re-runs can never duplicate records.
- **Curation protection:** updates only re-assert migration-owned fields. Null-valued derived
  optionals (pickupType, cancellationPolicy, empty guideLanguages, review-tour destinationId)
  and post-import admin fields (suitability flags, popularityScore, blog published/publishedAt
  after first import) are never clobbered by a re-run.
- **Safety:** target DB backed up immediately before `--import` (Neon branch or `pg_dump`).
  Rollback = restore branch/dump. The legacy DB is never written to at any point.
- **Reports:** every mode writes `docs/migration/phase2-<mode>-report.md` with per-entity
  imported/updated/skipped/warnings/errors counts, per-entity timings, total execution time,
  skipped-row reasons (incl. the Tour 39 and leads exclusions), all warnings, and (verify) the
  check results.

---

## 4. Per-Entity Specifications

### 4.1 Category (6)

| Target | Source / rule |
|---|---|
| `slug` | en `PageUrl` → G4 (`cairo-tours`, `luxor-tours`, `sea-trips`, `daily-diving`, `safari-from-hurghada`, `funny-tours`) |
| `order` | `SortOrder` |
| translations | `Name` (G1), `Description` (G2) for en/de/ru/fr/it |
| Dropped | `Image` (media), `TourTypeId` (hierarchy flattened), `MetaDescription`/`MetaKeyword` (no target fields — logged), ro/po/cz rows (13) |

### 4.2 Destination (4) — from `O_TourType`

| Target | Source / rule |
|---|---|
| `slug` | `ReferenceName` minus " Tours" suffix → G4 (`hurghada`, `sharm-el-sheikh`, `marsa-alam`, `cairo`) |
| `order` | `SortOrder` |
| `featured` | `false` (curate later) |
| translations `name` | Desc `Name` minus locale-appropriate " Tours"/"Touren"/"туры" suffix where present (G1); review pass over the 12 rows in the dry-run report |
| translations `description` | Desc `Description` (G2) |
| Dropped | `Image` (media), ro/cz rows (5) |

### 4.3 Tour (50) — `O_Tour` minus Tour 39

| Target | Source / rule |
|---|---|
| `slug` | en `PageUrl` → G4 |
| `categoryId` | id-map(`TourCategoryId`) |
| `destinationId` | **Derivation rule (approved decision 4):** category-based, only where semantically valid: categories **Sea Trips, SAFARI From Hurghada, Daily Diving, Funny Tours → Hurghada** — *except* TourIds **50, 51, 52** (Aswan tours misfiled under Sea Trips) → `null` + review. Categories **Cairo Tours (5 tours: 7, 20, 35, 37, 47)** and **LUXOR Tours (4 tours: 10, 11, 46, 49)** contradict the legacy chain (all chain to "Hurghada Tours") → `null` + review. Net: **38 tours get Hurghada, 12 go to the manual-review list** |
| `durationDays` | Parse en `Length`: `N day(s)`→N; `N night(s)`→N+1 if larger; hour/minute-only ("3 hours")→**1**; unparseable→1 + review list. Verbatim value preserved as a custom fact (§4.4) |
| `basePrice` | `Price`; **discount case:** if en `PriceBeforeDiscount` is numeric and > `Price` → `basePrice`=PriceBeforeDiscount, `discountType=FIXED`, `discountValue`=`Price` (FIXED = discounted price per schema), no time window. 14 en rows carry the field; non-numeric/≤Price → no discount + review list |
| `currency` | **`"USD"` for all 50 (approved decision 7 — verified against the live site)** |
| `tourType` | Proposed controlled vocabulary (free-text field feeding the catalog filter): `durationDays > 1` → **"Multi-day"**; else by category: Daily Diving → **"Diving"**, SAFARI From Hurghada → **"Safari"**, Sea Trips → **"Sea trip"**, Cairo/LUXOR/Funny Tours → **"Day tour"**. Editable per-tour in the dashboard afterwards |
| `pickupType` | en `PickUpPoint` contains "hotel" (case-insensitive) → `HOTEL_INCLUDED`; anything else → `null` + verbatim custom fact |
| `cancellationPolicy` | Pattern-match en `ChangesCancellations` ("24 hour" → `FREE_24H`, "48" → `FREE_48H`, "72" → `FREE_72H`, "non-refundable" → `NON_REFUNDABLE`); no match → `null`, text kept as custom fact |
| `guideLanguages` | Parse en `TourGuide` for language names → ISO 639-1 codes; unparseable → `[]` + verbatim custom fact |
| `featured` | `BestSeller` |
| `status` | G5 (39 ACTIVE, 11 DISABLED) |
| `popularityScore` | **default 0 (approved decision 3 — `SortOrder` not used)** |
| `familyFriendly`/`coupleFriendly`/`soloFriendly` | `false` — post-migration curation |
| Dropped | `Code` (junk), `Image` (media), `SortOrder`, `ReferenceName` |

### 4.4 TourTranslation (183 rows: en 50, de 50, fr 42, ru 41)

| Target | Source / rule |
|---|---|
| `title` | `Name` (G1) |
| `overview` | `ShortDescription` (G2) — confirmed (§5) |
| `itinerary` | `Description`, converted to the renderer's **"one day per line, `Day :: detail`"** format — confirmed (§5): multi-day tours split on their Day markers; single-day tours become one `Day 1 :: <full text>` line |
| `highlights[]` / `included[]` / `excluded[]` | `Highlights` / `Includes` / `Excludes` via G3 |
| `customFacts[]` | Assembled per locale in `Label :: Value` form from whichever of these are non-empty: `Duration :: <Length>`, `Location :: <Location>`, `Pick-up :: <PickUpPoint>`, `Safety :: <Safety>`, `What to bring :: <WhatToPring>`, `Cancellation :: <ChangesCancellations>` (only when the enum didn't absorb it), `Tour guide :: <TourGuide>` (only when guideLanguages didn't absorb it). All values via G2. **Labels are English in every locale** (no legacy label translations exist) — flagged for content-team cleanup |
| `metaDescription` | `MetaDescription` (G1) |
| `slug` | **`null` for every locale** — routing resolves only the base `Tour.slug` (`getTourBySlug`), and legacy non-en `PageUrl` values are localized titles (Cyrillic/spaced), not slugs. Decision recorded during implementation |
| `seoTitle`, `ogImagePath` | `null` (no source / media) |
| Dropped | `MetaKeyword` (obsolete), `PricePer` ("person" everywhere — implicit in new model), `PriceBeforeDiscount` (absorbed into base discount) |

### 4.5 Faq (4) + FaqTranslation (16)

`order`←`SortOrder`; `tourId`=null (all general); `question`←`Question` (G1),
`answer`←`Answer` (G2), locales en/de/ru/fr. Drops: ro/po/cz rows (12), `ReferenceName`.

### 4.6 BlogPost (4) + BlogPostTranslation (4, en only)

`slug`←en `LinkUrl` → G4 (fixes embedded spaces); `published`=true; `publishedAt`=import
timestamp (no legacy source; keeps posts visible/sortable — override manually if real dates are
known); `categoryId`=null; `featured`=false. Translation: `title`←`Name`,
`excerpt`←`ShortDescription`, `body`←`Description` via G2 **with paragraph preservation**
(blank-line separated, matching the renderer's `split(/\n\n+/)`). Drops: 18 non-en description
rows (English-only blog), `SortOrder`, `Image` (media).

### 4.7 Vehicle (3)

| Legacy | `name` | `capacity` (=Max) | `type` (manual map) | `status` |
|---|---|---|---|---|
| Kia sportage 2022 | Kia Sportage 2022 | 4 | car | ACTIVE |
| mini bus | Mini Bus | 14 | minibus | ACTIVE |
| Haice2024 | Toyota HiAce 2024 | 8 | van | ACTIVE |

Name normalization shown above is part of the plan (approve or amend). Drops: `Min` capacity
(1/5/4 — no field), `Image`, all `O_Fleet_Description` translation rows (Vehicle is untranslated).

---

## 5. Overview / Itinerary Pairing — Awaiting Confirmation (decision 5)

Renderer constraints discovered in the app (`tours/[slug]/page.tsx`): `overview` renders as one
plain paragraph; `itinerary` is parsed **line-by-line as day entries** (`Day label :: detail`).
Legacy `Description` is narrative HTML, so it cannot be copied over verbatim.

Five real English examples (full text in the dry-run workpapers):

| Tour | ShortDescription | Description |
|---|---|---|
| 5 — Safari Sahara Park | 154 chars, plain: "Staring with Jeep to Bedouin Camp, quad (ATV), spider car… Bedouin party." | **Near-identical duplicate** of ShortDescription (156 chars) |
| 10 — Luxor By Bus | 244 chars, plain teaser: "Explore one of the ancient world's oldest capitals on an 18-hour day trip…" | 321 chars, HTML: "Enjoy the day in old capital of Egypt (Luxor) with a big bus… Visiting Karnak temple, Hatshepsut temple, 3 Tombs…" |
| 16 — Dolphin House VIP | 233 chars, plain teaser | 1,169 chars, HTML narrative: pick-up → boat pier → snorkeling → lunch → return |
| 20 — CAIRO BY BUS | 228 chars, plain teaser | 1,431 chars, HTML narrative: transfer → Giza Plateau → Sphinx → lunch → Egyptian Museum |
| 46 — 2-Day Luxor Tour | 179 chars, plain teaser | 2,842 chars, HTML **with explicit "Day 1/", "Day 2/" markers** |

**Confirmed mapping (approved 2026-07-23):**

- `overview` ← `ShortDescription` (already plain, teaser-length — exact fit for the single-`<p>` render).
- `itinerary` ← `Description`, converted:
  - **Multi-day tours** (Day markers present, e.g. Tour 46): split on the markers →
    `Day 1 :: <that day's text>` per line. Renders as proper day cards.
  - **Single-day tours:** one line — `Day 1 :: <full plain-text description>`. Renders as a
    single day card containing the full narrative.
  - **Duplicate case** (Tour 5): Description ≈ ShortDescription → itinerary still gets the one
    line; content team may enrich later.

**✅ Gate cleared:** pairing confirmed as proposed — the TourTranslation spec in §4.4 is final.

---

## 6. Recorded Exclusions (this run)

- **Tour 39** + its 7 description rows — confirmed duplicate of Tour 2 (approved decision 2).
- **All 355 `O_Request` rows** — leads not migrated (approved decision 1).
- Retired-language content: 141 tour, 13 category, 5 destination, 12 FAQ, 18 blog description
  rows (ro/hu/po/cz + non-en blog).
- Hotels module, users, customers, logs, media tables, manual-content tables — per Phase 1 §4.

## 7. Post-Import Verification (script-emitted checklist)

1. Row counts match §1 "Rows out" exactly.
2. `Tour.slug` and `(locale, slug)` translation uniqueness hold (DB constraints + explicit query).
3. Every `Tour.categoryId` resolves; 38 tours have Hurghada destination, 12 have null.
4. Locale fallback works: spot-check an `it`/`ru`-missing tour page renders `en` content.
5. All 50 tours: `currency = "USD"`, `basePrice > 0`; the ~14 discount tours satisfy
   `discountValue < basePrice`.
6. No empty required strings (`title`, `overview`, `itinerary`, `question`, `answer`).
7. Catalog filter shows the proposed `tourType` vocabulary and nothing else.
8. Sitemap includes 39 active tour URLs + 4 blog URLs (disabled tours excluded).

## 8. Manual Follow-Ups After the Scripted Import

Media uploads (tours/blog/categories/destinations) → hero banners in dashboard (using the
handoff sheet) → destination assignment for the 12-review tours → family/couple/solo flags,
pickup/cancellation curation, custom-fact label translations → admin user creation (fresh
credentials) → homepage sections / services / videos / social / contact content authored
manually → set `publishedAt` on blog posts if real dates are known.

---

*Plan ends. All content decisions are resolved; nothing executes until the plan itself is approved.*
