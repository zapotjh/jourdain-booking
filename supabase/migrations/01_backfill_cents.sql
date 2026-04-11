-- 01_backfill_cents.sql
-- Ensures cents columns exist and backfills NULLs from EUR columns (or derived values).
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent where possible).

-- Add cents columns if they do not exist
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS total_price_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS balance_amount_cents integer,
  ADD COLUMN IF NOT EXISTS security_deposit_hold_cents integer;

-- Backfill total_price_cents from total_price_eur where missing
UPDATE public.bookings
SET total_price_cents = ROUND(COALESCE(total_price_eur, 0) * 100)::integer
WHERE total_price_cents IS NULL
  AND (total_price_eur IS NOT NULL AND total_price_eur > 0);

-- For rows that still have no total_price_cents and no total_price_eur, leave NULL
-- (or set a sentinel; we don't update zero/negative.)

-- Backfill deposit_amount_cents = 40% of total_price_cents where we have total_price_cents
UPDATE public.bookings
SET deposit_amount_cents = ROUND(COALESCE(total_price_cents, 0) * 0.4)::integer
WHERE deposit_amount_cents IS NULL
  AND total_price_cents IS NOT NULL
  AND total_price_cents > 0;

-- Backfill balance_amount_cents = total_price_cents - deposit_amount_cents
UPDATE public.bookings
SET balance_amount_cents = COALESCE(total_price_cents, 0) - COALESCE(deposit_amount_cents, 0)
WHERE balance_amount_cents IS NULL
  AND total_price_cents IS NOT NULL;

-- Backfill security_deposit_hold_cents = 28 EUR per night = 2800 * nights
UPDATE public.bookings
SET security_deposit_hold_cents = 2800 * GREATEST(COALESCE(nights, 0), 0)
WHERE security_deposit_hold_cents IS NULL
  AND nights IS NOT NULL;

-- Ensure currency has a default for new/updated rows (no backfill needed if column exists)
-- ALTER TABLE public.bookings ALTER COLUMN currency SET DEFAULT 'eur';
