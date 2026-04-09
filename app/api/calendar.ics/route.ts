import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function ymdToIcsDate(ymd: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  return ymd.replaceAll("-", "");
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

function escapeIcsText(s: string): string {
  return String(s ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id,check_in,check_out,status,payment_status")
    .in("status", ["confirmed", "payment_pending"])
    .order("check_in", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("[calendar.ics] bookings query error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const dtstamp = now
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Lappartement Jourdain//Booking Calendar//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  for (const r of data ?? []) {
    const id = String((r as any).id);
    const checkIn = String((r as any).check_in ?? "").slice(0, 10);
    const checkOut = String((r as any).check_out ?? "").slice(0, 10);
    if (!checkIn || !checkOut) continue;

    // iCal all-day events use exclusive DTEND.
    const dtstart = ymdToIcsDate(checkIn);
    const dtendExclusive = ymdToIcsDate(checkOut);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(id)}@lappartementjourdain.com`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtendExclusive}`);
    lines.push(`SUMMARY:${escapeIcsText("Booked")}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

