"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Nav link with the design's active treatment: orange text + a 2px underline. */
export function NavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative py-1 text-sm transition-colors",
        active ? "font-semibold text-accent" : "font-medium text-ink hover:text-accent-deep",
      )}
    >
      {label}
      {active && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded bg-accent" />}
    </Link>
  );
}
