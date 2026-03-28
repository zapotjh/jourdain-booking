-- Hold cron: eligible when Paris check_in is exactly 3 days after today (was 1 day).

CREATE OR REPLACE FUNCTION public.claim_security_deposit_hold_attempt(p_booking_id uuid)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.bookings
  SET last_security_deposit_hold_attempt_at = current_timestamp
  WHERE id = p_booking_id
    AND status = 'confirmed'
    AND payment_status = 'paid'
    AND COALESCE(security_deposit_hold_cents, 0) > 0
    AND stripe_payment_intent_id IS NOT NULL
    AND stripe_security_deposit_payment_intent_id IS NULL
    AND (security_deposit_hold_status IS NULL OR security_deposit_hold_status = 'failed')
    AND (currency IS NULL OR lower(currency) = 'eur')
    AND check_in IS NOT NULL
    AND check_in::date = ((current_timestamp AT TIME ZONE 'Europe/Paris')::date + 3)
    AND (
      last_security_deposit_hold_attempt_at IS NULL
      OR (last_security_deposit_hold_attempt_at AT TIME ZONE 'Europe/Paris')::date
         < (current_timestamp AT TIME ZONE 'Europe/Paris')::date
    )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_security_deposit_hold_attempt(uuid) IS
  'Claims one security-deposit hold attempt for the booking for today (Paris). check_in must equal Paris today + 3 days. Returns row if claim succeeded, else empty.';
