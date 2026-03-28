/**
 * Durable idempotency for Stripe webhooks.
 * Insert before business logic; on unique violation treat as duplicate and return 200.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

export type RecordResult = { duplicate: true } | { duplicate: false };

export async function recordWebhookEvent(
  stripeEventId: string,
  eventType: string,
  livemode: boolean,
): Promise<RecordResult> {
  const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
    livemode,
    booking_id: null,
    notes: {},
  });
  if (error) {
    if (error.code === "23505") return { duplicate: true };
    throw error;
  }
  return { duplicate: false };
}

export async function markWebhookEventProcessed(
  stripeEventId: string,
  bookingId?: string | null,
  notes?: Record<string, unknown>,
): Promise<void> {
  const updates: { processed_at: string; booking_id?: string; notes?: Record<string, unknown> } = {
    processed_at: new Date().toISOString(),
  };
  if (bookingId != null) updates.booking_id = bookingId;
  if (notes != null && Object.keys(notes).length > 0) updates.notes = notes;
  await supabaseAdmin
    .from("stripe_webhook_events")
    .update(updates)
    .eq("stripe_event_id", stripeEventId);
}
