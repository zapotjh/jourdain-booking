-- Prevent duplicate (booking_id, recipient_type, email_type) per event.
-- balance_payment_failed is excluded so we can store up to 3 attempts per recipient.

CREATE UNIQUE INDEX IF NOT EXISTS email_log_unique_event
ON public.email_log (booking_id, recipient_type, email_type)
WHERE email_type <> 'balance_payment_failed';

COMMENT ON INDEX email_log_unique_event IS 'One row per (booking, recipient, type) except balance_payment_failed (allows 3 attempts).';
