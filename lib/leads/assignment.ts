import { prisma } from "@/lib/db/client";
import { logAudit } from "@/lib/audit/log";

/**
 * Lead auto-routing (Gap Closure Addendum §2). Enabled rules evaluate
 * top-down by `order`; the first match assigns the lead. If none match,
 * the Settings fallback assignee applies. Manual reassignment on the lead
 * always overrides — this engine only runs at lead creation.
 *
 * Rule fields: country · language (submission locale) · tour · estValue.
 * String operators: in (comma-separated list) · eq · contains — all
 * case-insensitive against admin-authored values. estValue uses gte.
 */
export interface LeadRoutingFacts {
  country: string;
  locale: string;
  tourTitle?: string | null;
  tourSlug?: string | null;
  /** Rough trip value (base price × travellers) for estValue rules. */
  estValue?: number | null;
}

export interface AutoAssignment {
  userId: string;
  /** null when the fallback assignee applied. */
  ruleName: string | null;
}

export async function resolveAutoAssignee(facts: LeadRoutingFacts): Promise<AutoAssignment | null> {
  const rules = await prisma.assignmentRule.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    include: { assignee: { select: { archivedAt: true } } },
  });

  for (const rule of rules) {
    if (rule.assignee.archivedAt) continue;
    if (ruleMatches(rule.field, rule.operator, rule.value, facts)) {
      return { userId: rule.assigneeId, ruleName: rule.name };
    }
  }

  const settings = await prisma.settings.findFirst({
    select: { fallbackAssigneeId: true, fallbackAssignee: { select: { archivedAt: true } } },
  });
  if (settings?.fallbackAssigneeId && !settings.fallbackAssignee?.archivedAt) {
    return { userId: settings.fallbackAssigneeId, ruleName: null };
  }
  return null;
}

/**
 * Assign a fresh lead and write the ASSIGNMENT_CHANGE audit row (actor null =
 * system). Best-effort: routing must never fail the public submission.
 */
export async function autoAssignLead(
  leadId: string,
  facts: LeadRoutingFacts,
): Promise<AutoAssignment | null> {
  try {
    const assignment = await resolveAutoAssignee(facts);
    if (!assignment) return null;

    await prisma.lead.update({ where: { id: leadId }, data: { assignedStaffId: assignment.userId } });
    await logAudit({
      actorId: null,
      actionType: "ASSIGNMENT_CHANGE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: {
        auto: true,
        assigneeId: assignment.userId,
        summary: assignment.ruleName
          ? `Auto-assigned by rule “${assignment.ruleName}”`
          : "Auto-assigned to the fallback assignee",
      },
    });
    return assignment;
  } catch (err) {
    console.error("[assignment] auto-routing failed:", err);
    return null;
  }
}

function ruleMatches(
  field: string,
  operator: string,
  value: string,
  facts: LeadRoutingFacts,
): boolean {
  if (field === "estValue") {
    const threshold = Number(value.replace(/[^0-9.]/g, ""));
    return (
      operator === "gte" &&
      Number.isFinite(threshold) &&
      facts.estValue != null &&
      facts.estValue >= threshold
    );
  }

  const subject =
    field === "country"
      ? facts.country
      : field === "language"
        ? facts.locale
        : field === "tour"
          ? `${facts.tourTitle ?? ""} ${facts.tourSlug ?? ""}`
          : null;
  if (subject === null) return false;

  const s = subject.trim().toLowerCase();
  switch (operator) {
    case "in":
      return value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .includes(s);
    case "eq":
      return s === value.trim().toLowerCase();
    case "contains":
      return value.trim() !== "" && s.includes(value.trim().toLowerCase());
    default:
      return false;
  }
}
