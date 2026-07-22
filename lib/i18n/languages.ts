/**
 * Localized display names for ISO 639-1 language codes (e.g. tour guide
 * languages). Names come from Intl.DisplayNames so every supported locale —
 * including future ones — renders correctly with no manual translation.
 */
export function languageNames(codes: readonly string[], locale: string): string[] {
  let names: Intl.DisplayNames | undefined;
  try {
    names = new Intl.DisplayNames([locale], { type: "language" });
  } catch {
    // Unknown locale tag — fall through to raw codes.
  }
  return codes.map((code) => {
    const name = names?.of(code) ?? code;
    // Several locales lowercase language names (de → "deutsch"); capitalize for display.
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  });
}
