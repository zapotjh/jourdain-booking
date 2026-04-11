-- Rate limit balance retries: at most one attempt per calendar day (Paris).
-- Used by charge-balance cron to avoid multiple attempts per day if cron runs more than once.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS last_balance_attempt_at timestamptz;

COMMENT ON COLUMN public.bookings.last_balance_attempt_at IS 'Timestamp of last balance charge attempt (success or failure). Used to enforce <= 1 attempt per day.';
