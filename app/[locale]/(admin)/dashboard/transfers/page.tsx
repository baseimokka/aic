import Link from "next/link";
import type { Prisma, TransferRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { cn, formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { TRANSFER_STATUSES, TRANSFER_STATUS_LABELS } from "@/lib/transfers/labels";
import { transferRequestStatusSchema } from "@/lib/validation/transfer";
import { NoAccess } from "@/components/admin/no-access";
import { Avatar } from "@/components/admin/avatar";
import { TransferStatusPill } from "@/components/admin/pills";
import { IconSearch } from "@/components/admin/icons";

const PAGE_SIZE = 20;

const CHIP_TINTS: Record<TransferRequestStatus, string> = {
  NEW: "text-[#2f6db0]",
  CONTACTED: "text-[#9a5a00]",
  CONFIRMED: "text-[#0f6b43]",
  CANCELLED: "text-ink-soft",
};

export default async function TransferRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "transferRequests", "view")) return <NoAccess />;

  const sp = await searchParams;
  const archived = sp.archived === "1";
  const statusParsed = transferRequestStatusSchema.safeParse(sp.status);
  const status = statusParsed.success ? statusParsed.data : undefined;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const base: Prisma.TransferRequestWhereInput = { archivedAt: archived ? { not: null } : null };
  if (q) {
    base.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { fromLocation: { name: { contains: q, mode: "insensitive" } } },
      { toLocation: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  const where: Prisma.TransferRequestWhereInput = { ...base, ...(status ? { status } : {}) };

  const [byStatus, archivedCount, total, requests] = await Promise.all([
    prisma.transferRequest.groupBy({
      by: ["status"],
      where: { ...base, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.transferRequest.count({ where: { ...(q ? { OR: base.OR } : {}), archivedAt: { not: null } } }),
    prisma.transferRequest.count({ where }),
    prisma.transferRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        pickupDate: true,
        passengers: true,
        quotedPrice: true,
        currency: true,
        status: true,
        createdAt: true,
        vehicle: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    }),
  ]);

  const countFor = (s: TransferRequestStatus) => byStatus.find((row) => row.status === s)?._count._all ?? 0;
  const allCount = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chipHref = (params: { status?: TransferRequestStatus; archived?: boolean }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (params.status) query.set("status", params.status);
    if (params.archived) query.set("archived", "1");
    const qs = query.toString();
    return `/en/dashboard/transfers${qs ? `?${qs}` : ""}`;
  };

  const pageHref = (p: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (archived) query.set("archived", "1");
    query.set("page", String(p));
    return `/en/dashboard/transfers?${query.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <Chip href={chipHref({})} active={!status && !archived} className="text-white">
            All {allCount}
          </Chip>
          {TRANSFER_STATUSES.map((s) => (
            <Chip key={s} href={chipHref({ status: s })} active={status === s} className={CHIP_TINTS[s]}>
              {TRANSFER_STATUS_LABELS[s]} {countFor(s)}
            </Chip>
          ))}
          <Chip href={chipHref({ archived: true })} active={archived} className="text-muted">
            Archived {archivedCount}
          </Chip>
        </div>
        <form method="get" className="relative" role="search">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {archived ? <input type="hidden" name="archived" value="1" /> : null}
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <label htmlFor="transfer-search" className="sr-only">
            Search transfer requests
          </label>
          <input
            id="transfer-search"
            name="q"
            defaultValue={q}
            placeholder="Search transfers…"
            className="h-11 w-[220px] rounded-[9px] border-[1.5px] border-line-input bg-white ps-9 pe-3 text-[13px] text-ink outline-none focus:border-accent"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.6fr_1.5fr_1.1fr_0.9fr_1fr_0.9fr_0.7fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Customer</span>
            <span>Route</span>
            <span>Vehicle</span>
            <span>Pickup</span>
            <span>Price</span>
            <span>Status</span>
            <span className="text-end">Created</span>
          </div>
          {requests.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              No transfer requests match{q ? ` “${q}”` : " this filter"}.{" "}
              <Link href="/en/dashboard/transfers" className="font-bold text-accent">
                Clear filters
              </Link>
            </p>
          ) : (
            requests.map((req) => (
              <Link
                key={req.id}
                href={`/en/dashboard/transfers/${req.id}`}
                className="grid grid-cols-[1.6fr_1.5fr_1.1fr_0.9fr_1fr_0.9fr_0.7fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-cream"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={req.fullName} muted />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{req.fullName}</span>
                    <span className="block truncate text-xs text-faint">{req.email} · {req.phone}</span>
                  </span>
                </span>
                <span className="truncate text-[13px] text-ink-soft">
                  {req.fromLocation.name} → {req.toLocation.name}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink-soft">{req.vehicle.name}</span>
                  <span className="block text-xs text-faint">{req.passengers} pax</span>
                </span>
                <span className="text-[13px] text-ink-soft">{formatDate(req.pickupDate)}</span>
                <span className="text-sm font-bold tabular-nums text-ink">
                  {req.quotedPrice !== null ? formatMoney(Number(req.quotedPrice), req.currency) : "On request"}
                </span>
                <span>
                  <TransferStatusPill status={req.status} />
                </span>
                <span className="text-end text-xs text-faint">{timeAgo(req.createdAt)}</span>
              </Link>
            ))
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
