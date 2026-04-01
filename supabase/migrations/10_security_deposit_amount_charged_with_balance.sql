-- 10_security_deposit_amount_charged_with_balance.sql
-- REV 2: refundable security deposit is charged together with the balance PaymentIntent.
-- Security deposit is NOT part of total_price_cents (accommodation revenue) and does not affect deposit_amount_cents.
-- Safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS security_deposit_amount_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_security_deposit_payment_intent_id text;

