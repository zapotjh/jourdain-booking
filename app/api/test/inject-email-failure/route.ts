/**
 * Safe failure-injection endpoint for verifying send-with-log records status=failed in email_log.
 * Only for local/dev verification. Requires x-cron-secret.
 *
 * POST with optional query ?booking_id=uuid for reinvoke (dedupe test). No body read to avoid "Body already read" in pipeline.
 * Response: { "ok": true, "booking_id": "...", "result": "failed" | "deduped" }
 */

import { NextResponse } from "next/server";
import { sendGuestBookingPendingEmail } from "@/lib/emails/send-with-log";
import { EMAIL_FAILURE_INJECT_ADDRESS } from "@/lib/emails/mailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const queryBookingId = url.searchParams.get("booking_id");
  const bookingId =
    typeof queryBookingId === "string" && queryBookingId.trim()
      ? queryBookingId.trim()
      : crypto.randomUUID();

  const result = await sendGuestBookingPendingEmail(bookingId, {
    to: EMAIL_FAILURE_INJECT_ADDRESS,
    guestName: "Verification Guest",
    checkIn: "2030-01-10",
    checkOut: "2030-01-12",
    nights: 2,
    totalPriceEur: "300.00",
  });

  const resultStatus = result.status === "deduped" ? "deduped" : "failed";
  return NextResponse.json({
    ok: true,
    booking_id: bookingId,
    result: resultStatus,
  });
}
