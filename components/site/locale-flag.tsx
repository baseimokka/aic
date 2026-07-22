import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Inline SVG flags for the locale switcher (mirrors `localeFlags` emoji in
 * /lib/i18n/config). Emoji flags render as bare letter codes on Windows, so we
 * ship tiny self-contained SVGs instead — no external assets, crisp at 20px.
 */
const FLAGS: Record<Locale, { viewBox: string; content: React.ReactNode }> = {
  // United Kingdom — simplified Union Jack (no diagonal offset; fine at icon size).
  en: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#012169" d="M0 0h60v40H0z" />
        <path stroke="#fff" strokeWidth={7} d="M0 0l60 40m0-40L0 40" />
        <path stroke="#C8102E" strokeWidth={3} d="M0 0l60 40m0-40L0 40" />
        <path stroke="#fff" strokeWidth={13} d="M30 0v40M0 20h60" />
        <path stroke="#C8102E" strokeWidth={7.5} d="M30 0v40M0 20h60" />
      </>
    ),
  },
  // Saudi Arabia — green field; shahada abstracted to a script line above the sword.
  ar: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#006C35" d="M0 0h60v40H0z" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
          d="M11 14c3 3.5 6-3.5 9.5 0s6-3.5 9.5 0 6-3.5 9.5 0 6-3.5 9.5 0"
        />
        <path stroke="#fff" strokeWidth={3.5} strokeLinecap="round" d="M13 27.5h30" />
        <path stroke="#fff" strokeWidth={5.5} strokeLinecap="round" d="M45.5 27.5h1.5" />
      </>
    ),
  },
  de: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#000" d="M0 0h60v13.33H0z" />
        <path fill="#DD0000" d="M0 13.33h60v13.34H0z" />
        <path fill="#FFCE00" d="M0 26.67h60v13.33H0z" />
      </>
    ),
  },
  ru: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#fff" d="M0 0h60v13.33H0z" />
        <path fill="#0039A6" d="M0 13.33h60v13.34H0z" />
        <path fill="#D52B1E" d="M0 26.67h60v13.33H0z" />
      </>
    ),
  },
  tr: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#E30A17" d="M0 0h60v40H0z" />
        <circle cx={21} cy={20} r={8.5} fill="#fff" />
        <circle cx={23.3} cy={20} r={6.8} fill="#E30A17" />
        <polygon
          fill="#fff"
          points="29.8,20 32.64,19.01 32.7,16.01 34.52,18.4 37.4,17.53 35.68,20 37.4,22.47 34.52,21.6 32.7,23.99 32.64,20.99"
        />
      </>
    ),
  },
  fr: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#0055A4" d="M0 0h20v40H0z" />
        <path fill="#fff" d="M20 0h20v40H20z" />
        <path fill="#EF4135" d="M40 0h20v40H40z" />
      </>
    ),
  },
  it: {
    viewBox: "0 0 60 40",
    content: (
      <>
        <path fill="#009246" d="M0 0h20v40H0z" />
        <path fill="#fff" d="M20 0h20v40H20z" />
        <path fill="#CE2B37" d="M40 0h20v40H40z" />
      </>
    ),
  },
};

/** Decorative flag chip (3:2) — always paired with the language name, so aria-hidden. */
export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  const flag = FLAGS[locale];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[3px] ring-1 ring-inset ring-ink/10",
        className,
      )}
    >
      <svg viewBox={flag.viewBox} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {flag.content}
      </svg>
    </span>
  );
}
