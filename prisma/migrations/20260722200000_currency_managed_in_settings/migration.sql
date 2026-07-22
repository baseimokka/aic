-- Currencies become data instead of a schema enum, so Super Admins can add new
-- ones from the Settings page. Existing values are preserved via ::text casts.

-- Tour.currency: enum -> TEXT
ALTER TABLE "Tour" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Tour" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
ALTER TABLE "Tour" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- Lead.currency: enum -> TEXT
ALTER TABLE "Lead" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
ALTER TABLE "Lead" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- Settings.defaultCurrency: enum -> TEXT
ALTER TABLE "Settings" ALTER COLUMN "defaultCurrency" DROP DEFAULT;
ALTER TABLE "Settings" ALTER COLUMN "defaultCurrency" TYPE TEXT USING "defaultCurrency"::text;
ALTER TABLE "Settings" ALTER COLUMN "defaultCurrency" SET DEFAULT 'USD';

-- The offered currency set now lives in Settings.
ALTER TABLE "Settings" ADD COLUMN "currencies" TEXT[] NOT NULL DEFAULT ARRAY['USD', 'EUR', 'GBP']::TEXT[];

-- The enum is no longer referenced anywhere.
DROP TYPE "Currency";
