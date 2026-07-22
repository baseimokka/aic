/**
 * Human-friendly lead reference shown to the customer and in notifications,
 * derived from the lead id so staff can recover the record from a reference
 * without storing an extra column.
 */
export function leadReference(leadId: string, createdAt: Date): string {
  return `AIC-${createdAt.getFullYear()}-${leadId.slice(-6).toUpperCase()}`;
}
