import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendGuestCheckinReminder1dEmail,
  sendAdminCheckinReminder1dEmail,
} from "@/lib/emails/send-with-log";
import { startOfTomorrowParis } from "@/lib/paris-time";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = startOfTomorrowParis();

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id,email,guest_name,check_in,check_out,status,payment_status")
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("check_in", tomorrow);

  if (error) {
    console.error("[send-checkin-reminder] query error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as Array<{
    id: string;
    email: string | null;
    guest_name: string | null;
    check_in: string;
    check_out: string;
  }>;

  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const booking of bookings) {
    const bookingId = booking.id;

    const envTestEmail = process.env.TEST_CHECKIN_EMAIL;
    const targetEmail = envTestEmail && envTestEmail.length > 0
      ? envTestEmail
      : booking.email;

    if (!targetEmail) {
      console.warn("[send-checkin-reminder] skipping booking without email", {
        id: bookingId,
        route: "send-checkin-reminder",
      });
      skipped.push(bookingId);
      continue;
    }

    const guestName = booking.guest_name || "Guest";

    const guestResult = await sendGuestCheckinReminder1dEmail(bookingId, {
      to: targetEmail,
      guestName,
      checkIn: booking.check_in,
    });

    if (guestResult.status === "sent") {
      sent.push(bookingId);
    } else if (guestResult.status === "failed") {
      failed.push(bookingId);
      console.error("[send-checkin-reminder] guest checkin_reminder_1d failed", { id: bookingId, error: guestResult.error });
    } else if (guestResult.status === "deduped") {
      skipped.push(bookingId);
    }

    const adminResult = await sendAdminCheckinReminder1dEmail(bookingId, {
      guestName,
      guestEmail: booking.email ?? "",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    });
    if (adminResult.status === "failed") {
      console.error("[send-checkin-reminder] admin checkin_reminder_1d failed", { id: bookingId, error: adminResult.error });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      sent,
      skipped,
      failed,
    },
    { status: 200 },
  );
}

