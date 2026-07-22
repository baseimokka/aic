import Link from "next/link";
import type { Prisma, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { cn, formatMoney, timeAgo } from "@/lib/utils";
import { resolvePricing } from "@/lib/pricing";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads/labels";
import { leadStatusSchema } from "@/lib/validation/lead";
import { NoAccess } from "@/components/admin/no-access";
import { Avatar } from "@/components/admin/avatar";
import { CreateLink } from "@/components/admin/page-header";
import { LeadStatusPill, PaymentStatusPill } from "@/components/admin/pills";
import { IconSearch } from "@/components/admin/icons";

const PAGE_SIZE = 20;

const CHIP_TINTS: Record<LeadStatus, string> = {
  NEW: "text-[#2f6db0]",
  CONTACTED: "text-[#9a5a00]",
  NEGOTIATING: "text-[#c0511f]",
  CONFIRMED: "text-[#0f6b43]",
  CANCELLED: "text-ink-soft",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "leads", "view")) return <NoAccess />;

  const sp = await searchParams;
  const archived = sp.archived === "1";
  const statusParsed = leadStatusSchema.safeParse(sp.status);
  const status = statusParsed.success ? statusParsed.data : undefined;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const base: Prisma.LeadWhereInput = { archivedAt: archived ? { not: null } : null };
  if (q) {
    base.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { tour: { translations: { some: { locale: "en", title: { contains: q, mode: "insensitive" } } } } },
    ];
  }
  const where: Prisma.LeadWhereInput = { ...base, ...(status ? { status } : {}) };

  const [byStatus, archivedCount, total, leads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { ...base, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.lead.count({ where: { ...(q ? { OR: base.OR } : {}), archivedAt: { not: null } } }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        country: true,
        status: true,
        paymentStatus: true,
        currency: true,
        adults: true,
        children: true,
        source: true,
        createdAt: true,
        assignedStaff: { select: { id: true, name: true, email: true } },
        tour: {
          select: {
            basePrice: true,
            discountType: true,
            discountValue: true,
            discountStartsAt: true,
            discountEndsAt: true,
            currency: true,
            translations: { where: { locale: "en" }, select: { title: true } },
          },
        },
      },
    }),
  ]);

  const countFor = (s: LeadStatus) => byStatus.find((row) => row.status === s)?._count._all ?? 0;
  const allCount = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chipHref = (params: { status?: LeadStatus; archived?: boolean }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (params.status) query.set("status", params.status);
    if (params.archived) query.set("archived", "1");
    const qs = query.toString();
    return `/en/dashboard/leads${qs ? `?${qs}` : ""}`;
  };

  const pageHref = (p: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (archived) query.set("archived", "1");
    query.set("page", String(p));
    return `/en/dashboard/leads?${query.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <Chip href={chipHref({})} active={!status && !archived} className="text-white">
            All {allCount}
          </Chip>
          {LEAD_STATUSES.map((s) => (
            <Chip key={s} href={chipHref({ status: s })} active={status === s} className={CHIP_TINTS[s]}>
              {LEAD_STATUS_LABELS[s]} {countFor(s)}
            </Chip>
          ))}
          <Chip href={chipHref({ archived: true })} active={archived} className="text-muted">
            Archived {archivedCount}
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <form method="get" className="relative" role="search">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {archived ? <input type="hidden" name="archived" value="1" /> : null}
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <label htmlFor="lead-search" className="sr-only">
              Search leads
            </label>
            <input
              id="lead-search"
              name="q"
              defaultValue={q}
              placeholder="Search leads…"
              className="h-11 w-[220px] rounded-[9px] border-[1.5px] border-line-input bg-white ps-9 pe-3 text-[13px] text-ink outline-none focus:border-accent"
            />
          </form>
          {can(actor.role, "leads", "create") ? (
            <CreateLink href="/en/dashboard/leads/new" label="New lead" />
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[1.6fr_1.3fr_1fr_1.1fr_1.1fr_0.7fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Customer</span>
            <span>Tour</span>
            <span>Status</span>
            <span>Assigned</span>
            <span>Value</span>
            <span className="text-end">Date</span>
          </div>
          {leads.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              No leads match{q ? ` “${q}”` : " this filter"}.{" "}
              <Link href="/en/dashboard/leads" className="font-bold text-accent">
                Clear filters
              </Link>
            </p>
          ) : (
            leads.map((lead) => {
              // Booking value = effective (discounted) price per person × travelers.
              const value = lead.tour
                ? resolvePricing({
                    basePrice: Number(lead.tour.basePrice),
                    discountType: lead.tour.discountType,
                    discountValue: lead.tour.discountValue == null ? null : Number(lead.tour.discountValue),
                    discountStartsAt: lead.tour.discountStartsAt,
                    discountEndsAt: lead.tour.discountEndsAt,
                  }).effectivePrice * (lead.adults + lead.children)
                : null;
              const valueCurrency = lead.tour?.currency ?? lead.currency;
              return (
                <Link
                  key={lead.id}
                  href={`/en/dashboard/leads/${lead.id}`}
                  className="grid grid-cols-[1.6fr_1.3fr_1fr_1.1fr_1.1fr_0.7fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-cream"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={lead.fullName} muted />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{lead.fullName}</span>
                      <span className="block truncate text-xs text-faint">{lead.country || "—"}</span>
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">
                    {lead.tour?.translations[0]?.title ??
                      (lead.source === "contact" ? "Contact enquiry" : "General enquiry")}
                  </span>
                  <span>
                    <LeadStatusPill status={lead.status} />
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-soft">
                    {lead.assignedStaff ? (
                      <>
                        <Avatar
                          name={lead.assignedStaff.name ?? lead.assignedStaff.email}
                          seed={lead.assignedStaff.id}
                          size={24}
                        />
                        <span className="truncate">{shortName(lead.assignedStaff.name ?? lead.assignedStaff.email)}</span>
                      </>
                    ) : (
                      <span className="text-faint">Unassigned</span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span className="text-sm font-bold tabular-nums text-ink">
                      {value !== null ? formatMoney(value, valueCurrency) : "—"}
                    </span>
                    <PaymentStatusPill status={lead.paymentStatus} />
                  </span>
                  <span className="text-end text-xs text-faint">{timeAgo(lead.createdAt)}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-3.5 flex items-center justify-between text-[13px] text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1.5">
            <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
              Previous
            </PageLink>
            <PageLink href={pageHref(page + 1)} disabled={page >= pageCount}>
              Next
            </PageLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-[38px] items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold",
        active ? "border-ink bg-ink !text-white" : "border-line-input bg-white hover:bg-cream",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-faint">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3.5 font-semibold text-ink hover:bg-cream"
    >
      {children}
    </Link>
  );
}

function shortName(full: string): string {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return full;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
