-- Durable idempotency for Stripe webhook events.
-- Insert stripe_event_id before any business logic; unique violation => return 200 (already processed).
-- On success set processed_at = now().

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id bigserial PRIMARY KEY,
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  livemode boolean NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  booking_id uuid,
  notes jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT stripe_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_created_at_idx ON public.stripe_webhook_events (created_at);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_booking_id_idx ON public.stripe_webhook_events (booking_id);

COMMENT ON TABLE public.stripe_webhook_events IS 'Idempotency: one row per Stripe event; duplicate delivery returns 200 without reprocessing.';
COMMENT ON COLUMN public.stripe_webhook_events.processed_at IS 'Set when checkout.session.completed (or other) handling completed successfully.';
