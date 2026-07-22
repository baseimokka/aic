import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, AuditActionType } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDateTime } from "@/lib/utils";
import { NoAccess } from "@/components/admin/no-access";
import { AuditActionPill } from "@/components/admin/pills";
import { IconSearch } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

const ACTION_TYPES: Array<{ value: AuditActionType; label: string }> = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Archive" },
  { value: "STATUS_CHANGE", label: "Status change" },
  { value: "ASSIGNMENT_CHANGE", label: "Assignment" },
];

function isActionType(v: string): v is AuditActionType {
  return ACTION_TYPES.some((a) => a.value === v);
}

/** Parse a "YYYY-MM-DD" input into a Date, or undefined when absent/invalid. */
function parseDay(v: string | undefined): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    actor?: string;
    action?: string;
    resource?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "auditLogs", "view")) return <NoAccess />;

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim();
  const actorId = (sp.actor ?? "").trim();
  const action = sp.action && isActionType(sp.action) ? sp.action : undefined;
  const resource = (sp.resource ?? "").trim();
  const from = parseDay(sp.from);
  const to = parseDay(sp.to);

  const where: Prisma.AuditLogWhereInput = {};
  if (actorId) where.actorId = actorId;
  if (action) where.actionType = action;
  if (resource) where.resourceType = resource;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      // "to" is inclusive of the whole selected day.
      ...(to ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { resourceType: { contains: q, mode: "insensitive" } },
      { resourceId: { contains: q, mode: "insensitive" } },
      { metadata: { path: ["summary"], string_contains: q } },
    ];
  }

  const [total, entries, resourceTypes, actorRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        actionType: true,
        resourceType: true,
        resourceId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.findMany({ distinct: ["resourceType"], select: { resourceType: true }, orderBy: { resourceType: "asc" } }),
    prisma.auditLog.findMany({
      distinct: ["actorId"],
      where: { actorId: { not: null } },
      select: { actorId: true, actor: { select: { name: true, email: true } } },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const actors = actorRows
    .flatMap((r) => (r.actorId ? [{ id: r.actorId, label: r.actor?.name ?? r.actor?.email ?? r.actorId }] : []))
    .sort((a, b) => a.label.localeCompare(b.label));

  const hasFilters = Boolean(q || actorId || action || resource || sp.from || sp.to);

  const pageHref = (p: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (actorId) query.set("actor", actorId);
    if (action) query.set("action", action);
    if (resource) query.set("resource", resource);
    if (sp.from) query.set("from", sp.from);
    if (sp.to) query.set("to", sp.to);
    query.set("page", String(p));
    return `/en/dashboard/audit?${query.toString()}`;
  };

  const selectCls =
    "h-11 rounded-[9px] border-[1.5px] border-line-input bg-white px-3 text-[13px] font-semibold text-ink outline-none focus:border-accent";
  const filterLabelCls = "mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted";

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Every create, update, archive, status change and assignment (§13). Reads, views and
        searches are never logged.
      </p>

      <form method="get" className="mb-4 rounded-xl border border-line bg-white px-4 py-3.5 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="audit-actor" className={filterLabelCls}>
              User
            </label>
            <select id="audit-actor" name="actor" defaultValue={actorId} className={selectCls}>
              <option value="">All users</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-action" className={filterLabelCls}>
              Action
            </label>
            <select id="audit-action" name="action" defaultValue={action ?? ""} className={selectCls}>
              <option value="">All actions</option>
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-resource" className={filterLabelCls}>
              Resource
            </label>
            <select id="audit-resource" name="resource" defaultValue={resource} className={selectCls}>
              <option value="">All resources</option>
              {resourceTypes.map((r) => (
                <option key={r.resourceType} value={r.resourceType}>
                  {r.resourceType}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-from" className={filterLabelCls}>
              From
            </label>
            <input id="audit-from" name="from" type="date" defaultValue={sp.from ?? ""} className={selectCls} />
          </div>
          <div>
            <label htmlFor="audit-to" className={filterLabelCls}>
              To
            </label>
            <input id="audit-to" name="to" type="date" defaultValue={sp.to ?? ""} className={selectCls} />
          </div>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="audit-q" className={filterLabelCls}>
              Search
            </label>
            <div className="relative">
              <IconSearch
                width={16}
                height={16}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                id="audit-q"
                name="q"
                defaultValue={q}
                placeholder="Search entries…"
                className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white ps-9 pe-3 text-[13px] text-ink outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link href="/en/dashboard/audit" className="text-[13px] font-bold text-accent hover:text-accent-deep">
                Clear
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.1fr_1fr_2fr_1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>User</span>
            <span>Action</span>
            <span>Resource</span>
            <span className="text-end">Date &amp; time</span>
          </div>
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              {hasFilters ? (
                <>
                  No entries match these filters.{" "}
                  <Link href="/en/dashboard/audit" className="font-bold text-accent">
                    Clear filters
                  </Link>
                </>
              ) : (
                "No administrative activity yet."
              )}
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1.1fr_1fr_2fr_1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
              >
                <span className="truncate text-[13px] font-semibold text-ink">
                  {entry.actor?.name ?? entry.actor?.email ?? "System"}
                </span>
                <span>
                  <AuditActionPill action={entry.actionType} />
                </span>
                <span className="truncate text-[13px] text-ink-soft" title={`${entry.resourceType} · ${entry.resourceId}`}>
                  {summaryOf(entry.metadata) ?? `${entry.resourceType} · ${entry.resourceId}`}
                </span>
                <span className="text-end text-[13px] tabular-nums text-faint">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
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
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3.5 font-semibold text-ink hover:bg-cream"
              >
                Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
                className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3.5 font-semibold text-ink hover:bg-cream"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function summaryOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "summary" in metadata) {
    const summary = (metadata as { summary?: unknown }).summary;
    if (typeof summary === "string" && summary) return summary;
  }
  return null;
}
