import Link from "next/link";
import type { ReactNode } from "react";
import { IconPlus } from "@/components/admin/icons";

/**
 * Standard content-page header: title + optional description on the start side,
 * an optional primary action (usually a "New …" link) on the end side.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Accent "create" link used in page headers. */
export function CreateLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[13px] font-bold text-white hover:bg-accent-deep"
    >
      <IconPlus width={16} height={16} />
      {label}
    </Link>
  );
}

/** Empty-state row for list tables. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-12 text-center text-sm text-muted">{children}</p>;
}
