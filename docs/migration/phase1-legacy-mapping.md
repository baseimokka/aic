# Phase 1 — Legacy Database Analysis & Mapping Report

**Source:** `aictravelDB` — Microsoft SQL Server 2022 Express (remote, <legacy-server>)
**Destination:** Prisma + PostgreSQL (`prisma/schema.prisma`, current as of 2026-07-23)
**Scope:** Structured data only. All media (images, files, galleries) explicitly excluded — uploaded manually after migration.
**Status:** Analysis only. No migration code written, no data modified. Awaiting approval.

---

## 1. Executive Summary

The legacy database is a small custom multilingual CMS (50 tables, all `dbo.O_*`), built on an
`Entity` + `Entity_Description` translation pattern that maps almost 1:1 onto the new platform's
`Entity` + `EntityTranslation` architecture. Content volume is modest and migrates cleanly:

| What | Legacy count | Migrates |
|---|---|---|
| Tours | 51 (40 active, 11 disabled) | ✅ All 51 |
| Tour translations | 328 rows / 8 languages | ✅ 187 rows (en 51, de 51, fr 43, ru 42) — 141 rows in retired languages dropped |
| Tour categories | 6 | ✅ All 6 (+30 translation rows) |
| Tour types (→ Destinations) | 4 | ✅ As destinations (proposal, §5.3) |
| FAQs | 4 | ✅ All 4 (+16 translation rows) |
| Blog posts | 4 | ✅ 4 (English only per PRD; 18 non-en rows dropped) |
| Fleet (→ Vehicles) | 3 | ✅ All 3 |
| Hero header boxes (→ HeroBanner) | 5 | ⚠️ 4 usable, 1 broken |
| Booking/contact requests (→ Leads) | 355 | ⚠️ ~15 genuine; ~340 spam/test/empty — **decision needed** |
| Hotels module (5 tables) | 3 hotels + pricing | ❌ No hotels feature in new platform — not migrated |
| Users | 2 | ❌ Recreate manually (incompatible auth) |
| Media (3 tables, ~3.1k rows) | — | ❌ Excluded by instruction |

**The single hardest item:** legacy leads store all structured data (name, phone, hotel, dates,
travelers) as **rendered HTML email tables** inside `O_Request.Message` — migration requires HTML
parsing, and the legacy form never captured `country`, which is **required** on the new `Lead`.

---

## 2. Legacy Database Overview

- 50 tables, all in `dbo`, all prefixed `O_`. No views, no stored procedures, no triggers.
- Pattern: base table (`SortOrder`, `Status smallint` 1=active/2=disabled, `ReferenceName`,
  `Image`) + `_Description` table with composite PK `(<ParentId>, LanguageId)`.
- Integer identity PKs everywhere. FKs enforced (45 constraints, all `NO ACTION`). Verified: **zero
  orphaned rows** on every FK and on the two tables lacking a Language FK.
- **No timestamps on any content table** (only `O_Request.Date`, `O_User.DateAdded`). All migrated
  `createdAt`/`updatedAt` values will be set at import time.
- Site history note: artifacts of a previous "MoonTours Hurghada" site remain (admin user,
  `bonvoyage.tours` / personal Facebook links in the retired `O_DesSocialLinks` table).

### Legacy languages → new `Locale` enum

| LanguageId | Code | Name | Legacy status | New locale | Action |
|---|---|---|---|---|---|
| 1 | en | English | active | `en` | ✅ Migrate (canonical) |
| 7 | de | German | active | `de` | ✅ Migrate |
| 8 | ru | Russian | active | `ru` | ✅ Migrate |
| 12 | fr | French | active | `fr` | ✅ Migrate |
| 21 | it | Italy | active | `it` | ⚠️ Enum exists but legacy has **zero tour content** in it; only scattered CMS rows |
| 11 | ro | Romanian | disabled | — | ❌ Drop (not in new enum) |
| 14 | hu | Hungarian | disabled | — | ❌ Drop |
| 16 | po | Poland | disabled | — | ❌ Drop (note: non-standard code, "pl" would be standard) |
| 18 | cz | Czech | disabled | — | ❌ Drop (48 tour translations exist — most complete after en/de; confirm you accept the loss) |
| — | — | — | — | `ar`, `tr` | No legacy content; authored manually later |

---

## 3. Mapping — Tables That Migrate

Disposition legend: **D** = migrate directly · **T** = requires transformation ·
**I-M** = ignore (media) · **I-O** = ignore (obsolete) · **M** = missing in new schema ·
**R** = needs manual review

### 3.1 `O_Tour` → `Tour` (51 rows)

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `TourId` | — (new cuid) | T | Keep legacy→new id map during import (needed for FKs + lead linking) |
| `SortOrder` | — | M / R | `Tour` has no manual sort order. Closest is `popularityScore` (could invert SortOrder into it) — decide |
| `Status` (1/2) | `status` | T | 1 → `ACTIVE` (40), 2 → `DISABLED` (11) |
| `ReferenceName` | — | I-O | Internal label; the real title lives in `_Description.Name` (en complete). 5 rows have whitespace defects |
| `Image` | — | I-M | Media excluded |
| `Price` | `basePrice` | T / R | Legacy has **no currency column**. Values look like EUR/USD-range day-trip prices — you must confirm the currency (`Tour.currency` defaults `USD`) |
| `TourCategoryId` | `categoryId` | T | Via category id-map |
| `Code` | — | I-O | Junk: "123" in 50 of 51 rows |
| `BestSeller` | `featured` | D | bit → boolean |
| — | `slug` (required, unique) | T / R | From en `_Description.PageUrl`, lowercased. **1 collision** (§6.1) must be resolved first |
| — | `durationDays` (required) | T / R | Parse from en `_Description.Length` free text ("1 day", "3 hours"…). Hour-based trips need a rule (floor to 1?) |
| — | `tourType` (required) | R | No legacy equivalent with these semantics — needs a default/decision |
| — | `destinationId` | R | Proposal: derive from `O_TourType` (§5.3); all legacy categories sit under "Hurghada Tours" |
| — | `familyFriendly` / `coupleFriendly` / `soloFriendly` | M | Not in legacy; default `false`, curate later |
| — | `discountType/Value/StartsAt/EndsAt` | T / R | Legacy `_Description.PriceBeforeDiscount` (nvarchar, per-language, 14/51 en rows): if present → `basePrice` = PriceBeforeDiscount, `discountType=FIXED`, `discountValue` = legacy `Price`. Per-language inconsistency — review each |
| — | `pickupType`, `cancellationPolicy`, `guideLanguages` | T / R | Legacy free-text equivalents exist per language (see below); enum mapping is judgement work |

### 3.2 `O_Tour_Description` → `TourTranslation` (187 of 328 rows migrate)

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `TourId`, `LanguageId` | `tourId`, `locale` | T | Id-map + locale-map; rows in ro/hu/po/cz (141) dropped |
| `Name` | `title` | T | Trim whitespace (leading spaces present) |
| `MetaKeyword` | — | I-O | Meta keywords are dead SEO practice; no target field |
| `MetaDescription` | `metaDescription` | D | |
| `PageUrl` | `slug` | T | Localized slugs supported (`@@index([locale, slug])`). Casing normalize + collision check |
| `Length` | — (feeds `Tour.durationDays`) | T | Free text; also worth keeping verbatim in `customFacts` ("Duration :: 1 day") |
| `Location` | `customFacts[]` | T / R | No dedicated field; propose "Location :: …" custom fact |
| `PickUpPoint` | — (feeds `Tour.pickupType`) or `customFacts[]` | T / R | Free text → enum where clear, else custom fact |
| `Includes` | `included[]` | T | HTML `<ul><li>` list → string array (strip tags, split on `<li>`) |
| `Excludes` | `excluded[]` | T | Same (49/51 en rows populated) |
| `Highlights` | `highlights[]` | T | Same |
| `ChangesCancellations` | — (feeds `Tour.cancellationPolicy`) or `customFacts[]` | T / R | Free text → enum attempt |
| `Safety` | `customFacts[]` | T / R | 42/51 en rows; no dedicated field |
| `TourGuide` | — (feeds `Tour.guideLanguages[]`) | T / R | Parse language names → ISO 639-1 codes |
| `WhatToPring` *(sic)* | `customFacts[]` | T / R | "What to bring :: …" |
| `ShortDescription` | `overview` | T / R | **Decision:** propose ShortDescription → `overview`, `Description` → `itinerary` (both required in new schema). Legacy "Description" is general prose, not a day-by-day itinerary — review whether this reads acceptably |
| `Description` | `itinerary` | T / R | HTML blob; new fields are strings so HTML can carry over — confirm rendering expectations |
| `PriceBeforeDiscount` | — (feeds `Tour` discount) | T / R | See §3.1 |
| `PricePer` | — | I-O / R | "person" in all 51 en rows; new model prices per person implicitly |
| — | `seoTitle`, `ogImagePath` | M | seoTitle falls back to title; ogImage is media |

### 3.3 `O_TourCategory` → `Category` (6 rows) & `O_TourCategory_Description` → `CategoryTranslation`

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `TourCategoryId` | — (new cuid) | T | Id-map |
| `SortOrder` | `order` | D | |
| `Status` | — / `archivedAt` | T | All 6 active; if any were 2 → set `archivedAt` |
| `ReferenceName` | — | I-O | Trailing whitespace present ("LUXOR Tours ") |
| `Image` | — | I-M | |
| `TourTypeId` | — | M / R | New schema has no category→type hierarchy; relationship dropped (types become Destinations, §3.4). All 6 categories point at type 2 anyway |
| Desc `Name` | `name` | T | Trim |
| Desc `Description` | `description` | D | |
| Desc `PageUrl` | `Category.slug` (from en) | T | Lowercase; non-en localized slugs have **no home** on `CategoryTranslation` (no slug field) — dropped, flag |
| Desc `MetaDescription` | — | **M** | `CategoryTranslation` has no SEO fields — data loss unless schema grows (do **not** change schema in this phase; log it) |
| Desc `MetaKeyword` | — | I-O | |

Coverage: en 6, de 6, ru 6, fr 6, it 6 → 30 rows migrate (ro 6, po 6, cz 1 dropped).

### 3.4 `O_TourType` → `Destination` (4 rows) — **proposal, needs your approval**

Legacy "types" are geographic: *Hurghada Tours, Sharm el sheikh Tours, Marsa Alam Tours, Cairo
Tours*. The new schema's `Destination` is the natural fit; nothing else maps to it.

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `TourTypeId` | — (new cuid) | T | |
| `ReferenceName` | — (basis for `slug`) | T | Strip " Tours" suffix + slugify → "hurghada", "sharm-el-sheikh"… (`Marsa Alam Tours` has a trailing tab) |
| `SortOrder` | `order` | D | |
| `Status` | — | T | All active |
| `Image` | `heroImagePath` | I-M | Manual upload |
| Desc `Name` | `DestinationTranslation.name` | T | Strip " Tours" — review wording per locale |
| Desc `Description` | `description` | D | |
| — | `Tour.destinationId` | R | All legacy categories/tours hang under "Hurghada Tours" (= departure hub). Either set every migrated tour's destination to Hurghada, or leave null and curate. **Business decision** |

Coverage: en 4, de 3, ru 2, fr 3 (ro 2, cz 3 dropped).

### 3.5 `O_FAQ` → `Faq` / `FaqTranslation` — cleanest mapping in the migration

| Legacy column | Prisma field | Disposition |
|---|---|---|
| `FaqId` | — (new cuid) | T |
| `ReferenceName` | — | I-O (it's just the en question) |
| `SortOrder` | `order` | D |
| `Status` | — | T (all active) |
| Desc `Question` / `Answer` | `question` / `answer` | D (strip HTML from answers if present) |
| — | `tourId` | — (null — all are general FAQs) |

4 FAQs; translations en/de/ru/fr = 16 rows migrate (ro/po/cz 12 dropped).

### 3.6 `O_Blog` + `O_Blog_Description` → `BlogPost` / `BlogPostTranslation` (English only)

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `BlogId` | — (new cuid) | T | |
| `SortOrder` | — | I-O | No ordering on posts |
| `Status` | `published` | T | 1 → `true` (all 4) |
| `ReferenceName` | — | I-O | |
| `Image` | `coverImagePath` | I-M | Manual upload |
| — | `categoryId` | M | No legacy blog categories → null |
| — | `publishedAt` | M / R | Unknown; propose import date or leave null — decide |
| Desc(en) `Name` | `title` | D | |
| Desc(en) `Description` | `body` | T | HTML blob (1.2k–4.6k chars) |
| Desc(en) `ShortDescription` | `excerpt` | D | |
| Desc(en) `LinkUrl` | `slug` | T | Contains spaces/double-spaces ("TOP SEA TRIPS FOR  KIDS") — must slugify |
| Desc non-en (18 rows: de/ru/fr/po/cz/it) | — | I-O | Blog is English-only per PRD §21 — **deliberate data loss, confirm** |

### 3.7 `O_Fleet` + `O_Fleet_Description` → `Vehicle` (3 rows)

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `FleetId` | — (new cuid) | T | |
| `ReferenceName` (or en Desc `Name`) | `name` | D | "Kia sportage 2022", "mini bus", "Haice2024" |
| `Min` | — | **M** | New model has single `capacity`; min lost (1/5/4) |
| `Max` | `capacity` | D | 4/14/8 |
| `Status` | `status` | T | 1 → `ACTIVE` |
| `Image` | — | I-M | |
| — | `type` (required) | R | Derive manually: car / minibus / van |
| Desc translations (14 rows) | — | I-O | `Vehicle` is admin-only, untranslated |

### 3.8 `O_DesHeaderBox` + Desc → `HeroBanner` / `HeroBannerTranslation` (5 rows)

| Legacy column | Prisma field | Disposition | Notes |
|---|---|---|---|
| `HeaderBoxId` | — (new cuid) | T | |
| `SortOrder` | `order` | D | |
| `Status` | `enabled` | T | |
| `Image` | `imagePath` | I-M / **R** | `imagePath` is **required** — banners cannot be created until images are manually uploaded. Sequencing constraint for the media phase |
| Desc `Name` | `headline` | T / R | **Box 7 has an empty en name** and box 6 has an empty description; `headline` is required — fix or skip box 7 |
| Desc `Description` | `subheadline` | T | Some rows contain HTML/span markup — strip |
| — | `ctaUrl`, `ctaLabel`, `showSearch`, `startsAt/endsAt` | M | Not in legacy; defaults/null |

### 3.9 `O_Request` → `Lead` (355 rows; ~15 genuine — **decision required**)

`Message` is a **rendered HTML email table**; every structured field must be parsed out of `<td>`
cells. Two layouts exist (per `Type`):

*Book request fields:* Name, Email, Phone, Hotel, Room No, Tour Name (slug-like, e.g.
"Luxor-By-Bus"), Tour Date, No of Adult, No of Child, Comments.
*Customize request fields:* Name, Email, Phone, single/couple/family/group, Adults number,
Children number, traveling Date, Duration, Tour Type, Comments.

| Legacy column / parsed field | Prisma field | Disposition | Notes |
|---|---|---|---|
| `RequestId` | — (new cuid) | T | |
| `FromEmail` | `email` | T / R | Empty in 276 rows; garbage/injection strings in ~8 |
| `Date` | `createdAt` | D | Range 2025-08-10 → 2026-07-02 |
| `IsRead` | — | I-O | 354 unread / 1 read; no equivalent (all land as `status=NEW`) |
| `Type` | `source` | T | e.g. "Book request" → `legacy-booking`, "Custmize…" → `legacy-customize` |
| Parsed: Name | `fullName` (required) | T | |
| Parsed: Phone | `phone` (required) | T | |
| Parsed: Hotel / Room No | `hotelName` / `roomNumber` | T | Fields exist on new `Lead` — direct after parse |
| Parsed: Tour Name | `tourId` | T / R | Match against migrated tour slugs; unmatched → null + keep text in `specialRequests` |
| Parsed: Tour Date / traveling Date | `preferredDate` | T | ISO-ish strings observed |
| Parsed: Adults / Children | `adults` / `children` | T | Spam rows contain garbage ("9pkcli") — validate, default 1/0 |
| Parsed: Comments (+ Customize extras: group type, Duration, Tour Type) | `specialRequests` | T | Concatenate the extras with labels |
| — | `country` (**required**) | **M / R** | Never captured by legacy forms. Options: placeholder ("Unknown"), infer from phone prefix, or leave for sales cleanup — **decide** |
| — | `locale` | M | Unknown → default `en` |
| — | `status` | T | All → `NEW` (no pipeline data in legacy) |
| — | quoted/deposit/payment fields | M | No legacy equivalents; defaults |

**Spam/test profile (must decide inclusion policy before Phase 2):**

| Bucket | Rows |
|---|---|
| Customize with empty email | 276 |
| `<spam-bot address>` (bitcoin-spam bot; 38 Book + 2 Customize) | 40 |
| `<dev-test address A>` (developer tests — fake domain) | 19 |
| SQL-injection-style email strings (`(.))'",))(` etc.) | 5 |
| Numeric junk emails (7785, 6591, 1885) | 3 |
| `<dev-test address B>` tests ("Test2" hotel) | 2 |
| **Plausibly genuine remainder** | **~10–15** |

Recommendation: migrate only rows passing email validation **and** not in the spam/test buckets
(final list produced for sign-off before import). Alternative: skip lead migration entirely —
the genuine set is tiny and recent enough to handle by hand.

---

## 4. Tables NOT Migrated

### 4.1 Media (excluded by instruction)

| Table | Rows | Note |
|---|---|---|
| `O_Image_Bank` | 1,855 | Filename + extension registry. No orphan references from tour/hotel images (verified) |
| `O_Tour_Image` | 1,291 | Images duplicated **per language** (en 295, de/fr/cz 332 each; none for ru) — localized `Alt`/`Description` text will be lost; new `TourImage.alt` re-entered at manual upload |
| `O_Hotel_Image` | 7 | Hotels module anyway (§4.2) |
| `Image` columns on all base tables | — | Ignored everywhere |
| `O_Gallary` + Desc | 12 + 60 | Gallery is media; names are only labels ("Sea Trips", "Luxor"…). No gallery entity in new schema |

### 4.2 Hotels module — no feature in the new platform

`O_Hotel` (3), `O_HotelCategory` (2), `O_RoomType` (3), `O_Price` (1 — a "New Year 2018" rate,
stale), `O_Price_Description` (1), `O_Hotel_Image` (7), plus translations. The new platform treats
"Hotels reservation" as a service description only. Data is tiny and stale. **Not migrated**
(flag: if hotels ever become Phase-2+ scope, re-extract then).

### 4.3 Obsolete / replaced by platform features

| Table | Rows | Reason |
|---|---|---|
| `O_User`, `O_UserGroup` | 2 + 2 | Legacy custom auth (hash format incompatible with Auth.js); JSON permission blobs ≠ new fixed RBAC. One account belongs to the defunct MoonTours site. **Recreate admins manually** |
| `O_MailTemplate` | 5 | Email now code-based via Resend |
| `O_DesSocialLinks` | 8 | Entire table disabled (Status=2); contains previous-site links (VK/bonvoyage) |
| `O_Customers` | 1 | Single test row ("AHMED Gaber") |
| `O_Log`, `O_LogDetail` | 0 | Empty; new `AuditLog` starts fresh |
| `O_City`, `O_Region` + Desc | 0 | Empty |
| `O_Language` | 9 | Becomes the locale-mapping table in migration code only; not data |

### 4.4 Needs a manual-content decision (no clean model target)

| Table | Rows | Contents | Suggested home |
|---|---|---|---|
| `O_PageContent` + Desc | 6 + 35 | "About" (1.8k chars), "Welcome", "Footer", "transfer prices", "Offers", "May Offer" | About page copy is already handled per verified-facts process; Welcome/Offers → `HomepageSection` candidates; "transfer prices" likely obsolete. **Review each block** |
| `O_Service` + Desc | 7 + 37 | Tours & Excursions, Hotels reservation, Airport Transfers, Visa Assistance, SIM Cards, Airline tickets, Local Guide Services (disabled) | No Services entity in new schema. Could become a `HomepageSection` (type "services") or static content — **decide** |
| `O_DesVideo` + Desc | 6 + 38 | YouTube iframe embeds | No video entity — decide (homepage section body or drop) |
| `O_DesSocialLinksNew` + Desc | 6 + 26 | FB, IG (real), TikTok/YouTube (placeholder URLs), WhatsApp ×2 (duplicate) | Social links live in site config/footer, not DB — re-enter manually |
| `O_DesHomeBox` + Desc | 1 + 8 | Contact info: +20129313333, info@Aic-Travel.com, "Elkawther - Hurhada" | Site config/contact page — manual |

---

## 5. Data Quality Findings

### 5.1 Duplicates
- **Duplicate tour:** `TourId 39` ("PROFESSIONAL DIVING", €332) carries a **copy of TourId 2's**
  English description, title, and slug ("3-Day-PADI-Open-Water-Diving-Course", also duplicated in
  cz). Two different base rows, same content. Resolve before import — `Tour.slug` is unique.
- Duplicate WhatsApp social link (ids 4 & 5, identical URL).
- `<dev-test address B>` duplicate test bookings.

### 5.2 Orphaned / invalid references
- **None.** All 45 FKs verified clean; `O_Tour_Description.LanguageId` (no FK defined) also has
  zero orphans; `O_Tour_Image`/`O_Hotel_Image` → `O_Image_Bank` fully consistent.
- Soft orphans: TourTypes 3–5 (Sharm, Marsa Alam, Cairo) have **no categories and no tours**;
  they migrate as empty Destinations.

### 5.3 Invalid / junk data
- `O_Tour.Code` = "123" in 50/51 rows — worthless.
- ~340 of 355 requests are spam/tests/empty (§3.9), including SQL-injection-attempt strings
  stored as emails (they did no harm — parameterized or lucky — but confirm they're excluded).
- Hero box 7: empty name; hero box 6: empty description.
- Placeholder social URLs (tiktok.com, youtube.com roots).
- Whitespace defects: 5 tour names, "LUXOR Tours ", "Marsa Alam Tours\t", "Sea Trips\t" (gallery),
  leading spaces in FAQ reference names. All migrated strings should be trimmed + inner-space
  collapsed.
- Legacy stored prices per-language as text in two fields (`PriceBeforeDiscount`, `PricePer`) —
  inconsistently filled across locales.

### 5.4 Coverage gaps (informational)
- Italian: active language, **0 tour translations**, partial CMS coverage only (categories 6,
  services 6, blog 3…). The `it` locale will rely on `en` fallback almost everywhere.
- Russian tour translations: 42/51; French: 43/51 (fallback covers the rest).
- Czech has 48/51 tour translations that will be **dropped** (not a supported locale) — the
  single biggest content loss of the migration; flagging for explicit sign-off.
- Hotel translations exist only in en+de (moot — hotels not migrated).

### 5.5 Structural gaps to plan around (no schema changes proposed now)
- Required new fields with no legacy source: `Lead.country`, `Tour.tourType`,
  `Tour.durationDays` (parseable), `Vehicle.type`, `HeroBanner.imagePath` (media),
  `BlogPost.publishedAt` (optional).
- `CategoryTranslation` has no SEO fields → legacy category `MetaDescription` (localized) has
  nowhere to go.
- No legacy timestamps → all `createdAt` values are synthetic except leads.

---

## 6. Open Decisions Before Phase 2

1. **Leads:** migrate filtered ~15 genuine rows, or skip and handle manually? And the
   `Lead.country` strategy (placeholder vs phone-prefix inference vs sales cleanup).
2. **Currency** of legacy prices (no currency column — USD or EUR?).
3. **Tour 39 vs 2** duplicate: fix content, merge, or skip 39?
4. **`O_TourType` → `Destination`** proposal, and whether migrated tours get
   `destinationId = Hurghada` wholesale.
5. **`ShortDescription` → `overview`, `Description` → `itinerary`** field pairing.
6. **Czech content** (48 tour translations) accepted as lost? Same for ro/hu/po.
7. Homes for `O_Service`, `O_DesVideo`, `O_PageContent` blocks (HomepageSection vs drop).
8. `Tour.tourType` value scheme, and whether `SortOrder` should seed `popularityScore`.
9. Hour-based tours: `durationDays` rounding rule.

---

## 7. Proposed Phase-2 Import Order (planning only — nothing built)

1. Categories → 2. Destinations (from TourType) → 3. Tours + TourTranslations (id-maps from 1–2)
→ 4. FAQs → 5. Blog (en) → 6. Vehicles → 7. HeroBanners (blocked on manual image upload) →
8. Leads (filtered, id-map from 3) → 9. Manual: users, homepage sections, social/contact config,
all media.

---

## 8. Approved Decisions (2026-07-23)

Phase 1 approved with the following rulings (superseding the open questions in §6):

1. **Leads:** `O_Request` is **not migrated** at all. The new platform starts with an empty CRM.
2. **Tour 39** ("PROFESSIONAL DIVING") is **excluded** — confirmed duplicate of Tour 2
   ("3-Day PADI Open Water Diving Course"). Migrated tour count: **50** (39 active, 11 disabled);
   its 4 migratable translation rows (en/de/ru/fr) are excluded too → **183** tour translation
   rows migrate. This also resolves the en slug collision (§5.1).
3. **`popularityScore`:** legacy `SortOrder` is **not** used; field stays at its default (0).
4. **`O_TourType` → `Destination` confirmed**, but tours are **not** blanket-assigned to
   Hurghada. Destination derives from the legacy chain only where semantically valid; otherwise
   `destinationId = null` + manual-review list (rules in the Phase 2 plan §4.3).
5. **Overview/itinerary pairing:** five real `ShortDescription`/`Description` examples extracted
   and presented for confirmation (Phase 2 plan §5) before the TourTranslation mapping is final.
6. **Manual-content tables** (`O_Service`, `O_PageContent`, `O_DesVideo`, `O_DesSocialLinksNew`,
   `O_DesHomeBox`, `O_Gallary`, `O_MailTemplate`) are **not migrated** in Phase 2.
7. **Currency verified from the live website: USD.** All migrated tours get
   `Tour.currency = "USD"`; no per-tour inference.

*End of report. Phase 2 planning follows in `phase2-migration-plan.md`.*
