-- 02_optional_view_eur.sql
-- VIEW that exposes EUR-derived values for admin UI. Display only; app logic uses cents.

DROP VIEW IF EXISTS public.bookings_view;

CREATE VIEW public.bookings_view AS
SELECT
  b.*,
  (b.total_price_cents / 100.0)::numeric(12,2)   AS total_price_eur_display,
  (b.deposit_amount_cents / 100.0)::numeric(12,2) AS deposit_amount_eur_display,
  (b.balance_amount_cents / 100.0)::numeric(12,2)  AS balance_amount_eur_display,
  (b.security_deposit_hold_cents / 100.0)::numeric(12,2) AS security_deposit_hold_eur_display
FROM public.bookings b;
