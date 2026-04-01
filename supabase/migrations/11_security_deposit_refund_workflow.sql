-- 11_security_deposit_refund_workflow.sql
-- Post-checkout refundable security deposit workflow (REV 2).
-- Adds: persistent refund token + admin email timing markers + refunded state tracking.
-- Safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS security_deposit_refund_token text,
  ADD COLUMN IF NOT EXISTS security_deposit_refund_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_deposit_refund_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS security_deposit_refunded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS security_deposit_refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_deposit_refund_id text;

