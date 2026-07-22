"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { can, type Resource } from "@/lib/rbac/matrix";
import { ROLE_LABELS } from "@/lib/rbac/labels";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/admin/avatar";
import { NotificationsBell, type BellItem } from "@/components/admin/notifications-bell";
import { signOutAction } from "@/app/[locale]/(admin)/dashboard/actions";
import {
  IconAssignment,
  IconAudit,
  IconBlog,
  IconCategory,
  IconChart,
  IconDashboard,
  IconFaq,
  IconGuide,
  IconHome,
  IconImage,
  IconLeads,
  IconLogout,
  IconMenu,
  IconPin,
  IconQuote,
  IconSeo,
  IconSettings,
  IconStar,
  IconTours,
  IconTransfer,
  IconUsers,
  IconVehicle,
} from "@/components/admin/icons";

/**
 * Admin console frame (approved design: 244px white sidebar · 62px topbar ·
 * scrolling canvas). The sidebar derives from the RBAC matrix — one source of
 * truth — and collapses to an off-canvas drawer under lg. UI gating is
 * cosmetic only; every page and action re-checks on the server (§4).
 */

export { ROLE_LABELS };

type IconKey =
  | "dashboard"
  | "leads"
  | "transfers"
  | "settings"
  | "audit"
  | "tours"
  | "categories"
  | "destinations"
  | "testimonials"
  | "reviews"
  | "homepage"
  | "blog"
  | "faq"
  | "media"
  | "seo"
  | "guides"
  | "vehicles"
  | "assignments"
  | "analytics"
  | "users";

interface NavItem {
  label: string;
  href: string;
  resource: Resource;
  icon: IconKey;
  exact?: boolean;
  /** Sub-paths that belong to sibling items — never mark this item active there. */
  exclude?: string[];
  badge?: number;
}

const ICONS: Record<IconKey, typeof IconDashboard> = {
  dashboard: IconDashboard,
  leads: IconLeads,
  transfers: IconTransfer,
  settings: IconSettings,
  audit: IconAudit,
  tours: IconTours,
  categories: IconCategory,
  destinations: IconPin,
  testimonials: IconQuote,
  reviews: IconStar,
  homepage: IconHome,
  blog: IconBlog,
  faq: IconFaq,
  media: IconImage,
  seo: IconSeo,
  guides: IconGuide,
  vehicles: IconVehicle,
  assignments: IconAssignment,
  analytics: IconChart,
  users: IconUsers,
};

export interface ShellUser {
  id: string;
  name: string;
  role: Role;
}

export function AdminShell({
  user,
  newLeads,
  unreadCount,
  notifications,
  children,
}: {
  user: ShellUser;
  newLeads: number;
  unreadCount: number;
  notifications: BellItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allSections: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/en/dashboard", resource: "analytics", icon: "dashboard", exact: true },
        { label: "Analytics", href: "/en/dashboard/analytics", resource: "analytics", icon: "analytics" },
      ],
    },
    {
      label: "Sales",
      items: [
        { label: "Leads", href: "/en/dashboard/leads", resource: "leads", icon: "leads", badge: newLeads },
      ],
    },
    {
      label: "Transfers",
      items: [
        {
          label: "Transfer Requests",
          href: "/en/dashboard/transfers",
          resource: "transferRequests",
          icon: "transfers",
          exclude: ["/en/dashboard/transfers/vehicles", "/en/dashboard/transfers/locations", "/en/dashboard/transfers/pricing"],
        },
        { label: "Vehicles", href: "/en/dashboard/transfers/vehicles", resource: "transferConfig", icon: "vehicles" },
        { label: "Locations", href: "/en/dashboard/transfers/locations", resource: "transferConfig", icon: "destinations" },
        { label: "Pricing", href: "/en/dashboard/transfers/pricing", resource: "transferConfig", icon: "settings" },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Tours", href: "/en/dashboard/tours", resource: "tours", icon: "tours" },
        { label: "Categories", href: "/en/dashboard/categories", resource: "categories", icon: "categories" },
        { label: "Destinations", href: "/en/dashboard/destinations", resource: "destinations", icon: "destinations" },
        { label: "Testimonials", href: "/en/dashboard/testimonials", resource: "testimonials", icon: "testimonials" },
        { label: "Reviews", href: "/en/dashboard/reviews", resource: "reviews", icon: "reviews" },
        { label: "Homepage", href: "/en/dashboard/homepage", resource: "homepage", icon: "homepage" },
        { label: "Hero Banners", href: "/en/dashboard/hero-banners", resource: "heroBanners", icon: "homepage" },
        { label: "Blog", href: "/en/dashboard/blog", resource: "blog", icon: "blog" },
        { label: "FAQ", href: "/en/dashboard/faq", resource: "faqs", icon: "faq" },
        { label: "Media", href: "/en/dashboard/media", resource: "media", icon: "media" },
        { label: "SEO", href: "/en/dashboard/seo", resource: "seo", icon: "seo" },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Guides", href: "/en/dashboard/guides", resource: "guides", icon: "guides" },
        { label: "Vehicles", href: "/en/dashboard/vehicles", resource: "vehicles", icon: "vehicles" },
        { label: "Assignments", href: "/en/dashboard/assignments", resource: "assignments", icon: "assignments" },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Users", href: "/en/dashboard/users", resource: "users", icon: "users" },
        { label: "Settings", href: "/en/dashboard/settings", resource: "settings", icon: "settings" },
        { label: "Audit Log", href: "/en/dashboard/audit", resource: "auditLogs", icon: "audit" },
      ],
    },
  ];
  const sections = allSections
    .map((s) => ({ ...s, items: s.items.filter((i) => can(user.role, i.resource, "view")) }))
    .filter((s) => s.items.length > 0);

  const sidebar = (
    <div className="flex h-full w-[244px] flex-col border-e border-line bg-white">
      <div className="border-b border-line-soft px-5 pb-4 pt-[18px]">
        <Image src="/brand/aic-logo.png" alt="AIC Travel" width={96} height={26} className="h-[26px] w-auto" />
        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
          Management Console
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-3" aria-label="Admin">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-faint">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && !item.exclude?.some((p) => pathname.startsWith(p));
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm font-semibold text-ink",
                    active ? "bg-surface-2" : "hover:bg-cream",
                  )}
                >
                  <Icon className="text-ink-soft" />
                  {item.label}
                  {item.badge ? (
                    <span className="ms-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2.5 border-t border-line-soft p-3">
        <Avatar name={user.name} seed={user.id} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-ink">{user.name}</div>
          <div className="text-[11px] font-bold text-accent">{ROLE_LABELS[user.role]}</div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[9px] text-muted hover:bg-cream hover:text-ink"
          >
            <IconLogout />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-cream text-ink">
      <aside className="hidden flex-shrink-0 lg:block">{sidebar}</aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="relative z-10 h-full shadow-pop">{sidebar}</div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[62px] flex-shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[9px] border-[1.5px] border-line-input text-ink-soft lg:hidden"
          >
            <IconMenu />
          </button>
          <h1 className="truncate text-lg font-extrabold text-ink">{pageTitle(pathname)}</h1>
          <div className="ms-auto flex items-center gap-3">
            <NotificationsBell unreadCount={unreadCount} items={notifications} />
            <Avatar name={user.name} seed={user.id} size={34} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 pb-16 pt-6 sm:px-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

function pageTitle(pathname: string): string {
  if (pathname.endsWith("/dashboard/leads/new")) return "New lead";
  if (/^\/en\/dashboard\/leads\/.+/.test(pathname)) return "Lead details";
  if (pathname.startsWith("/en/dashboard/leads")) return "Leads";
  if (pathname.startsWith("/en/dashboard/transfers/vehicles")) return "Transfer vehicles";
  if (pathname.startsWith("/en/dashboard/transfers/locations")) return "Transfer locations";
  if (pathname.startsWith("/en/dashboard/transfers/pricing")) return "Transfer pricing";
  if (/^\/en\/dashboard\/transfers\/.+/.test(pathname)) return "Transfer request";
  if (pathname.startsWith("/en/dashboard/transfers")) return "Transfer requests";
  if (pathname.startsWith("/en/dashboard/tours")) return "Tours";
  if (pathname.startsWith("/en/dashboard/categories")) return "Categories";
  if (pathname.startsWith("/en/dashboard/destinations")) return "Destinations";
  if (pathname.startsWith("/en/dashboard/testimonials")) return "Testimonials";
  if (pathname.startsWith("/en/dashboard/reviews")) return "Reviews";
  if (pathname.startsWith("/en/dashboard/homepage")) return "Homepage";
  if (pathname.startsWith("/en/dashboard/hero-banners")) return "Hero banners";
  if (pathname.startsWith("/en/dashboard/blog")) return "Blog";
  if (pathname.startsWith("/en/dashboard/faq")) return "FAQ";
  if (pathname.startsWith("/en/dashboard/media")) return "Media library";
  if (pathname.startsWith("/en/dashboard/seo")) return "SEO";
  if (/^\/en\/dashboard\/assignments\/.+/.test(pathname)) return "Manage assignment";
  if (pathname.startsWith("/en/dashboard/guides")) return "Guides";
  if (pathname.startsWith("/en/dashboard/vehicles")) return "Vehicles";
  if (pathname.startsWith("/en/dashboard/assignments")) return "Assignments";
  if (pathname.startsWith("/en/dashboard/analytics")) return "Analytics";
  if (pathname.endsWith("/dashboard/users/new")) return "New user";
  if (/^\/en\/dashboard\/users\/.+/.test(pathname)) return "Edit user";
  if (pathname.startsWith("/en/dashboard/users")) return "Users";
  if (pathname.startsWith("/en/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/en/dashboard/notifications")) return "Notifications";
  if (pathname.startsWith("/en/dashboard/audit")) return "Audit log";
  return "Dashboard";
}
