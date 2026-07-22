/**
 * Full logical backup of the target PostgreSQL database → one JSON file per run
 * (docs/migration/backups/backup-<timestamp>.json, gitignored — contains auth
 * data). Taken before the demo-content cleanup and before --import, since no
 * pg_dump/neonctl is available on this machine. Every table is captured, so a
 * restore script can rebuild the exact state if needed.
 *
 * Usage: npx tsx scripts/migrate-legacy/backup-target.ts
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
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL });

  // Every model in schema.prisma — keep in sync if the schema grows.
  const tables: Record<string, () => Promise<unknown[]>> = {
    user: () => prisma.user.findMany(),
    account: () => prisma.account.findMany(),
    session: () => prisma.session.findMany(),
    verificationToken: () => prisma.verificationToken.findMany(),
    settings: () => prisma.settings.findMany(),
    assignmentRule: () => prisma.assignmentRule.findMany(),
    auditLog: () => prisma.auditLog.findMany(),
    notification: () => prisma.notification.findMany(),
    tour: () => prisma.tour.findMany(),
    tourTranslation: () => prisma.tourTranslation.findMany(),
    tourImage: () => prisma.tourImage.findMany(),
    category: () => prisma.category.findMany(),
    categoryTranslation: () => prisma.categoryTranslation.findMany(),
    destination: () => prisma.destination.findMany(),
    destinationTranslation: () => prisma.destinationTranslation.findMany(),
    testimonial: () => prisma.testimonial.findMany(),
    testimonialTranslation: () => prisma.testimonialTranslation.findMany(),
    review: () => prisma.review.findMany(),
    faq: () => prisma.faq.findMany(),
    faqTranslation: () => prisma.faqTranslation.findMany(),
    homepageSection: () => prisma.homepageSection.findMany(),
    homepageSectionTranslation: () => prisma.homepageSectionTranslation.findMany(),
    heroBanner: () => prisma.heroBanner.findMany(),
    heroBannerTranslation: () => prisma.heroBannerTranslation.findMany(),
    blogCategory: () => prisma.blogCategory.findMany(),
    blogPost: () => prisma.blogPost.findMany(),
    blogPostTranslation: () => prisma.blogPostTranslation.findMany(),
    lead: () => prisma.lead.findMany(),
    leadNote: () => prisma.leadNote.findMany(),
    leadCommunication: () => prisma.leadCommunication.findMany(),
    guide: () => prisma.guide.findMany(),
    vehicle: () => prisma.vehicle.findMany(),
    assignment: () => prisma.assignment.findMany(),
    media: () => prisma.media.findMany(),
  };

  const snapshot: Record<string, unknown[]> = {};
  const counts: string[] = [];
  try {
    for (const [name, fetch] of Object.entries(tables)) {
      const rows = await fetch();
      snapshot[name] = rows;
      counts.push(`${name.padEnd(28)} ${rows.length}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(PROJECT_ROOT, "docs", "migration", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup-${stamp}.json`);
  // Decimal/Date serialize via toJSON — restore parses them back by column type.
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), tables: snapshot }, null, 1), "utf8");

  console.log("Row counts:");
  console.log(counts.join("\n"));
  console.log(`\nBackup written to ${path.relative(PROJECT_ROOT, file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exitCode = 1;
});
