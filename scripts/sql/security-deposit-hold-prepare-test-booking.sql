-- Prepare ONE booking for GET /api/cron/security-deposit-hold (Paris check_in = today + 3).
-- 1) Replace the UUID below with your real booking id.
-- 2) Run in Supabase SQL Editor.
-- 3) Call production cron with header x-cron-secret.
-- check_in matches public.claim_security_deposit_hold_attempt (Europe/Paris ::date + 3).

UPDATE public.bookings
SET
  check_in = ((current_timestamp AT TIME ZONE 'Europe/Paris')::date + 3),
  check_out = ((current_timestamp AT TIME ZONE 'Europe/Paris')::date + 5),
  currency = COALESCE(lower(currency), 'eur'),
  security_deposit_hold_cents = GREATEST(COALESCE(security_deposit_hold_cents, 0), 50000),
  stripe_security_deposit_payment_intent_id = NULL,
  security_deposit_hold_status = NULL,
  security_deposit_hold_created_at = NULL,
  security_deposit_hold_released_at = NULL,
  security_deposit_hold_captured_at = NULL,
  security_deposit_hold_failure_reason = NULL,
  last_security_deposit_hold_attempt_at = NULL
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
  AND status = 'confirmed'
  AND payment_status = 'paid'
  AND stripe_payment_intent_id IS NOT NULL
RETURNING
  id,
  check_in,
  check_out,
  security_deposit_hold_cents,
  stripe_payment_intent_id;
