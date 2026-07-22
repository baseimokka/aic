import { z } from "zod";
import { currencySchema } from "@/lib/validation/lead";

/** Settings + assignment-rule mutations (Super Admin, Addendum §2/§5). */

export const RULE_FIELDS = ["country", "language", "tour", "estValue"] as const;
export const RULE_OPERATORS = ["in", "eq", "contains", "gte"] as const;

export const assignmentRuleSchema = z
  .object({
    name: z.string().trim().min(2, "Name the rule.").max(80),
    field: z.enum(RULE_FIELDS),
    operator: z.enum(RULE_OPERATORS),
    value: z.string().trim().min(1, "Add a value to match.").max(300),
    assigneeId: z.string().min(1, "Pick who receives these leads."),
    enabled: z.boolean(),
  })
  .refine((r) => (r.field === "estValue" ? r.operator === "gte" : r.operator !== "gte"), {
    message: "Estimated value uses ≥; text fields use in / equals / contains.",
    path: ["operator"],
  });
export type AssignmentRuleInput = z.infer<typeof assignmentRuleSchema>;

export const settingsSchema = z
  .object({
    defaultCurrency: currencySchema,
    currencies: z
      .array(currencySchema)
      .min(1, "Keep at least one currency.")
      .max(30, "That's more currencies than the console can offer.")
      .transform((codes) => [...new Set(codes)]),
    allowPerLeadCurrencyOverride: z.boolean(),
    fallbackAssigneeId: z.string().min(1).nullable(),
  })
  .refine((s) => s.currencies.includes(s.defaultCurrency), {
    message: "The default currency must be in the currency list.",
    path: ["defaultCurrency"],
  });
export type SettingsInput = z.input<typeof settingsSchema>;
