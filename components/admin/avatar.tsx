/** Initials avatar — deterministic brand-tint per person (design table rows). */

const TINTS = ["#201146", "#0e7a72", "#6c4ba6", "#c98a16", "#2f6db0", "#c0511f"];

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function Avatar({
  name,
  seed,
  size = 32,
  muted = false,
}: {
  name: string | null | undefined;
  /** Stable colour key (user id); falls back to the name. */
  seed?: string;
  size?: number;
  /** Soft look for customers (vs. solid staff tints). */
  muted?: boolean;
}) {
  const label = initials(name);
  return (
    <span
      aria-hidden
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        background: muted ? "#f0eff5" : tintFor(seed ?? name ?? "?"),
        color: muted ? "#201146" : "#ffffff",
      }}
    >
      {label}
    </span>
  );
}
