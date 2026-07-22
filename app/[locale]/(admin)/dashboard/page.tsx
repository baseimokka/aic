import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { translationTargets, localeNames, type Locale } from "@/lib/i18n/config";
import { Avatar } from "@/components/admin/avatar";
import { LeadStatusPill, AuditActionPill } from "@/components/admin/pills";
import { IconChart, IconCheck, IconClock, IconLeads } from "@/components/admin/icons";

const BAR_TINTS: Record<string, string> = {
  ar: "#1f8a5b",
  de: "#2f6db0",
  ru: "#6c4ba6",
  tr: "#c98a16",
  fr: "#0e7a72",
  it: "#c0511f",
};

export default async function DashboardPage() {
  const actor = await requireActor();
  const showLeads = can(actor.role, "leads", "view");
  const showTranslations = can(actor.role, "translations", "view");
  const showAudit = can(actor.role, "auditLogs", "view");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const live = { archivedAt: null } as const;

  const [user, newToday, total30d, confirmed, totalAll, recentLeads, tourCount, translated, activity] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } }),
      prisma.lead.count({ where: { ...live, createdAt: { gte: startOfToday } } }),
      prisma.lead.count({ where: { ...live, createdAt: { gte: days30 } } }),
      prisma.lead.count({ where: { ...live, status: "CONFIRMED" } }),
      prisma.lead.count({ where: live }),
      showLeads
        ? prisma.lead.findMany({
            where: live,
            orderBy: { createdAt: "desc" },
            take: 4,
            select: {
              id: true,
              fullName: true,
              country: true,
              status: true,
              createdAt: true,
              source: true,
              tour: { select: { translations: { where: { locale: "en" }, select: { title: true } } } },
            },
          })
        : Promise.resolve([]),
      showTranslations ? prisma.tour.count({ where: live }) : Promise.resolve(0),
      showTranslations
        ? prisma.tourTranslation.groupBy({
            by: ["locale"],
            where: { tour: { archivedAt: null } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      showAudit
        ? prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 4,
            select: {
              id: true,
              actionType: true,
              resourceType: true,
              metadata: true,
              createdAt: true,
              actor: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const conversion = totalAll > 0 ? Math.round((confirmed / totalAll) * 1000) / 10 : 0;
  const firstName = (user?.name ?? "there").split(" ")[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const translatedByLocale = new Map(translated.map((t) => [t.locale, t._count._all]));

  const kpis = [
    { label: "New leads today", value: String(newToday), caption: "since midnight", icon: <IconLeads width={16} height={16} />, tile: "bg-accent-soft text-accent-deep" },
    { label: "Total leads (30d)", value: total30d.toLocaleString("en-US"), caption: "last 30 days", icon: <IconChart width={16} height={16} />, tile: "bg-[#eaf1f9] text-info" },
    { label: "Confirmed bookings", value: confirmed.toLocaleString("en-US"), caption: "all time", icon: <IconCheck width={16} height={16} />, tile: "bg-[#e4f3eb] text-success-deep" },
    { label: "Conversion rate", value: `${conversion}%`, caption: "confirmed ÷ all leads", icon: <IconClock width={16} height={16} />, tile: "bg-warning-soft text-[#9a5a00]" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[28px] font-medium text-ink">
            {greeting}, {firstName}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}Here&rsquo;s what needs your attention.
          </p>
        </div>
        {showLeads ? (
          <Link
            href="/en/dashboard/leads"
            className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-cream"
          >
            View leads
          </Link>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{kpi.label}</span>
              <span className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg ${kpi.tile}`}>
                {kpi.icon}
              </span>
            </div>
            <div className="mb-0.5 mt-1.5 text-[28px] font-extrabold tabular-nums text-ink">{kpi.value}</div>
            <div className="text-xs font-semibold text-faint">{kpi.caption}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        {showLeads ? (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <span className="text-[15px] font-extrabold text-ink">Recent leads</span>
              <Link href="/en/dashboard/leads" className="text-xs font-bold text-accent hover:text-accent-deep">
                View all
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No leads yet — new booking requests will appear here.</p>
            ) : (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/en/dashboard/leads/${lead.id}`}
                  className="grid grid-cols-[1.6fr_0.9fr_0.7fr] items-center gap-3 border-b border-line-soft px-5 py-3 last:border-b-0 hover:bg-cream sm:grid-cols-[1.6fr_1.4fr_0.9fr_0.7fr]"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={lead.fullName} muted />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{lead.fullName}</span>
                      <span className="block truncate text-xs text-faint">{lead.country || "—"}</span>
                    </span>
                  </span>
                  <span className="hidden truncate text-[13px] text-ink-soft sm:block">
                    {lead.tour?.translations[0]?.title ?? (lead.source === "contact" ? "Contact enquiry" : "General enquiry")}
                  </span>
                  <span>
                    <LeadStatusPill status={lead.status} />
                  </span>
                  <span className="text-end text-xs text-faint">{timeAgo(lead.createdAt)}</span>
                </Link>
              ))
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {showTranslations ? (
            <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
              <div className="mb-3.5 text-[15px] font-extrabold text-ink">Translation coverage</div>
              <div className="flex flex-col gap-3">
                {translationTargets.map((locale) => {
                  const done = translatedByLocale.get(locale) ?? 0;
                  const pct = tourCount > 0 ? Math.round((done / tourCount) * 100) : 0;
                  return (
                    <div key={locale}>
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="font-semibold text-ink-soft">{localeNames[locale as Locale].english}</span>
                        <span className="tabular-nums text-faint">{pct}%</span>
                      </div>
                      <div className="h-[7px] rounded-full bg-surface-2">
                        <div
                          className="h-[7px] rounded-full"
                          style={{ width: `${pct}%`, background: BAR_TINTS[locale] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-faint">Tour translations drafted or better, per language.</p>
            </div>
          ) : null}

          {showAudit ? (
            <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
              <div className="mb-3.5 text-[15px] font-extrabold text-ink">Recent activity</div>
              {activity.length === 0 ? (
                <p className="text-sm text-muted">No administrative activity logged yet.</p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {activity.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <AuditActionPill action={entry.actionType} />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-ink-soft">
                          <strong>{entry.actor?.name ?? "System"}</strong>
                          {" · "}
                          {auditSummary(entry.resourceType, entry.metadata)}
                        </div>
                        <div className="text-[11px] text-faint">{formatDateTime(entry.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/en/dashboard/audit" className="mt-3 inline-block text-xs font-bold text-accent hover:text-accent-deep">
                Open audit log →
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function auditSummary(resourceType: string, metadata: unknown): string {
  if (metadata && typeof metadata === "object" && "summary" in metadata) {
    const summary = (metadata as { summary?: unknown }).summary;
    if (typeof summary === "string" && summary) return summary;
  }
  return resourceType;
}
