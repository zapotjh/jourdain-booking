-- 04_charge_balance.sql
-- Balance charge support: track whether the remaining balance has been paid,
-- the PaymentIntent used, and basic failure/attempt metadata.
-- Safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS balance_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS balance_payment_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_payment_failure_reason text;

