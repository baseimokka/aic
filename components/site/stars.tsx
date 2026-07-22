import { cn } from "@/lib/utils";

/**
 * Star rating row (presentational, no hooks — renders in server and client
 * components). Supports fractional values for averages: a gold overlay row is
 * clipped to `value / 5` over a muted base row. Anchored with logical
 * properties so the fill direction mirrors correctly under RTL (§10).
 */
export function Stars({
  value,
  size = 15,
  label,
  className,
}: {
  /** 0–5, fractions allowed (e.g. 4.6). */
  value: number;
  size?: number;
  /** Accessible description, e.g. "4.6 out of 5". */
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill: string) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} fill={fill} aria-hidden>
          <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
        </svg>
      ))}
    </div>
  );
  return (
    <div className={cn("relative inline-block", className)} role="img" aria-label={label}>
      {row("var(--color-line-input, #E3DFD5)")}
      <div className="absolute bottom-0 top-0 start-0 overflow-hidden" style={{ width: `${pct}%` }} aria-hidden>
        {row("#F5A623")}
      </div>
    </div>
  );
}
