-- Blocked dates for external calendar sync (Airbnb iCal, etc.)
-- This table is intentionally separate from bookings inventory.
-- One row per blocked day per source.

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  date date NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, source)
);

-- Backwards-compatible: if a legacy blocked_dates table exists without source,
-- add it (no destructive changes).
ALTER TABLE IF EXISTS public.blocked_dates
  ADD COLUMN IF NOT EXISTS source text;

-- Ensure source is not null for existing rows (legacy).
UPDATE public.blocked_dates
SET source = 'manual'
WHERE source IS NULL;

-- Ensure composite uniqueness (if legacy table existed without PK).
CREATE UNIQUE INDEX IF NOT EXISTS blocked_dates_date_source_unique
  ON public.blocked_dates (date, source);

CREATE INDEX IF NOT EXISTS blocked_dates_date_idx
  ON public.blocked_dates (date);

