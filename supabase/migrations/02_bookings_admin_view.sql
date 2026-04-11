-- 02_bookings_admin_view.sql
-- Read-only view for admin UI. All money shown in EUR (derived from cents). Do not use for app logic.

CREATE OR REPLACE VIEW public.bookings_admin_view AS
SELECT
  b.id,
  b.email,
  b.status,
  b.check_in,
  b.check_out,
  b.nights,
  (b.total_price_cents / 100.0)::numeric(12,2)     AS total_price_eur_display,
  (b.deposit_amount_cents / 100.0)::numeric(12,2)  AS deposit_amount_eur_display,
  (b.balance_amount_cents / 100.0)::numeric(12,2)  AS balance_amount_eur_display,
  (b.security_deposit_hold_cents / 100.0)::numeric(12,2) AS security_deposit_hold_eur_display,
  b.currency,
  b.stripe_session_id,
  b.stripe_payment_intent_id,
  b.balance_due_at,
  b.payment_pending_expires_at,
  NULL::timestamptz AS approved_at,
  b.confirmed_at,
  b.created_at
FROM public.bookings b;

COMMENT ON VIEW public.bookings_admin_view IS 'Admin-facing view: money in EUR (from cents). Canonical data remains in public.bookings (cents).';
