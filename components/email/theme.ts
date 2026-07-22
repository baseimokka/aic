/**
 * Shared design tokens for AIC Travel transactional emails.
 *
 * Email clients don't share the site's Tailwind tokens or web fonts, so the
 * brand is restated here as plain values and web-safe font stacks. Colours are
 * the approved AIC palette (navy + sunset orange + gold) blended with the
 * neutral surface scale requested for this email (soft grey ground, white
 * cards, hairline borders). One source of truth for every email component.
 */
export const email = {
  color: {
    // brand
    navy: "#201146", // primary brand ink (AIC logo navy)
    navySoft: "#3F3A55", // body copy on light
    accent: "#F0602F", // primary CTA (sunset orange)
    accentDeep: "#D94E20", // CTA hover / pressed
    gold: "#F5A623", // eyebrows / accents on navy
    // status
    success: "#22C55E",
    successSoft: "#DCFCE7",
    successRing: "#BBF7D0",
    // neutrals (this email's requested surface scale)
    ground: "#F5F7FA", // page background
    card: "#FFFFFF", // cards
    tint: "#F1F2F6", // subtle inset panels / row header
    tintNavy: "#F0EFF5", // indigo-tinted panel (trust section)
    border: "#E5E7EB", // card + row borders
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textFaint: "#9CA3AF",
    white: "#FFFFFF",
    onNavy: "rgba(255,255,255,0.92)",
    onNavySoft: "rgba(255,255,255,0.62)",
    onNavyFaint: "rgba(255,255,255,0.42)",
  },
  font: {
    // Georgia is the most widely-supported premium serif — stands in for the
    // brand's Newsreader in clients that can't load web fonts.
    serif: "Georgia, 'Newsreader', 'Times New Roman', Times, serif",
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  /** Content column width (px). Spec: a centred card around 600–650px. */
  width: 600,
  radius: {
    card: 16,
    button: 12,
    chip: 999,
  },
} as const;

/** Absolute site origin — email links & images must be absolute, never relative. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Company contact details surfaced in the footer (mirrors the site footer). */
export const company = {
  name: "AIC Travel",
  tagline: "Discover More. Travel Better.",
  partner: "In partnership with SoHolidays",
  phoneDisplay: "+20 122 141 6299",
  phoneE164: "+201221416299",
  whatsapp: "https://wa.me/201221416299",
  email: "info@aic-travel.com",
  websiteDisplay: "aic-travel.com",
  social: {
    instagram: "https://instagram.com/aic_travel",
    facebook: "https://facebook.com/AICTravelEgypt",
  },
} as const;
