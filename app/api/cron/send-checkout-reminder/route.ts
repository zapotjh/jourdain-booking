import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startOfTomorrowParis } from "@/lib/paris-time";
import {
  sendAdminCheckoutReminder1dEmail,
  sendGuestCheckoutReminder1dEmail,
} from "@/lib/emails/send-with-log";

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
    .eq("check_out", tomorrow);

  if (error) {
    console.error("[send-checkout-reminder] query error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as Array<{
    id: string;
    email: string | null;
    guest_name: string | null;
    check_in: string;
    check_out: string;
  }>;

  const sentGuest: string[] = [];
  const sentAdmin: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const booking of bookings) {
    const bookingId = booking.id;
    const guestName = booking.guest_name || "Guest";

    const envTestEmail = process.env.TEST_CHECKOUT_EMAIL;
    const targetEmail = envTestEmail && envTestEmail.length > 0 ? envTestEmail : booking.email;

    if (!targetEmail) {
      console.warn("[send-checkout-reminder] skipping booking without email", {
        id: bookingId,
        route: "send-checkout-reminder",
      });
      skipped.push(bookingId);
      continue;
    }

    const guestResult = await sendGuestCheckoutReminder1dEmail(bookingId, {
      to: targetEmail,
      guestName,
      checkOut: booking.check_out,
    });

    if (guestResult.status === "sent") sentGuest.push(bookingId);
    else if (guestResult.status === "failed") {
      failed.push(bookingId);
      console.error("[send-checkout-reminder] guest checkout_reminder_guest failed", {
        id: bookingId,
        error: guestResult.error,
      });
    } else skipped.push(bookingId);

    const adminResult = await sendAdminCheckoutReminder1dEmail(bookingId, {
      guestName,
      guestEmail: booking.email ?? "",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
    });
    if (adminResult.status === "sent") sentAdmin.push(bookingId);
    else if (adminResult.status === "failed") {
      console.error("[send-checkout-reminder] admin checkout_reminder_admin failed", {
        id: bookingId,
        error: adminResult.error,
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      tomorrow,
      sentGuest,
      sentAdmin,
      skipped,
      failed,
    },
    { status: 200 },
  );
}

