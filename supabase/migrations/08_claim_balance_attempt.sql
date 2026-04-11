-- Atomic claim for balance charge: at most one attempt per Paris calendar day per booking.
-- Cron calls this before Stripe; only the caller that gets a row proceeds to charge.
-- Ensures concurrent cron runs cannot both own the same day's attempt.

CREATE OR REPLACE FUNCTION public.claim_balance_attempt(p_booking_id uuid)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.bookings
  SET last_balance_attempt_at = current_timestamp
  WHERE id = p_booking_id
    AND status = 'confirmed'
    AND balance_paid = false
    AND payment_status = 'paid'
    AND (balance_payment_attempts IS NULL OR balance_payment_attempts < 3)
    AND (
      last_balance_attempt_at IS NULL
      OR (last_balance_attempt_at AT TIME ZONE 'Europe/Paris')::date < (current_timestamp AT TIME ZONE 'Europe/Paris')::date
    )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_balance_attempt(uuid) IS 'Claims one balance attempt for the booking for today (Paris). Returns the row if claim succeeded, else empty. Call before creating Stripe PaymentIntent.';