import {
  IconCheck,
  IconClock,
  IconLeads,
  IconNote,
  IconSparkle,
} from "@/components/admin/icons";

/** Icon tile per notification event — shared by the topbar bell and the full page. */
export function eventTile(event: string): { icon: React.ReactNode; className: string } {
  switch (event) {
    case "new_lead":
      return { icon: <IconLeads width={17} height={17} />, className: "bg-accent-soft text-accent-deep" };
    case "status_changed":
      return { icon: <IconClock width={17} height={17} />, className: "bg-[#eaf1f9] text-info" };
    case "reassigned":
      return { icon: <IconLeads width={17} height={17} />, className: "bg-teal-soft text-teal" };
    case "paid_in_full":
      return { icon: <IconCheck width={17} height={17} />, className: "bg-[#e4f3eb] text-success-deep" };
    case "comment":
      return { icon: <IconNote width={17} height={17} />, className: "bg-purple-soft text-purple" };
    default: // future events
      return { icon: <IconSparkle width={17} height={17} />, className: "bg-purple-soft text-purple" };
  }
}
