"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/admin/action";
import { IconArchive, IconRestore } from "@/components/admin/icons";

/**
 * The single destructive pattern across the whole console (Addendum §6): a
 * restorable archive with one confirm dialog, warning-gold (never red).
 * Generalized from the P3 lead controls so every content type reuses it —
 * pass the entity's archive/restore server actions and a label.
 */
export function ArchiveDialog({
  id,
  archived,
  name,
  entityLabel,
  archiveAction,
  restoreAction,
  redirectTo,
  size = "default",
}: {
  id: string;
  archived: boolean;
  name: string;
  entityLabel: string; // e.g. "tour", "category"
  archiveAction: (id: string) => Promise<ActionResult>;
  restoreAction: (id: string) => Promise<ActionResult>;
  redirectTo?: string; // navigate here after a successful archive (e.g. list page)
  size?: "default" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function run(action: (id: string) => Promise<ActionResult>, close: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (close) setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  const compact = size === "compact";

  if (archived) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(restoreAction, false)}
          className={`inline-flex items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-input bg-white font-bold text-ink hover:bg-cream disabled:opacity-60 ${compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-[13px]"}`}
        >
          <IconRestore width={15} height={15} />
          {pending ? "Restoring…" : "Restore"}
        </button>
        {error ? <span className="text-xs font-semibold text-danger">{error}</span> : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-[9px] border-[1.5px] border-[#f0deb0] bg-white font-bold text-[#9a5a00] hover:bg-warning-soft ${compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-[13px]"}`}
      >
        <IconArchive width={15} height={15} />
        Archive
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label="Cancel" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-title"
            className="shadow-pop relative z-10 w-full max-w-[400px] rounded-2xl border border-line bg-white p-6"
          >
            <span className="mb-3.5 inline-flex h-11 w-11 items-center justify-center rounded-[11px] bg-warning-soft text-[#9a5a00]">
              <IconArchive width={22} height={22} />
            </span>
            <h3 id="archive-title" className="mb-2 text-lg font-extrabold text-ink">
              Archive this {entityLabel}?
            </h3>
            <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
              &ldquo;{name}&rdquo; will be hidden from the site and the dashboard lists. It stays in
              records and can be restored anytime.{" "}
              <strong className="text-ink">Nothing is permanently deleted.</strong>
            </p>
            {error ? <p className="mb-3 text-xs font-semibold text-danger">{error}</p> : null}
            <div className="flex gap-2.5">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="h-12 flex-1 rounded-[10px] border-[1.5px] border-line-input bg-white text-sm font-bold text-ink-soft hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(archiveAction, true)}
                className="h-12 flex-1 rounded-[10px] bg-[#9a5a00] text-sm font-bold text-white hover:brightness-95 disabled:opacity-60"
              >
                {pending ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
