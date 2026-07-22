import Link from "next/link";
import { localeFlags, translationTabOrder } from "@/lib/i18n/config";

/**
 * Compact translation indicator for admin LIST pages: a flag + ✓/○ per locale,
 * in the standard tab order. English is the source and always counts as done.
 * The whole cell links to the entity's translation editor.
 */
export function TranslationColumn({
  locales,
  href,
}: {
  locales: ReadonlySet<string>;
  href: string;
}) {
  const done = translationTabOrder.filter((l) => l === "en" || locales.has(l)).length;
  return (
    <Link
      href={`${href}#translations`}
      title={`${done}/${translationTabOrder.length} languages · edit translations`}
      className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg px-1 py-1 text-[11px] hover:bg-cream"
    >
      {translationTabOrder.map((l) => {
        const isDone = l === "en" || locales.has(l);
        return (
          <span key={l} className="inline-flex items-center gap-0.5">
            <span aria-hidden>{localeFlags[l]}</span>
            <span className={isDone ? "font-bold text-success-deep" : "text-faint"}>{isDone ? "✓" : "○"}</span>
          </span>
        );
      })}
    </Link>
  );
}
