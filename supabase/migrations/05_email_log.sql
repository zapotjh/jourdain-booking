-- Email event log: canonical record of all sent/failed emails.
-- No per-email booleans on bookings; this table is the source of truth.

CREATE TABLE IF NOT EXISTS public.email_log (
  id bigserial PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  recipient_type text NOT NULL,
  email_type text NOT NULL,
  to_email text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_log IS 'Canonical log of all email send attempts (guest and admin).';
COMMENT ON COLUMN public.email_log.recipient_type IS 'admin or guest';
COMMENT ON COLUMN public.email_log.email_type IS 'booking_pending, booking_approval_request, etc.';
COMMENT ON COLUMN public.email_log.status IS 'sent or failed';

CREATE INDEX IF NOT EXISTS idx_email_log_booking_id ON public.email_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_email_type ON public.email_log(recipient_type, email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);
