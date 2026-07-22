import Link from "next/link";

/** Pill filter tab used on content list pages (Active / Archived, etc.). */
export function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-[38px] items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
        active ? "border-ink bg-ink text-white" : "border-line-input bg-white text-ink-soft hover:bg-cream"
      }`}
    >
      {label}
    </Link>
  );
}
