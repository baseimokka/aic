import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { IconChart, IconCheck, IconClock } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Analytics" };

/**
 * Analytics KPI dashboard (Phase 7, CLAUDE.md §9). View-only for every role
 * (analytics: V). Six KPIs: total leads, confirmed bookings, conversion rate,
 * top requested tours, leads by country, and monthly performance. All figures
 * exclude archived leads. Read-only — no mutations, so nothing is audited.
 */
export default async function AnalyticsPage() {
  const actor = await requireActor();
  if (!can(actor.role, "analytics", "view")) return <NoAccess />;

  const now = new Date();
  const firstOfWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const live = { archivedAt: null } as const;

  const [totalAll, confirmed, transfersTotal, transfersConfirmed, topTourGroups, countryGroups, monthlyLeads] = await Promise.all([
    prisma.lead.count({ where: live }),
    prisma.lead.count({ where: { ...live, status: "CONFIRMED" } }),
    prisma.transferRequest.count({ where: live }),
    prisma.transferRequest.count({ where: { ...live, status: "CONFIRMED" } }),
    prisma.lead.groupBy({
      by: ["tourId"],
      where: { ...live, tourId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { tourId: "desc" } },
      take: 6,
    }),
    prisma.lead.groupBy({
      by: ["country"],
      where: { ...live, country: { not: "" } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 8,
    }),
    prisma.lead.findMany({
      where: { ...live, createdAt: { gte: firstOfWindow } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const conversion = totalAll > 0 ? Math.round((confirmed / totalAll) * 1000) / 10 : 0;
  const transferConversion = transfersTotal > 0 ? Math.round((transfersConfirmed / transfersTotal) * 1000) / 10 : 0;

  // Top requested tours — resolve English titles for the grouped tour ids.
  const tourIds = topTourGroups.map((g) => g.tourId).filter((id): id is string => Boolean(id));
  const tours = tourIds.length
    ? await prisma.tour.findMany({
        where: { id: { in: tourIds } },
        select: { id: true, slug: true, translations: { where: { locale: "en" }, select: { title: true } } },
      })
    : [];
  const tourById = new Map(tours.map((t) => [t.id, t]));
  const topTours = topTourGroups
    .map((g) => {
      const tour = g.tourId ? tourById.get(g.tourId) : undefined;
      return { id: g.tourId ?? "", slug: tour?.slug ?? "", title: tour?.translations[0]?.title ?? "Untitled tour", count: g._count._all };
    })
    .filter((t) => t.id);

  const countries = countryGroups.map((g) => ({ country: g.country, count: g._count._all }));

  // Monthly performance — six rolling buckets (oldest → newest).
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), leads: 0, confirmed: 0 };
  });
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const lead of monthlyLeads) {
    const d = new Date(lead.createdAt);
    const i = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) continue;
    months[i].leads += 1;
    if (lead.status === "CONFIRMED") months[i].confirmed += 1;
  }
  const monthMax = Math.max(1, ...months.map((m) => m.leads));

  const kpis = [
    { label: "Total leads", value: totalAll.toLocaleString("en-US"), caption: "all time", icon: <IconChart width={16} height={16} />, tile: "bg-[#eaf1f9] text-info" },
    { label: "Confirmed bookings", value: confirmed.toLocaleString("en-US"), caption: "all time", icon: <IconCheck width={16} height={16} />, tile: "bg-[#e4f3eb] text-success-deep" },
    { label: "Conversion rate", value: `${conversion}%`, caption: "confirmed ÷ all leads", icon: <IconClock width={16} height={16} />, tile: "bg-warning-soft text-[#9a5a00]" },
  ];

  const transferKpis = [
    { label: "Transfer requests", value: transfersTotal.toLocaleString("en-US"), caption: "all time", icon: <IconChart width={16} height={16} />, tile: "bg-[#eaf1f9] text-info" },
    { label: "Confirmed transfers", value: transfersConfirmed.toLocaleString("en-US"), caption: "all time", icon: <IconCheck width={16} height={16} />, tile: "bg-[#e4f3eb] text-success-deep" },
    { label: "Transfer conversion", value: `${transferConversion}%`, caption: "confirmed ÷ all requests", icon: <IconClock width={16} height={16} />, tile: "bg-warning-soft text-[#9a5a00]" },
  ];

  return (
    <div>
      <PageHeader title="Analytics" description="Lead performance across the pipeline. Figures exclude archived leads." />

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{kpi.label}</span>
              <span className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg ${kpi.tile}`}>{kpi.icon}</span>
            </div>
            <div className="mb-0.5 mt-1.5 text-[30px] font-extrabold tabular-nums text-ink">{kpi.value}</div>
            <div className="text-xs font-semibold text-faint">{kpi.caption}</div>
          </div>
        ))}
      </div>

      {/* Transfer requests (Transfer module) */}
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {transferKpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{kpi.label}</span>
              <span className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg ${kpi.tile}`}>{kpi.icon}</span>
            </div>
            <div className="mb-0.5 mt-1.5 text-[30px] font-extrabold tabular-nums text-ink">{kpi.value}</div>
            <div className="text-xs font-semibold text-faint">{kpi.caption}</div>
          </div>
        ))}
      </div>

      {/* Monthly performance */}
      <div className="mb-4 rounded-xl border border-line bg-white px-5 py-4 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-ink">Monthly performance</span>
          <div className="flex items-center gap-3.5 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#c9b8e6" }} />Leads</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#1f8a5b" }} />Confirmed</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height: 180 }}>
          {months.map((m) => (
            <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full items-end justify-center gap-1" style={{ height: 140 }}>
                <div
                  className="w-1/2 max-w-[26px] rounded-t"
                  style={{ height: `${(m.leads / monthMax) * 100}%`, minHeight: m.leads ? 3 : 0, background: "#c9b8e6" }}
                  title={`${m.leads} leads`}
                />
                <div
                  className="w-1/2 max-w-[26px] rounded-t"
                  style={{ height: `${(m.confirmed / monthMax) * 100}%`, minHeight: m.confirmed ? 3 : 0, background: "#1f8a5b" }}
                  title={`${m.confirmed} confirmed`}
                />
              </div>
              <div className="text-[11px] font-bold text-ink-soft">{m.label}</div>
              <div className="text-[10px] tabular-nums text-faint">{m.leads}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top requested tours */}
        <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
          <div className="mb-3.5 text-[15px] font-extrabold text-ink">Top requested tours</div>
          {topTours.length === 0 ? (
            <p className="py-6 text-sm text-muted">No tour requests yet.</p>
          ) : (
            <BarList
              rows={topTours.map((t) => ({
                key: t.id,
                label: t.title,
                href: t.slug ? `/en/tours/${t.slug}` : undefined,
                count: t.count,
              }))}
              tint="#c0511f"
            />
          )}
        </div>

        {/* Leads by country */}
        <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
          <div className="mb-3.5 text-[15px] font-extrabold text-ink">Leads by country</div>
          {countries.length === 0 ? (
            <p className="py-6 text-sm text-muted">No country data yet.</p>
          ) : (
            <BarList
              rows={countries.map((c) => ({ key: c.country, label: c.country, count: c.count }))}
              tint="#2f6db0"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function BarList({
  rows,
  tint,
}: {
  rows: Array<{ key: string; label: string; href?: string; count: number }>;
  tint: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3">
          <span className="w-[42%] min-w-0 truncate text-[13px] font-semibold text-ink-soft">
            {r.href ? (
              <Link href={r.href} className="hover:text-accent-deep">
                {r.label}
              </Link>
            ) : (
              r.label
            )}
          </span>
          <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: tint }} />
          </span>
          <span className="w-8 text-end text-[13px] font-bold tabular-nums text-ink">{r.count}</span>
        </div>
      ))}
    </div>
  );
}
