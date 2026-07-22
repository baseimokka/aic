import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Physical uploads root — mirrors lib/storage/local.ts so seeded files land
// exactly where the running app serves them from (/uploads/*).
const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

/**
 * Generate an on-brand gradient WebP placeholder and store it under the uploads
 * root, returning the servable path (e.g. "/uploads/tours/luxor-1.webp"). Real
 * imagery is uploaded through the dashboard; this keeps the demo visual without
 * shipping binaries. Deterministic filenames overwrite cleanly on re-seed.
 */
async function seedImage(folder: string, name: string, w = 1600, h = 900): Promise<string> {
  const hue = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},34%,72%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 42) % 360},46%,52%)"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  const dir = path.join(UPLOADS_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const file = `${name}.webp`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(dir, file));
  return `/uploads/${folder}/${file}`;
}

// Reusable localized service lists (localized text lives on the translation, §5).
const INCLUDED_EN = ["Airport transfers", "Expert English-speaking guide", "All entrance fees", "Daily breakfast"];
const EXCLUDED_EN = ["International flights", "Travel insurance", "Personal expenses", "Tips & gratuities"];
const INCLUDED_AR = ["مواصلات المطار", "مرشد محترف يتحدث الإنجليزية", "جميع رسوم الدخول", "إفطار يومي"];
const EXCLUDED_AR = ["الرحلات الدولية", "تأمين السفر", "المصاريف الشخصية", "الإكراميات"];

/**
 * Destructive-run guard: this seed WIPES every table before reseeding. Refuse
 * to run in production, or against a database that already holds real leads,
 * unless explicitly forced with SEED_FORCE=1. Protects the production dataset
 * from an accidental `db:seed` / `migrate reset` pointed at the live DATABASE_URL.
 */
async function assertSafeToWipe() {
  if (process.env.SEED_FORCE === "1") return;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production. Set SEED_FORCE=1 to override (this DELETES ALL DATA).");
  }
  const leadCount = await prisma.lead.count();
  if (leadCount > 20) {
    throw new Error(
      `Refusing to seed: database already holds ${leadCount} leads (looks like real data). ` +
        "Set SEED_FORCE=1 to override (this DELETES ALL DATA).",
    );
  }
}

async function reset() {
  // Child/junction tables first; DB cascades handle translation/image/faq children.
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.leadCommunication.deleteMany(),
    prisma.leadNote.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.assignmentRule.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.tour.deleteMany(),
    prisma.category.deleteMany(),
    prisma.destination.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.heroBanner.deleteMany(),
    prisma.homepageSection.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.blogCategory.deleteMany(),
    prisma.guide.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.media.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await assertSafeToWipe();
  await reset();

  // ── Staff, settings & assignment rules ─────────────────────────────
  // Dev-only seed accounts share one password, supplied via env so no
  // credential ever lives in the repo. Refuse to run without it.
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 8) {
    throw new Error("Set SEED_PASSWORD (≥8 chars) to seed dev accounts — no default password ships in the repo.");
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const [omar, sara] = await Promise.all([
    prisma.user.create({
      data: { name: "Omar Adel", email: "admin@aictravel.test", role: "SUPER_ADMIN", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Sara Kamal", email: "sara@aictravel.test", role: "SALES_ADMIN", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Nadia Fahmy", email: "nadia@aictravel.test", role: "CONTENT_ADMIN", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Tarek Hassan", email: "tarek@aictravel.test", role: "OPERATIONS_ADMIN", passwordHash },
    }),
  ]);

  // Global settings singleton — Sara catches every lead no rule claims.
  await prisma.settings.create({
    data: { defaultCurrency: "USD", allowPerLeadCurrencyOverride: true, fallbackAssigneeId: sara.id },
  });

  // Auto-routing rules (Addendum §2): evaluated top-down, first match wins.
  await prisma.assignmentRule.createMany({
    data: [
      {
        name: "GCC / Arabic leads",
        field: "country",
        operator: "in",
        value: "Saudi Arabia, United Arab Emirates, UAE, Kuwait, Qatar, Bahrain, Oman",
        assigneeId: sara.id,
        enabled: true,
        order: 1,
      },
      {
        name: "German-speaking visitors",
        field: "language",
        operator: "eq",
        value: "de",
        assigneeId: omar.id,
        enabled: true,
        order: 2,
      },
    ],
  });

  // ── Categories ─────────────────────────────────────────────────────
  const catData: Array<[string, number, [string, string], [string, string]]> = [
    ["nile-cruises", 1, ["Nile Cruises", "Sail between Luxor and Aswan in timeless comfort."], ["رحلات النيل", "أبحر بين الأقصر وأسوان في راحة خالدة."]],
    ["cultural-heritage", 2, ["Cultural Heritage", "Pharaonic temples, tombs and living history."], ["التراث الثقافي", "معابد ومقابر فرعونية وتاريخ حي."]],
    ["red-sea", 3, ["Red Sea Escapes", "Coral reefs, diving and shoreline calm."], ["إجازات البحر الأحمر", "شعاب مرجانية وغوص وهدوء الشاطئ."]],
  ];
  const categories: Record<string, string> = {};
  for (const [slug, order, en, ar] of catData) {
    const c = await prisma.category.create({
      data: {
        slug,
        order,
        translations: {
          create: [
            { locale: "en", name: en[0], description: en[1] },
            { locale: "ar", name: ar[0], description: ar[1] },
          ],
        },
      },
    });
    categories[slug] = c.id;
  }

  // ── Destinations ───────────────────────────────────────────────────
  const destData: Array<[string, number, boolean, [string, string], [string, string]]> = [
    ["cairo", 1, true, ["Cairo", "The pyramids, the Egyptian Museum and a thousand years of markets."], ["القاهرة", "الأهرامات والمتحف المصري وأسواق عمرها ألف عام."]],
    ["luxor", 2, true, ["Luxor", "The world's greatest open-air museum on the Nile."], ["الأقصر", "أعظم متحف مفتوح في العالم على ضفاف النيل."]],
    ["aswan", 3, false, ["Aswan", "Nubian colour, Philae temple and gentle river days."], ["أسوان", "ألوان نوبية ومعبد فيلة وأيام نهرية هادئة."]],
    ["hurghada", 4, false, ["Hurghada", "Red Sea reefs and warm coastal light."], ["الغردقة", "شعاب البحر الأحمر وضوء ساحلي دافئ."]],
  ];
  const destinations: Record<string, string> = {};
  for (const [slug, order, featured, en, ar] of destData) {
    const d = await prisma.destination.create({
      data: {
        slug,
        order,
        featured,
        heroImagePath: await seedImage("destinations", slug, 1600, 686),
        translations: {
          create: [
            { locale: "en", name: en[0], description: en[1], slug },
            { locale: "ar", name: ar[0], description: ar[1] },
          ],
        },
      },
    });
    destinations[slug] = d.id;
  }

  // ── Tours ──────────────────────────────────────────────────────────
  type TourSeed = {
    slug: string;
    category: string;
    destination: string;
    durationDays: number;
    basePrice: number;
    tourType: string;
    flags: { family: boolean; couple: boolean; solo: boolean };
    featured: boolean;
    popularity: number;
    en: { title: string; overview: string; itinerary: string; highlights: string[] };
    ar: { title: string; overview: string; itinerary: string; highlights: string[] };
    faqs: Array<{ en: [string, string]; ar: [string, string] }>;
  };

  const tours: TourSeed[] = [
    {
      slug: "4-day-nile-cruise-luxor-aswan",
      category: "nile-cruises",
      destination: "luxor",
      durationDays: 4,
      basePrice: 1290,
      tourType: "Cruise",
      flags: { family: true, couple: true, solo: false },
      featured: true,
      popularity: 95,
      en: {
        title: "4-Day Nile Cruise: Luxor to Aswan",
        overview: "Glide down the Nile aboard a boutique cruiser, waking each morning beside a different temple — Karnak, Edfu, Kom Ombo and Philae.",
        highlights: [
          "Boutique cruiser between Luxor and Aswan",
          "Private Egyptologist at every temple",
          "Valley of the Kings with skip-the-line entry",
          "Golden-hour sailing from the sun deck",
        ],
        itinerary:
          "Day 1 — Luxor: Karnak & Luxor Temples :: Board your cruiser at midday, then visit Karnak and Luxor Temples as the light softens. Welcome dinner on deck.\nDay 2 — West Bank, sail to Edfu :: Cross to the Valley of the Kings and Hatshepsut's temple, then cast off south along the river.\nDay 3 — Edfu & Kom Ombo :: The falcon temple of Horus at Edfu and the twin temple of Kom Ombo, sailing on to Aswan by evening.\nDay 4 — Aswan: Philae, disembark :: A morning at the island temple of Philae before disembarking after breakfast.",
      },
      ar: {
        title: "رحلة نيلية 4 أيام: الأقصر إلى أسوان",
        overview: "أبحر في النيل على متن سفينة أنيقة، وتستيقظ كل صباح بجانب معبد مختلف — الكرنك وإدفو وكوم أمبو وفيلة.",
        highlights: [
          "سفينة أنيقة بين الأقصر وأسوان",
          "عالم مصريات خاص عند كل معبد",
          "وادي الملوك بدخول دون انتظار",
          "الإبحار في الساعة الذهبية من سطح الشمس",
        ],
        itinerary:
          "اليوم 1 — الأقصر: معبدا الكرنك والأقصر :: اصعد إلى سفينتك ظهرًا، ثم زُر معبدي الكرنك والأقصر مع رقّة الضوء. عشاء ترحيبي على السطح.\nاليوم 2 — الضفة الغربية والإبحار إلى إدفو :: اعبر إلى وادي الملوك ومعبد حتشبسوت، ثم أبحر جنوبًا على النهر.\nاليوم 3 — إدفو وكوم أمبو :: معبد حورس الصقر في إدفو ومعبد كوم أمبو المزدوج، والإبحار إلى أسوان مساءً.\nاليوم 4 — أسوان: فيلة والنزول :: صباح في معبد جزيرة فيلة قبل النزول بعد الإفطار.",
      },
      faqs: [
        { en: ["Is the cruise suitable for families?", "Yes — cabins accommodate families and the pace is relaxed."], ar: ["هل الرحلة مناسبة للعائلات؟", "نعم — الكبائن تتسع للعائلات والوتيرة هادئة."] },
        { en: ["Are meals included?", "Full board is included throughout the cruise."], ar: ["هل الوجبات مشمولة؟", "الإقامة الكاملة مشمولة طوال الرحلة."] },
      ],
    },
    {
      slug: "cairo-giza-pyramids-day-tour",
      category: "cultural-heritage",
      destination: "cairo",
      durationDays: 1,
      basePrice: 120,
      tourType: "Day tour",
      flags: { family: true, couple: true, solo: true },
      featured: true,
      popularity: 90,
      en: {
        title: "Cairo & Giza Pyramids Day Tour",
        overview: "Stand before the last surviving wonder of the ancient world, meet the Sphinx, and finish among the treasures of the Egyptian Museum.",
        highlights: [
          "The Great Pyramid and the Sphinx up close",
          "Panoramic viewpoint for the full plateau",
          "Treasures of the Egyptian Museum",
          "Hotel pickup across Cairo and Giza",
        ],
        itinerary:
          "Morning — Giza pyramids & Sphinx :: Meet your guide at the plateau for the three pyramids and the Sphinx, with time for photos and an optional interior visit.\nMidday — Panoramic viewpoint & lunch :: Step back for the classic view of all nine pyramids, then a relaxed Egyptian lunch.\nAfternoon — The Egyptian Museum :: Finish among the mummies and gilded treasures of Tutankhamun in downtown Cairo.",
      },
      ar: {
        title: "جولة يوم كامل: القاهرة وأهرامات الجيزة",
        overview: "قف أمام أعجوبة العالم القديم الوحيدة الباقية، وقابل أبو الهول، واختم بين كنوز المتحف المصري.",
        highlights: [
          "الهرم الأكبر وأبو الهول عن قرب",
          "نقطة بانورامية لكامل الهضبة",
          "كنوز المتحف المصري",
          "الاصطحاب من الفندق في القاهرة والجيزة",
        ],
        itinerary:
          "الصباح — أهرامات الجيزة وأبو الهول :: قابل مرشدك عند الهضبة لرؤية الأهرامات الثلاثة وأبو الهول، مع وقت للصور وزيارة داخلية اختيارية.\nالظهيرة — نقطة بانورامية والغداء :: تراجع قليلاً لرؤية الأهرامات التسعة، ثم غداء مصري هادئ.\nبعد الظهر — المتحف المصري :: اختم بين المومياوات وكنوز توت عنخ آمون المذهّبة في وسط القاهرة.",
      },
      faqs: [
        { en: ["Can I go inside a pyramid?", "Interior entry is available for an optional extra ticket."], ar: ["هل يمكنني دخول الهرم؟", "الدخول متاح بتذكرة إضافية اختيارية."] },
        { en: ["Is hotel pickup included?", "Yes — pickup and drop-off across central Cairo and Giza."], ar: ["هل الاصطحاب من الفندق مشمول؟", "نعم — الاصطحاب والتوصيل في وسط القاهرة والجيزة."] },
      ],
    },
    {
      slug: "8-day-classic-egypt",
      category: "cultural-heritage",
      destination: "cairo",
      durationDays: 8,
      basePrice: 2450,
      tourType: "Multi-day",
      flags: { family: false, couple: true, solo: true },
      featured: true,
      popularity: 88,
      en: {
        title: "8-Day Classic Egypt: Cairo, Nile & Abu Simbel",
        overview: "The definitive first journey through Egypt — pyramids, a Nile cruise, and the colossi of Abu Simbel at dawn.",
        highlights: [
          "Pyramids, Nile cruise and Abu Simbel in one trip",
          "Domestic flights included end to end",
          "Four-night cruise from Luxor to Aswan",
          "Abu Simbel colossi at dawn",
        ],
        itinerary:
          "Days 1–2 — Cairo & Giza :: Arrive and settle in, then a full day at the pyramids, the Sphinx and the Egyptian Museum.\nDays 3–6 — Luxor & Nile cruise :: Fly south to Luxor and board a four-night cruise through Edfu and Kom Ombo to Aswan.\nDay 7 — Abu Simbel :: A dawn journey to the towering rock temples of Ramses II beside Lake Nasser.\nDay 8 — Return & departure :: Fly back to Cairo for your onward connection.",
      },
      ar: {
        title: "مصر الكلاسيكية 8 أيام: القاهرة والنيل وأبو سمبل",
        overview: "الرحلة الأولى المثالية عبر مصر — الأهرامات ورحلة نيلية وتماثيل أبو سمبل عند الفجر.",
        highlights: [
          "الأهرامات ورحلة نيلية وأبو سمبل في رحلة واحدة",
          "رحلات داخلية مشمولة من البداية للنهاية",
          "رحلة نيلية أربع ليالٍ من الأقصر إلى أسوان",
          "تماثيل أبو سمبل عند الفجر",
        ],
        itinerary:
          "اليومان 1–2 — القاهرة والجيزة :: الوصول والاستقرار، ثم يوم كامل في الأهرامات وأبو الهول والمتحف المصري.\nالأيام 3–6 — الأقصر ورحلة نيلية :: الطيران جنوبًا إلى الأقصر وركوب رحلة نيلية أربع ليالٍ عبر إدفو وكوم أمبو إلى أسوان.\nاليوم 7 — أبو سمبل :: رحلة عند الفجر إلى معابد رمسيس الثاني الصخرية الشامخة بجوار بحيرة ناصر.\nاليوم 8 — العودة والمغادرة :: الطيران إلى القاهرة لرحلتك التالية.",
      },
      faqs: [
        { en: ["Are domestic flights included?", "Yes — Cairo–Luxor and Aswan–Abu Simbel connections are included."], ar: ["هل الرحلات الداخلية مشمولة؟", "نعم — رحلتا القاهرة–الأقصر وأسوان–أبو سمبل مشمولتان."] },
      ],
    },
    {
      slug: "red-sea-diving-escape-hurghada",
      category: "red-sea",
      destination: "hurghada",
      durationDays: 5,
      basePrice: 890,
      tourType: "Adventure",
      flags: { family: false, couple: true, solo: true },
      featured: false,
      popularity: 72,
      en: {
        title: "Red Sea Diving Escape — Hurghada",
        overview: "Five days of warm water, house reefs and guided dives for every level, with unhurried evenings on the coast.",
        highlights: [
          "Warm, clear water year-round",
          "Guided reef and wreck dives",
          "Suitable for beginners to certified divers",
          "Relaxed evenings on the coast",
        ],
        itinerary:
          "Day 1 — Arrival & check dive :: Transfer to your hotel and settle in with an easy check dive to find your buoyancy.\nDays 2–4 — Reef & wreck dives :: Two guided dives each day across the region's best house reefs and shallow wrecks.\nDay 5 — Free morning & departure :: A slow morning by the water before your transfer out.",
      },
      ar: {
        title: "إجازة غوص في البحر الأحمر — الغردقة",
        overview: "خمسة أيام من المياه الدافئة والشعاب وغوص بمرشد لكل المستويات، مع أمسيات هادئة على الساحل.",
        highlights: [
          "مياه دافئة وصافية طوال العام",
          "غوص بمرشد في الشعاب والحطام",
          "مناسب للمبتدئين والغواصين المعتمدين",
          "أمسيات هادئة على الساحل",
        ],
        itinerary:
          "اليوم 1 — الوصول وغوص تجريبي :: الانتقال إلى الفندق والاستقرار مع غوصة تجريبية سهلة لضبط الطفو.\nالأيام 2–4 — غوص في الشعاب والحطام :: غوصتان بمرشد كل يوم في أفضل الشعاب والحطام الضحل في المنطقة.\nاليوم 5 — صباح حر والمغادرة :: صباح هادئ بجوار الماء قبل الانتقال.",
      },
      faqs: [
        { en: ["Do I need a diving licence?", "Beginners welcome — intro dives and certification are available."], ar: ["هل أحتاج رخصة غوص؟", "المبتدئون مرحب بهم — الغوص التجريبي والشهادات متاحة."] },
      ],
    },
    {
      slug: "luxor-temples-valley-of-kings",
      category: "cultural-heritage",
      destination: "luxor",
      durationDays: 2,
      basePrice: 340,
      tourType: "Short break",
      flags: { family: true, couple: true, solo: true },
      featured: false,
      popularity: 80,
      en: {
        title: "Luxor Temples & Valley of the Kings",
        overview: "Two unhurried days across the east and west banks — Karnak at golden hour and the painted tombs of the pharaohs.",
        highlights: [
          "Karnak and Luxor Temples at golden hour",
          "Painted royal tombs in the Valley of the Kings",
          "Hatshepsut's terraced temple",
          "Small-group pace with a private guide",
        ],
        itinerary:
          "Day 1 — East bank temples :: Karnak's great hall and Luxor Temple in the softer afternoon light, with time to wander the avenues.\nDay 2 — West bank & the tombs :: The Valley of the Kings, Hatshepsut's temple and the Colossi of Memnon before your onward journey.",
      },
      ar: {
        title: "معابد الأقصر ووادي الملوك",
        overview: "يومان هادئان عبر الضفتين الشرقية والغربية — الكرنك في الساعة الذهبية والمقابر المرسومة للفراعنة.",
        highlights: [
          "معبدا الكرنك والأقصر في الساعة الذهبية",
          "المقابر الملكية المرسومة في وادي الملوك",
          "معبد حتشبسوت المدرّج",
          "وتيرة مجموعة صغيرة مع مرشد خاص",
        ],
        itinerary:
          "اليوم 1 — معابد الضفة الشرقية :: قاعة الكرنك الكبرى ومعبد الأقصر في ضوء العصر الألطف، مع وقت للتجول في الممرات.\nاليوم 2 — الضفة الغربية والمقابر :: وادي الملوك ومعبد حتشبسوت وتمثالا ممنون قبل رحلتك التالية.",
      },
      faqs: [
        { en: ["How much walking is involved?", "Moderate — comfortable shoes and sun protection recommended."], ar: ["كم مقدار المشي؟", "معتدل — يُنصح بحذاء مريح وواقٍ من الشمس."] },
      ],
    },
  ];

  const tourIds: Record<string, string> = {};
  for (const t of tours) {
    const [img1, img2, img3, img4] = await Promise.all([
      seedImage("tours", `${t.slug}-1`, 1600, 1000),
      seedImage("tours", `${t.slug}-2`, 1600, 900),
      seedImage("tours", `${t.slug}-3`, 1600, 900),
      seedImage("tours", `${t.slug}-4`, 1600, 900),
    ]);
    const createdTour = await prisma.tour.create({
      data: {
        slug: t.slug,
        categoryId: categories[t.category],
        destinationId: destinations[t.destination],
        durationDays: t.durationDays,
        basePrice: t.basePrice,
        currency: "USD",
        tourType: t.tourType,
        familyFriendly: t.flags.family,
        coupleFriendly: t.flags.couple,
        soloFriendly: t.flags.solo,
        featured: t.featured,
        popularityScore: t.popularity,
        status: "ACTIVE",
        images: {
          create: [
            { path: img1, alt: `${t.en.title} — hero`, sortOrder: 0 },
            { path: img2, alt: `${t.en.title} — gallery`, sortOrder: 1 },
            { path: img3, alt: `${t.en.title} — gallery`, sortOrder: 2 },
            { path: img4, alt: `${t.en.title} — gallery`, sortOrder: 3 },
          ],
        },
        translations: {
          create: [
            {
              locale: "en",
              title: t.en.title,
              overview: t.en.overview,
              itinerary: t.en.itinerary,
              highlights: t.en.highlights,
              included: INCLUDED_EN,
              excluded: EXCLUDED_EN,
              seoTitle: `${t.en.title} | AIC Travel`,
              metaDescription: t.en.overview.slice(0, 155),
              slug: t.slug,
            },
            {
              locale: "ar",
              title: t.ar.title,
              overview: t.ar.overview,
              itinerary: t.ar.itinerary,
              highlights: t.ar.highlights,
              included: INCLUDED_AR,
              excluded: EXCLUDED_AR,
            },
          ],
        },
        faqs: {
          create: t.faqs.map((f, i) => ({
            order: i,
            translations: {
              create: [
                { locale: "en", question: f.en[0], answer: f.en[1] },
                { locale: "ar", question: f.ar[0], answer: f.ar[1] },
              ],
            },
          })),
        },
      },
    });
    tourIds[t.slug] = createdTour.id;
  }

  // ════════════════════════════════════════════════════════════════════
  // DEMO REVIEWS — TEMPORARY SAMPLE DATA FOR VISUAL QA ONLY.
  // Not real customer reviews and never presented as verified. REMOVE THIS
  // BLOCK (and re-seed) BEFORE PRODUCTION — deleting it removes every demo
  // review; nothing else references them.
  // ════════════════════════════════════════════════════════════════════
  type ReviewSeed = {
    tour: string | null; // tour slug, or null for a general review
    name: string;
    country: string;
    rating: number;
    body: string;
    monthsAgo: number; // travel date, relative to seed time
    language: "en" | "ar" | "de" | "ru" | "tr" | "fr" | "it";
    source: "WEBSITE" | "GOOGLE" | "WHATSAPP" | "EMAIL" | "FACEBOOK" | "OTHER";
    featured?: boolean;
    visible?: boolean;
  };
  const demoReviews: ReviewSeed[] = [
    {
      tour: "4-day-nile-cruise-luxor-aswan", name: "Demo — Charlotte B.", country: "United Kingdom", rating: 5,
      body: "Waking up beside Kom Ombo with coffee on deck is something I will never forget. The guide's storytelling made every temple feel alive.",
      monthsAgo: 2, language: "en", source: "WEBSITE", featured: true,
    },
    {
      tour: "4-day-nile-cruise-luxor-aswan", name: "Demo — Klaus R.", country: "Germany", rating: 4,
      body: "Sehr gut organisierte Kreuzfahrt, tolle Kabine und ein sehr kompetenter Reiseleiter. Ein Stern Abzug nur für das etwas gedrängte Programm am zweiten Tag.",
      monthsAgo: 4, language: "de", source: "EMAIL",
    },
    {
      tour: "4-day-nile-cruise-luxor-aswan", name: "Demo — ليلى ح.", country: "Kuwait", rating: 5,
      body: "رحلة رائعة بكل المقاييس، الاهتمام بالتفاصيل والمرشد المصري كانا فوق التوقعات. أنصح بها لكل عائلة.",
      monthsAgo: 1, language: "ar", source: "WHATSAPP",
    },
    {
      tour: "cairo-giza-pyramids-day-tour", name: "Demo — Elena V.", country: "Italy", rating: 5,
      body: "Una giornata perfetta: piramidi senza fretta, pranzo delizioso e una guida che parlava un ottimo italiano. Organizzazione impeccabile.",
      monthsAgo: 3, language: "it", source: "GOOGLE", featured: true,
    },
    {
      tour: "cairo-giza-pyramids-day-tour", name: "Demo — Mathieu D.", country: "France", rating: 4,
      body: "Très belle excursion, prise en charge à l'hôtel ponctuelle et guide passionnant. Le musée méritait un peu plus de temps.",
      monthsAgo: 5, language: "fr", source: "WEBSITE",
    },
    {
      tour: "8-day-classic-egypt", name: "Demo — Anastasia P.", country: "Russia", rating: 5,
      body: "Восемь дней пролетели незаметно — пирамиды, круиз по Нилу и рассвет в Абу-Симбеле. Всё было продумано до мелочей.",
      monthsAgo: 2, language: "ru", source: "EMAIL", featured: true,
    },
    {
      tour: "8-day-classic-egypt", name: "Demo — Deniz K.", country: "Türkiye", rating: 5,
      body: "Kahire'den Abu Simbel'e kadar her şey kusursuzdu. Rehberimiz tarihi hikâyelerle anlattı, aile olarak bayıldık.",
      monthsAgo: 6, language: "tr", source: "FACEBOOK",
    },
    {
      tour: "luxor-temples-valley-of-kings", name: "Demo — Sarah W.", country: "Australia", rating: 5,
      body: "Two unhurried days that felt like a private documentary. Karnak at golden hour alone was worth the trip.",
      monthsAgo: 3, language: "en", source: "GOOGLE",
    },
    // A hidden review so the dashboard visibility filter has something to show.
    {
      tour: "red-sea-diving-escape-hurghada", name: "Demo — Hidden Example", country: "Egypt", rating: 3,
      body: "Demo row seeded as hidden — it never renders on the public site and exists only to exercise the admin visibility filter.",
      monthsAgo: 1, language: "en", source: "OTHER", visible: false,
    },
    // A general review (no tour) so the "No specific tour" path is visible.
    {
      tour: null, name: "Demo — Miguel S.", country: "Spain", rating: 5,
      body: "From the first WhatsApp message to the airport drop-off, everything felt personal and effortless. A wonderful team.",
      monthsAgo: 2, language: "en", source: "WHATSAPP", featured: true,
    },
  ];
  const monthStart = (monthsAgo: number) => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1));
  };
  await prisma.review.createMany({
    data: demoReviews.map((r, i) => ({
      tourId: r.tour ? tourIds[r.tour] : null,
      customerName: r.name,
      customerCountry: r.country,
      rating: r.rating,
      body: r.body,
      travelDate: monthStart(r.monthsAgo),
      language: r.language,
      source: r.source,
      featured: r.featured ?? false,
      visible: r.visible ?? true,
      displayOrder: i,
    })),
  });
  // ════════════════════════ END DEMO REVIEWS ══════════════════════════

  // ── Testimonials ───────────────────────────────────────────────────
  const testimonials: Array<[string, string, number, [string, string]]> = [
    ["Amelia Hart", "United Kingdom", 5, ["Every detail was handled with care — the Nile cruise was the trip of a lifetime.", "كل تفصيلة عولجت بعناية — كانت رحلة النيل رحلة العمر."]],
    ["Jonas Müller", "Germany", 5, ["Impeccable guides and seamless logistics from Cairo to Abu Simbel.", "مرشدون بارعون وتنظيم سلس من القاهرة إلى أبو سمبل."]],
    ["Omar Khaled", "United Arab Emirates", 5, ["A premium experience end to end. We already recommend AIC to friends.", "تجربة راقية من البداية للنهاية. نوصي بـ AIC لأصدقائنا بالفعل."]],
  ];
  for (const [i, [name, country, rating, quotes]] of testimonials.entries()) {
    await prisma.testimonial.create({
      data: {
        authorName: name,
        authorCountry: country,
        rating,
        order: i,
        featured: true,
        avatarPath: await seedImage("gallery", name.toLowerCase().replace(/\s+/g, "-"), 400, 400),
        translations: {
          create: [
            { locale: "en", quote: quotes[0] },
            { locale: "ar", quote: quotes[1] },
          ],
        },
      },
    });
  }

  // ── Hero banners ───────────────────────────────────────────────────
  const banners: Array<[string, number, [string, string, string], [string, string, string]]> = [
    ["hero/nile-dawn", 1,
      ["Egypt, unhurried and unforgettable", "Curated journeys along the Nile — request a booking and we tailor every detail.", "Explore tours"],
      ["مصر بلا عجلة ولا تُنسى", "رحلات مختارة على ضفاف النيل — اطلب الحجز ونخصص كل تفصيلة.", "استكشف الجولات"]],
    ["hero/red-sea", 2,
      ["Where history meets the sea", "From pharaonic temples to coral reefs, in one seamless trip.", "See destinations"],
      ["حيث يلتقي التاريخ بالبحر", "من المعابد الفرعونية إلى الشعاب المرجانية في رحلة واحدة سلسة.", "شاهد الوجهات"]],
  ];
  for (const [img, order, en, ar] of banners) {
    await prisma.heroBanner.create({
      data: {
        imagePath: await seedImage("hero", img.replace(/^hero\//, ""), 2000, 857),
        order,
        enabled: true,
        showSearch: order === 1, // demo: first banner shows the search box, second doesn't
        ctaUrl: "/tours",
        translations: {
          create: [
            { locale: "en", headline: en[0], subheadline: en[1], ctaLabel: en[2] },
            { locale: "ar", headline: ar[0], subheadline: ar[1], ctaLabel: ar[2] },
          ],
        },
      },
    });
  }

  // ── Homepage sections ──────────────────────────────────────────────
  // Order mirrors the fixed on-page layout of the public homepage. Only sections
  // the homepage actually renders are seeded — categories/testimonials were
  // editor-only rows with no effect on the live page and have been removed.
  const sections: Array<[string, string, number, [string, string, string], [string, string, string]]> = [
    ["featured-tours", "featuredTours", 1, ["Featured journeys", "Our most-requested experiences this season.", "View all tours"], ["رحلات مميزة", "أكثر تجاربنا طلبًا هذا الموسم.", "عرض كل الجولات"]],
    ["why-us", "whyUs", 2, ["Why travel with AIC", "Local expertise, honest pricing, and a team on call throughout your trip.", ""], ["لماذا تسافر مع AIC", "خبرة محلية وأسعار صادقة وفريق متاح طوال رحلتك.", ""]],
    ["destinations", "destinations", 3, ["Popular destinations", "Where our travellers love to go.", "All destinations"], ["وجهات مشهورة", "حيث يحب مسافرونا الذهاب.", "كل الوجهات"]],
    ["about", "about", 4, ["AIC Travel & SoHolidays", "A premium Egyptian tour operator in partnership with SoHolidays, our official tourism partner.", "About us"], ["AIC ترافيل وسوهوليدايز", "منظم رحلات مصري راقٍ بالشراكة مع سوهوليدايز، شريكنا السياحي الرسمي.", "من نحن"]],
    ["latest-blog", "latestBlog", 5, ["From the journal", "Guides and tips for your Egyptian journey.", "Read the blog"], ["من المدونة", "أدلة ونصائح لرحلتك المصرية.", "اقرأ المدونة"]],
    ["contact-cta", "contactCta", 6, ["Ready to plan your trip?", "Send a request and our team will be in touch within one business day.", "Request a booking"], ["مستعد لتخطيط رحلتك؟", "أرسل طلبًا وسيتواصل فريقنا خلال يوم عمل واحد.", "اطلب الحجز"]],
  ];
  for (const [key, type, order, en, ar] of sections) {
    await prisma.homepageSection.create({
      data: {
        key,
        type,
        order,
        enabled: true,
        translations: {
          create: [
            { locale: "en", heading: en[0], body: en[1], ctaLabel: en[2] || null },
            { locale: "ar", heading: ar[0], body: ar[1], ctaLabel: ar[2] || null },
          ],
        },
      },
    });
  }

  // ── Blog (English-only, §21) ───────────────────────────────────────
  const guideCat = await prisma.blogCategory.create({ data: { slug: "travel-guides", name: "Travel Guides" } });
  const blogPosts: Array<[string, string, string, boolean]> = [
    ["nile-cruise-guide", "The Complete Nile Cruise Guide", "Everything you need to know before sailing between Luxor and Aswan — when to go, what to pack, and which temples not to miss.", true],
    ["cairo-travel-tips", "Cairo Travel Tips for First-Timers", "How to make the most of the pyramids, the museum and the markets without the overwhelm.", false],
  ];
  for (const [slug, title, excerpt, featured] of blogPosts) {
    await prisma.blogPost.create({
      data: {
        slug,
        categoryId: guideCat.id,
        featured,
        published: true,
        publishedAt: new Date(),
        coverImagePath: await seedImage("blog", slug, 1600, 900),
        translations: {
          create: [
            {
              locale: "en",
              title,
              excerpt,
              body: `${excerpt}\n\nThis is placeholder body content seeded for Phase 1. The blog editor lands in Phase 4.`,
              seoTitle: `${title} | AIC Travel Blog`,
              metaDescription: excerpt.slice(0, 155),
            },
          ],
        },
      },
    });
  }

  // ── Operations reference data ──────────────────────────────────────
  await prisma.guide.createMany({
    data: [
      { name: "Hassan Ali", languages: ["en", "ar", "de"], contact: "+20 100 000 0001", availabilityStatus: "AVAILABLE" },
      { name: "Nour El-Din", languages: ["en", "ar", "fr"], contact: "+20 100 000 0002", availabilityStatus: "AVAILABLE" },
    ],
  });
  await prisma.vehicle.createMany({
    data: [
      { name: "Toyota Hiace", capacity: 12, type: "Van", status: "ACTIVE" },
      { name: "Mercedes Sprinter", capacity: 16, type: "Minibus", status: "ACTIVE" },
    ],
  });
}

main()
  .then(async () => {
    const [tours, tourTr, cats, dests, testi, reviews, sections, banners, posts] = await Promise.all([
      prisma.tour.count(),
      prisma.tourTranslation.count(),
      prisma.category.count(),
      prisma.destination.count(),
      prisma.testimonial.count(),
      prisma.review.count(),
      prisma.homepageSection.count(),
      prisma.heroBanner.count(),
      prisma.blogPost.count(),
    ]);
    console.log("✅ Seed complete:", { tours, tourTr, cats, dests, testi, reviews, sections, banners, posts });
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
