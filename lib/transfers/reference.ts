/**
 * Human-friendly transfer reference shown to the customer and in notifications,
 * derived from the request id so staff can recover the record from a reference
 * without storing an extra column (mirrors `leadReference`).
 */
export function transferReference(requestId: string, createdAt: Date): string {
  return `TRF-${createdAt.getFullYear()}-${requestId.slice(-6).toUpperCase()}`;
}
