import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { SettingsGeneral } from "@/components/admin/settings-general";
import { AssignmentRules } from "@/components/admin/assignment-rules";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const actor = await requireActor();
  if (!can(actor.role, "settings", "view")) return <NoAccess />;

  const [settings, staff, rules] = await Promise.all([
    prisma.settings.findFirst({
      select: {
        defaultCurrency: true,
        currencies: true,
        allowPerLeadCurrencyOverride: true,
        fallbackAssigneeId: true,
        fallbackAssignee: { select: { name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "SALES_ADMIN"] }, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.assignmentRule.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        field: true,
        operator: true,
        value: true,
        enabled: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const staffOptions = staff.map((s) => ({ id: s.id, name: s.name ?? s.email }));

  return (
    <div className="flex max-w-[980px] flex-col gap-4">
      <p className="text-sm text-muted">
        Global defaults and lead auto-routing. Rules run top-down when a lead arrives; the first
        match assigns it, otherwise the fallback applies. Manual reassignment always overrides.
      </p>

      <SettingsGeneral
        staff={staffOptions}
        initial={{
          defaultCurrency: settings?.defaultCurrency ?? "USD",
          currencies: settings?.currencies?.length ? settings.currencies : ["USD", "EUR", "GBP"],
          allowPerLeadCurrencyOverride: settings?.allowPerLeadCurrencyOverride ?? true,
          fallbackAssigneeId: settings?.fallbackAssigneeId ?? null,
        }}
      />

      <AssignmentRules
        staff={staffOptions}
        fallbackName={settings?.fallbackAssignee ? (settings.fallbackAssignee.name ?? settings.fallbackAssignee.email) : null}
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          field: r.field,
          operator: r.operator,
          value: r.value,
          enabled: r.enabled,
          assignee: { id: r.assignee.id, name: r.assignee.name ?? r.assignee.email },
        }))}
      />
    </div>
  );
}
