
# PRD v2.1 — AIC Travel × SoHolidays Tourism Platform

## Project Information

| Field | Value |
|---|---|
| **Project Name** | AIC Travel × SoHolidays Tourism Platform |
| **Version** | 2.1 |
| **Status** | Approved for Design & Development |
| **Supersedes** | PRD v2.0 |

**Change note (v2.0 → v2.1):** This revision preserves all approved v2.0 requirements, features, architecture, user flows, dashboard modules, roles, and business logic without reduction or substitution. It only adds clarifying detail via six approved revisions (RBAC matrix, translation architecture, WhatsApp scope, blog language behavior, media platform decision, audit logging scope) and three new sections (GDPR & Privacy, Error & Empty States, Security & Anti-Spam).

### Partnership Branding

The platform represents **AIC Travel in partnership with SoHolidays**. Both brands must be visibly represented throughout the website, especially in the homepage, footer, about section, and trust-building elements.

**Brand hierarchy:**
- **AIC Travel is the primary brand.** It leads visually (primary logo placement in header, dominant identity across the site).
- **SoHolidays is displayed as the official tourism partner** — presented in a supporting/partner role (e.g. "in partnership with" or "Official Tourism Partner" lockup) in the header/footer, about, and trust elements, secondary to AIC Travel.

---

## 1. Product Vision

Build a premium tourism platform for Egypt that allows international travelers to discover, explore, and request bookings for curated travel experiences while providing the company with a complete management platform for sales, content, and operations.

The platform is not only a marketing website but also a tourism company management system.

---

## 2. Business Goals

### Primary Goals
- Generate qualified booking requests.
- Increase international tourism leads.
- Improve conversion from visitor to inquiry.
- Provide an internal management system for staff.
- Establish strong SEO presence for tourism-related searches.

### Success Metrics
- Tour page views.
- Booking request submissions.
- Inquiry conversion rate.
- WhatsApp contact rate.
- Blog traffic growth.
- Leads converted to confirmed bookings.

---

## 3. Target Audience

### International Tourists

**Primary Markets:**
- United States
- United Kingdom
- Germany
- Russia
- Turkey
- GCC Countries

**Traveler Types:**
- Solo Travelers
- Couples
- Families
- Small Groups

---

## 4. Languages

The website must support:
- English
- Arabic
- German
- Russian
- Turkish

### Notes
- English launches as the primary content language.
- Architecture must support full multilingual content.
- RTL support required for Arabic.
- All content managed through translation-ready CMS architecture (see **§19 Translation Architecture** for the approved implementation strategy).

---

## 5. Website Features

### Homepage

**Sections**
- Hero Banner Slider
- Featured Tours
- Tour Categories
- Why Choose Us
- About AIC Travel & SoHolidays
- Testimonials
- Popular Destinations
- Latest Blog Articles
- Contact CTA
- WhatsApp CTA

**Homepage Management**
All homepage sections must be manageable through the Admin Dashboard.

### Tours Catalog

**Filters**
- Destination
- Duration
- Price Range
- Tour Type
- Family Friendly
- Couple Friendly
- Solo Friendly

**Sorting**
- Featured
- Most Popular
- Price Low to High
- Price High to Low
- Duration

**Search**
- A search feature lets visitors find tours by keyword (e.g. tour title, destination).
- Search works alongside the existing filters and sorting (a query can be combined with active filters).
- No-results state applies when a search returns nothing (see §25).
- Search operates on the current locale's tour content, resolving via the English fallback where a translation is absent (§19).

### Tour Details Page

**Content**
- Tour Title
- Gallery
- Overview
- Detailed Itinerary
- Included Services
- Excluded Services
- Pricing
- Duration
- Tour Type
- Traveler Suitability
- FAQs
- Related Tours
- Contact Options

**CTAs**
- Request Booking
- Contact via WhatsApp

### Booking Request System

**No Online Payments**
The platform does not process payments online during Phase 1.

**User Flow**
Visitor → Select Tour → Click Request Booking → Fill Booking Form → Submit Request → Success Message → Lead Appears in Dashboard

**Form Fields**
- Full Name
- Email
- Phone Number
- Country
- Preferred Travel Date
- Number of Travelers
- Special Requests
- Selected Tour

**Confirmation Message**
> "Thank you for your request. Our team will contact you shortly to confirm availability, pricing, and payment arrangements."

### Contact System

**Channels**
- WhatsApp
- Email
- Phone

**WhatsApp**
- Sticky Mobile Button
- Contact CTA on all tour pages
- Contact CTA on homepage

> WhatsApp implementation scope for Phase 1 is defined in **§20 WhatsApp Integration Scope**.

---

## 6. Blog System

**Blog Language**
English Only

**Features**
- Categories
- Featured Articles
- SEO Optimization
- Related Articles
- Search Functionality

**Sample Topics**
- Egypt Travel Guide
- Best Places to Visit in Egypt
- Nile Cruise Guide
- Cairo Travel Tips
- Luxor Travel Guide
- Red Sea Travel Experiences

> Non-English locale behavior for the blog is defined in **§21 Blog Language Behavior**.

---

## 7. Admin Dashboard

### User Roles

**Super Admin**
- Full system access.

**Sales Admin**
Responsible for:
- Booking Requests
- Lead Management
- Customer Follow-up
- Status Updates
- Notes Management

Cannot manage website content.

**Content Admin**
Responsible for:
- Tours
- Categories
- Homepage Content
- Hero Banners
- Blog
- SEO
- Media Library

Cannot manage bookings.

**Operations Admin**
Responsible for:
- Confirmed Bookings
- Tour Guides
- Vehicles
- Assignments
- Scheduling

Cannot manage website content.

> The complete, enforceable permission matrix for these roles is defined in **§18 RBAC Permission Matrix**. The role definitions above are unchanged; §18 only makes them explicit at the resource/action level.

---

## 8. Lead CRM System

### Lead Statuses
- New
- Contacted
- Negotiating
- Confirmed
- Cancelled

### Lead Details
- Customer Information
- Booking Information
- Assigned Staff Member
- Internal Notes
- Communication History

---

## 9. Tour Management

Dashboard must allow:
- Create Tour
- Edit Tour
- Disable Tour
- Delete Tour
- Manage Images
- Manage Pricing
- Manage Categories
- Manage SEO
- Manage Translations

---

## 10. Homepage CMS

Dashboard controls:
- Hero Banners
- Banner Ordering
- CTA Buttons
- Featured Tours
- Homepage Sections
- Promotional Blocks

---

## 11. Media Library

Centralized media management.

**Supported Assets**
- Tour Images
- Hero Images
- Blog Images
- Testimonials Images
- Marketing Assets

> The committed media platform is defined in **§22 Media Platform Decision**.

---

## 12. SEO Management

### Tour SEO
- SEO Title
- Meta Description
- URL Slug
- Open Graph Image

### Blog SEO
- SEO Title
- Meta Description
- Open Graph Image

### Technical SEO
- Sitemap
- Robots.txt
- Structured Data
- Open Graph
- Canonical URLs

#### Sitemap — Core Routes
The generated sitemap must include the following core routes (in addition to dynamically generated tour and blog URLs):
- `/`
- `/tours`
- `/tours/[slug]`
- `/about`
- `/contact`
- `/en/blog`
- `/privacy-policy`
- `/terms-and-conditions`

`/tours/[slug]` expands to one entry per active tour. Blog is English-only, so blog routes appear under `/en/blog` (consistent with §21).

---

## 13. Operations Management

### Tour Guides
Manage:
- Name
- Languages
- Contact Information
- Availability Status

### Vehicles
Manage:
- Vehicle Name
- Capacity
- Type
- Status

### Assignments
Assign:
- Guide
- Vehicle

to confirmed bookings.

---

## 14. Analytics Dashboard

### KPIs
- Total Leads
- Confirmed Bookings
- Conversion Rate
- Top Requested Tours
- Leads by Country
- Monthly Performance

---

## 15. Audit Logs

Track administrative actions.

**Example Logs**
- Tour Created
- Tour Updated
- Lead Status Changed
- Hero Banner Modified
- Blog Published

**Store:**
- User
- Action
- Date
- Time

> The precise, bounded scope of what is logged is defined in **§23 Audit Logging Scope**.

---

## 16. Non-Functional Requirements

### Mobile First
Highest Priority.

Special attention required for:
- Hero Banner
- Navigation
- Hamburger Menu
- Tour Cards
- Booking Forms
- CTA Placement

**Devices**
- 360px Mobile
- Tablet
- Desktop

### Performance
- Fast Loading
- Image Optimization
- Lazy Loading
- Core Web Vitals Optimization

### Accessibility
- WCAG AA Compliance.

### Security
- Role-Based Access Control
- Server-Side Validation
- Secure Authentication
- Activity Logging

> Additional anti-spam and rate-limiting requirements are defined in **§26 Security & Anti-Spam**.

### Scalability
Architecture must support:
- Additional Languages
- Additional Branches
- Future Payment Integration
- Future Mobile Applications

---

## 17. Recommended Technology Stack

### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS

### Backend
- Next.js Server Actions / API Routes

### Database
- PostgreSQL
- Prisma ORM

### Authentication
- Auth.js

### Validation
- Zod

### Storage
- Local filesystem on the VPS via a provider-agnostic `StorageService`, with Sharp for image processing (committed — see **§22**). No external media service in V1.

### Email
- Resend

### Analytics
- Google Analytics 4
- Google Search Console

---

# Approved Revisions (v2.1)

The following sections add detail to the approved v2.0 requirements. They do not remove, replace, or reduce any existing requirement.

---

## 18. RBAC Permission Matrix (Approved Revision #1)

This matrix makes the approved role definitions in **§7** explicit and enforceable. Roles are unchanged. Permissions are expressed per resource as **V** (View), **C** (Create), **E** (Edit), **D** (Delete). A dash (—) means no access to that action.

| Resource | Super Admin | Sales Admin | Content Admin | Operations Admin |
|---|---|---|---|---|
| **Tours** | V C E D | V | V C E D | V |
| **Categories** | V C E D | — | V C E D | — |
| **Homepage** | V C E D | — | V C E D | — |
| **Hero Banners** | V C E D | — | V C E D | — |
| **Blog** | V C E D | — | V C E D | — |
| **Leads** | V C E D | V C E D | — | V |
| **Guides** | V C E D | — | — | V C E D |
| **Vehicles** | V C E D | — | — | V C E D |
| **Assignments** | V C E D | — | — | V C E D |
| **Users** | V C E D | — | — | — |
| **Media Library** | V C E D | — | V C E D | V |
| **SEO** | V C E D | — | V C E D | — |
| **Analytics** | V | V | V | V |

### Notes and rationale (consistent with §7 role definitions)
- **Super Admin** has full access to every resource and action.
- **Sales Admin** owns the lead lifecycle (full V C E D on Leads) and can view Tours (needed to contextualize a lead) and Analytics. Sales Admin **cannot manage website content** (Tours/Categories/Homepage/Hero/Blog/SEO/Media create-edit-delete are all —), consistent with §7.
- **Content Admin** owns all public content: Tours, Categories, Homepage, Hero Banners, Blog, SEO, Media Library — full V C E D. Content Admin **cannot manage bookings** (Leads = —, Guides/Vehicles/Assignments = —), consistent with §7.
- **Operations Admin** owns Confirmed Bookings and operational resources: Guides, Vehicles, Assignments — full V C E D. Operations Admin can **view** Leads (to see the booking that became confirmed) and view Media (to reference tour assets) but cannot manage website content, consistent with §7.
- **Users** management (creating/editing admin accounts and assigning roles) is restricted to **Super Admin only**.
- **Analytics** is view-only for all roles; no role creates or edits analytics data.

### Enforcement requirement
Permissions **must be enforced server-side** in every Server Action and API Route — not only hidden in the UI. UI gating (hiding buttons/menus a role cannot use) is required as well, but is presentation only. The authoritative check happens on the server before any mutation. See CLAUDE.md **§4** and **§11** for implementation guidance.

---

## 19. Translation Architecture (Approved Revision #2)

The multilingual strategy uses **dedicated translation tables**, one per translatable entity. **JSON-based translations are not used.**

### Pattern

Each translatable base entity has a companion translation table holding one row per locale:

```
Tour              → TourTranslation
BlogPost          → BlogPostTranslation
Category          → CategoryTranslation
HomepageSection   → HomepageSectionTranslation
```

The base table holds locale-independent data (IDs, pricing, relations, status, ordering, timestamps). The translation table holds all locale-dependent text (titles, descriptions, overviews, itinerary text, SEO title/meta, slugs where localized).

### Supported locales
`en` (primary), `ar` (RTL), `de`, `ru`, `tr`.
## Supported Languages

The public website supports seven languages:

- English (Primary Source Language)
- Arabic (RTL)
- German
- Russian
- French
- Italian
- Turkish

English is the source language for all content.

All other languages are translated from English **manually** by admins. There is no automatic translation.

The Admin Dashboard remains English-only in Phase 1.

### Rules
- Every translatable field lives in the translation table, never on the base table.
- Each translation row is keyed by `(parentId, locale)` with a unique constraint on that pair.
- English (`en`) is the fallback locale. If a translation row for a requested locale does not exist, the application resolves to the `en` row.
- The Media Library, pricing, availability, and relational data are locale-independent and remain on base tables.
- Admin "Manage Translations" (§9) edits translation rows per locale.
- Translation rows are authored **manually** per locale (§28); the translation-table strategy is unchanged.

### Prisma + PostgreSQL implementation guidance
- Model each translation table as a separate Prisma model with a relation back to the parent and a `locale` field (use a Prisma `enum Locale`).
- Add `@@unique([<parentId>, locale])` on each translation model.
- Index `locale` and any localized `slug` used for routing.
- Fetch with `include` filtered by the requested locale; apply the `en` fallback in a shared query helper so the fallback rule is centralized.
- Full schema examples are provided in CLAUDE.md **§6** and **§7**.

---

## 20. WhatsApp Integration Scope (Approved Revision #3)

### Phase 1 (approved)
- Use **simple WhatsApp deep links** (`wa.me`).
- **Sticky WhatsApp CTA** (mobile).
- **Tour page WhatsApp CTA**.
- **Homepage WhatsApp CTA**.

Deep links open WhatsApp with the company number and an optional prefilled message (e.g. the tour name). No server integration, no message logging, no API credentials required in Phase 1.

### Not in Phase 1
- **WhatsApp Business API is not implemented in Phase 1.**

### Future enhancement
- WhatsApp Business API (with logged conversation history and automated messaging) is noted as a future enhancement only.

---

## 21. Blog Language Behavior (Approved Revision #4)

Blog content **remains English-only** (consistent with §6).

### Expected behavior for non-English locales
- The English blog exists at `/en/blog` (and nested `/en/blog/[slug]`).
- Users on any other locale (`ar`, `de`, `ru`, `tr`) who navigate to a blog path are **redirected to the English blog content**.

### Routing approach
- Blog routes are served only under the `en` locale segment.
- For non-English locales, a redirect maps the localized blog path to its English equivalent, e.g. `/de/blog/nile-cruise-guide` → `/en/blog/nile-cruise-guide`.
- The redirect preserves the article slug so deep links resolve to the correct English article.
- Canonical URLs for blog articles always point to the `/en/blog/...` version to avoid duplicate-content SEO issues.
- Implement redirects centrally (middleware) so the rule is applied consistently. See CLAUDE.md **§8** and **§15**.

---

## 22. Media Platform Decision (Approved Revision — Local Storage)

**Local filesystem storage on the VPS is the official and committed media solution for V1.** Any previous Cloudinary/S3 ambiguity is resolved in favor of local storage. **No external media service (Cloudinary, S3, DigitalOcean Spaces, …) is used or permitted in V1** unless a future version explicitly approves one.

All access goes through a provider-agnostic **`StorageService`** (`upload()`, `delete()`, `getUrl()`, `exists()`) so a future migration to S3 / Spaces is a single adapter swap with no business-logic changes.

### Managed media types
- Tour Images
- Hero Images
- Blog Images
- Destination Images
- Guide Images
- Gallery Assets
- Marketing Assets

Files are stored under `/uploads/<folder>/…` on the VPS; only the **relative file path** is persisted in Postgres. Uploads are processed with **Sharp** (converted to compressed WebP, resized, thumbnails as needed) and delivered via **`next/image`**. Implementation rules (StorageService, upload flow, folder taxonomy, Sharp processing, serving, `next/image` usage) are defined in CLAUDE.md **§12**.

---

## 23. Audit Logging Scope (Approved Revision #6)

Audit logging is **bounded** to administrative mutations. The system does **not** attempt to log every user interaction.

### Logged action types
- **Create** actions
- **Update** actions
- **Delete** actions
- **Status changes** (e.g. lead status transitions)
- **Assignment changes** (e.g. guide/vehicle assigned to a confirmed booking)

### Stored per log entry (extends §15)
- User (actor)
- Action type
- Resource type and resource ID
- Date
- Time (timestamp)

### Implementation guidance
- Centralize logging so every relevant mutation writes exactly one audit entry (a shared audit helper invoked from Server Actions, or Prisma middleware scoped to the mutating models).
- Do not log reads/views, page navigation, filter usage, or search queries.
- Status changes and assignment changes are logged as their own action types (not merely generic updates) so the CRM and Operations history are legible.
- See CLAUDE.md **§13** for the concrete implementation pattern.

---

# New Sections (v2.1)

---

## 24. GDPR & Privacy

Given primary markets including the UK, Germany, and Russia, the platform must include:

- **Cookie Consent Banner** — shown on first visit, with accept/reject controls; analytics (GA4) cookies must not fire until consent is granted where required.
- **Privacy Policy Page** — describing data collected via booking-request and contact forms, storage, and contact for data requests.
- **Terms & Conditions Page** — covering use of the site and the booking-request process.

Privacy Policy and Terms pages must be linked in the global footer and accessible in every locale.

---

## 25. Error & Empty States

- **Custom 404 Page** — branded (AIC Travel × SoHolidays), with navigation back to homepage and tours, localized.
- **Empty State Handling** — every list surface (tours, blog, leads, guides, vehicles, assignments, media) shows a clear, friendly empty state when it has no records, rather than a blank area.
- **No Results State for Filters** — when catalog filters/sorting produce zero matches, show a distinct "no results" state with an easy way to clear or adjust filters.

---

## 26. Security & Anti-Spam

Extends **§16 Security**.

- **Rate Limiting for forms** — the Booking Request form and all Contact forms are rate-limited per IP/session to prevent abuse and flooding.
- **Bot protection strategy** — public forms are protected against automated submissions (e.g. honeypot field plus a CAPTCHA/challenge on the booking and contact forms). Protection must not degrade accessibility (WCAG AA still required).
- **Server-side validation** — all form input is validated server-side with Zod before any persistence; client-side validation is convenience only and never authoritative.

---

## 27. Future Phases

### Phase 2
- Reviews System
- Route Maps
- Advanced Analytics
- Marketing Campaign Management

### Phase 3
- Online Payments
- Promo Codes
- Mobile Applications

### Noted future enhancements (from approved revisions)
- WhatsApp Business API with conversation logging (see §20).

---

## 28. Manual Translation Workflow

All translations are entered **manually**. The platform performs **no automatic or AI translation** and integrates no LLM or third-party translation service. Content exists in a given language only because an admin authored it in that language.

This section preserves the approved **§19 Translation Architecture** (translation tables). It does **not** change the translation-table strategy and does **not** introduce JSON-based localization.

### Content Creation Flow
1. Content Admin creates content in **English**.
2. **English is the source language** for all content.
3. For each additional locale, a Content Admin (or Super Admin) manually enters the translated text in the Dashboard.
4. Manually entered translations are stored in the corresponding **Translation Tables**.
5. Each language version remains **independently editable**.
6. A locale with no translation row falls back to English (`en`) at read time.

### Applies To
- Tours
- Tour Categories
- Homepage Sections
- Hero Banner Content
- Testimonials
- Destinations & FAQs
- SEO Fields

**Blog remains English-only and is excluded from translation.**

### Translation Architecture
Maintains the approved Translation Table strategy (unchanged):
- Tour → TourTranslation
- Category → CategoryTranslation
- HomepageSection → HomepageSectionTranslation

(Hero Banner Content, Testimonials, Destinations, FAQs, and SEO fields follow the same `Entity → EntityTranslation` pattern.)

**Do not replace translation tables with JSON-based localization.**

### Dashboard Requirements
For every translatable content type, the Dashboard shows:
- English Content (source)
- A per-locale manual editor for each supported language

A locale simply has content or it does not; no generation status is tracked, and an empty locale resolves to English at read time.

### Access control
Editing translations is a content operation, available to roles that already manage the underlying content per the RBAC matrix (§18) — i.e. Super Admin and Content Admin. No RBAC roles are added or changed.

---

*End of PRD v2.1.*
