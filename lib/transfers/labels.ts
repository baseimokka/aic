import type { TransferRequestStatus } from "@prisma/client";

/** Human labels shared by pills, selects, audit summaries and notifications. */
export const TRANSFER_STATUS_LABELS: Record<TransferRequestStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const TRANSFER_STATUSES = Object.keys(TRANSFER_STATUS_LABELS) as TransferRequestStatus[];
