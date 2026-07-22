import { prisma } from "@/lib/db/client";

export const DEFAULT_CURRENCIES = ["USD", "EUR", "GBP"] as const;

export interface CurrencySettings {
  /** Codes offered across the console (Settings page, Super Admin). */
  currencies: string[];
  /** The default code for new records; always a member of `currencies`. */
  defaultCurrency: string;
}

/**
 * The currency codes offered across the console — managed by Super Admins on
 * the Settings page (Settings.currencies). Falls back to the classic trio when
 * the settings row doesn't exist yet. One helper so every currency dropdown
 * reads the same list.
 */
export async function getCurrencySettings(): Promise<CurrencySettings> {
  const settings = await prisma.settings.findFirst({ select: { currencies: true, defaultCurrency: true } });
  const currencies = settings?.currencies?.length ? settings.currencies : [...DEFAULT_CURRENCIES];
  const stored = settings?.defaultCurrency;
  return { currencies, defaultCurrency: stored && currencies.includes(stored) ? stored : currencies[0] };
}

export async function getOfferedCurrencies(): Promise<string[]> {
  return (await getCurrencySettings()).currencies;
}
