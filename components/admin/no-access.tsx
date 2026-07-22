import Link from "next/link";

/** Rendered when a signed-in role opens a module its matrix row doesn't include. */
export function NoAccess() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Restricted</p>
      <h2 className="mt-2 font-serif text-2xl font-medium text-ink">No access to this module</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Your role doesn&rsquo;t include this area. If you think it should, ask a Super Admin to
        adjust your account.
      </p>
      <Link
        href="/en/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-ink px-6 text-sm font-bold text-white hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
