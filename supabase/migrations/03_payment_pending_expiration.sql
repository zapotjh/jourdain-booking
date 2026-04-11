-- 03_payment_pending_expiration.sql
-- Adds payment_pending_expires_at and safely backfills existing payment_pending rows.
-- One-property system: simple rule = 24 hours after approval/update.
--
-- IMPORTANT: Does not drop any legacy columns.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_pending_expires_at timestamptz;

-- Backfill only when missing and only for unpaid payment_pending rows
UPDATE public.bookings
SET payment_pending_expires_at = COALESCE(updated_at, created_at) + interval '24 hours'
WHERE status = 'payment_pending'
  AND (payment_status IS NULL OR payment_status != 'paid')
  AND payment_pending_expires_at IS NULL;

COMMENT ON COLUMN public.bookings.payment_pending_expires_at IS
  'When a booking entered payment_pending, it expires at this timestamp if still unpaid (auto-cancel job).';

-- Speeds up expiration scans (partial index for the hot subset only)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_pending_expires_at
ON public.bookings (payment_pending_expires_at)
WHERE status = 'payment_pending';
