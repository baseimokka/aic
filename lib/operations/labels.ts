import type { GuideAvailability, VehicleStatus } from "@prisma/client";

/** Human labels for the Operations enums — shared by pills, selects and audit summaries (Phase 6). */
export const GUIDE_AVAILABILITY_LABELS: Record<GuideAvailability, string> = {
  AVAILABLE: "Available",
  BUSY: "Busy",
  UNAVAILABLE: "Unavailable",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};

export const GUIDE_AVAILABILITIES = Object.keys(GUIDE_AVAILABILITY_LABELS) as GuideAvailability[];
export const VEHICLE_STATUSES = Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[];
