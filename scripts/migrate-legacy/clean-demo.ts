/**
 * Removes demo/seed BUSINESS content from the target PostgreSQL database so the
 * legacy import lands in a clean catalog. Run backup-target.ts first.
 *
 * DELETES (demo business content):
 *   reviews, assignments, lead notes/communications, leads, FAQs, tours
 *   (+translations/images via cascade), categories, destinations, testimonials,
 *   hero banners, blog posts + blog categories, guides, vehicles, media records.
 *
 * PRESERVES (per instruction): users, roles (User.role), authentication
 *   (Account/Session/VerificationToken), settings, assignment rules (routing
 *   config), audit logs, notifications, and homepage sections (site chrome —
 *   flagged for a separate decision; the migration never writes them).
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy/clean-demo.ts            → preview counts only
 *   npx tsx scripts/migrate-legacy/clean-demo.ts --confirm  → delete
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function loadDotEnv(): void {
  const p = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const confirm = process.argv.includes("--confirm");
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL });

  try {
    // FK-safe order. Translations/images/tour-FAQs cascade from their parents,
    // but each table is listed explicitly so the counts are visible.
    const targets: [string, { count: () => Promise<number>; deleteMany: () => Promise<{ count: number }> }][] = [
      ["Review", prisma.review],
      ["Assignment", prisma.assignment],
      ["LeadCommunication", prisma.leadCommunication],
      ["LeadNote", prisma.leadNote],
      ["Lead", prisma.lead],
      ["FaqTranslation", prisma.faqTranslation],
      ["Faq", prisma.faq],
      ["TourImage", prisma.tourImage],
      ["TourTranslation", prisma.tourTranslation],
      ["Tour", prisma.tour],
      ["CategoryTranslation", prisma.categoryTranslation],
      ["Category", prisma.category],
      ["DestinationTranslation", prisma.destinationTranslation],
      ["Destination", prisma.destination],
      ["TestimonialTranslation", prisma.testimonialTranslation],
      ["Testimonial", prisma.testimonial],
      ["HeroBannerTranslation", prisma.heroBannerTranslation],
      ["HeroBanner", prisma.heroBanner],
      ["BlogPostTranslation", prisma.blogPostTranslation],
      ["BlogPost", prisma.blogPost],
      ["BlogCategory", prisma.blogCategory],
      ["Guide", prisma.guide],
      ["Vehicle", prisma.vehicle],
      ["Media", prisma.media],
    ];

    const preserved: [string, () => Promise<number>][] = [
      ["User", () => prisma.user.count()],
      ["Account", () => prisma.account.count()],
      ["Session", () => prisma.session.count()],
      ["Settings", () => prisma.settings.count()],
      ["AssignmentRule", () => prisma.assignmentRule.count()],
      ["AuditLog", () => prisma.auditLog.count()],
      ["Notification", () => prisma.notification.count()],
      ["HomepageSection", () => prisma.homepageSection.count()],
      ["HomepageSectionTranslation", () => prisma.homepageSectionTranslation.count()],
    ];

    console.log(confirm ? "Deleting demo business content…" : "PREVIEW — nothing deleted (pass --confirm to delete).");
    console.log("");
    console.log("Would delete / deleted:");
    let total = 0;
    for (const [name, model] of targets) {
      if (confirm) {
        const { count } = await model.deleteMany();
        total += count;
        console.log(`  ${name.padEnd(26)} ${count}`);
      } else {
        const count = await model.count();
        total += count;
        console.log(`  ${name.padEnd(26)} ${count}`);
      }
    }
    console.log(`  ${"TOTAL".padEnd(26)} ${total}`);
    console.log("");
    console.log("Preserved:");
    for (const [name, count] of preserved) {
      console.log(`  ${name.padEnd(26)} ${await count()}`);
    }
    if (!confirm) console.log("\nRe-run with --confirm to apply.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exitCode = 1;
});
