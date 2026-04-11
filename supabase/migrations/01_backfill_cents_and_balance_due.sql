-- 01_backfill_cents_and_balance_due.sql
-- Canonical: cents columns, stripe_session_id, long_stay, balance_due_at.
-- Deprecated (do not use in app): total_price_eur, deposit_amount_eur, stripe_checkout_session_id.
-- Safe to run multiple times. Does not drop any columns.

-- Add canonical cents columns if missing
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS total_price_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS balance_amount_cents integer,
  ADD COLUMN IF NOT EXISTS security_deposit_hold_cents integer;

-- Backfill total_price_cents from deprecated total_price_eur
UPDATE public.bookings
SET total_price_cents = ROUND(COALESCE(total_price_eur, 0) * 100)::integer
WHERE total_price_cents IS NULL
  AND (total_price_eur IS NOT NULL AND total_price_eur > 0);

UPDATE public.bookings
SET deposit_amount_cents = ROUND(COALESCE(total_price_cents, 0) * 0.4)::integer
WHERE deposit_amount_cents IS NULL
  AND total_price_cents IS NOT NULL
  AND total_price_cents > 0;

UPDATE public.bookings
SET balance_amount_cents = COALESCE(total_price_cents, 0) - COALESCE(deposit_amount_cents, 0)
WHERE balance_amount_cents IS NULL
  AND total_price_cents IS NOT NULL;

UPDATE public.bookings
SET security_deposit_hold_cents = 2800 * GREATEST(COALESCE(nights, 0), 0)
WHERE security_deposit_hold_cents IS NULL
  AND nights IS NOT NULL;

-- long_stay: true if nights >= 28
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS long_stay boolean;

UPDATE public.bookings
SET long_stay = (COALESCE(nights, 0) >= 28)
WHERE long_stay IS NULL
  AND nights IS NOT NULL;

-- balance_due_at: check_in - 14 days (short) or - 30 days (long stay)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS balance_due_at date;

UPDATE public.bookings
SET balance_due_at = (check_in::date - (CASE WHEN COALESCE(long_stay, false) THEN 30 ELSE 14 END))
WHERE balance_due_at IS NULL
  AND check_in IS NOT NULL;

-- Deprecated columns (kept for legacy; do not use in app logic)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'total_price_eur') THEN
    EXECUTE 'COMMENT ON COLUMN public.bookings.total_price_eur IS ''DEPRECATED: use total_price_cents''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_amount_eur') THEN
    EXECUTE 'COMMENT ON COLUMN public.bookings.deposit_amount_eur IS ''DEPRECATED: use deposit_amount_cents''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'stripe_checkout_session_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.bookings.stripe_checkout_session_id IS ''DEPRECATED: use stripe_session_id''';
  END IF;
END $$;
