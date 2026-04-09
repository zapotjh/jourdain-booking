import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startOfTodayParis } from "@/lib/paris-time";
import { expandAllDayEventToDates, parseAllDayEventsFromIcs } from "@/lib/ical";

export const runtime = "nodejs";

type BlockedDateRow = { date: string; source: string };

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const icalUrl = (process.env.AIRBNB_ICAL_URL ?? "").trim();
  if (!icalUrl) {
    return NextResponse.json({ error: "Missing AIRBNB_ICAL_URL" }, { status: 500 });
  }

  let icsText = "";
  try {
    const res = await fetch(icalUrl, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `iCal fetch failed: HTTP ${res.status}` }, { status: 502 });
    }
    icsText = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `iCal fetch error: ${(e as Error)?.message ?? String(e)}` }, { status: 502 });
  }

  const events = parseAllDayEventsFromIcs(icsText);
  const dateSet = new Set<string>();
  for (const ev of events) {
    for (const d of expandAllDayEventToDates(ev.dtstart, ev.dtendExclusive)) {
      dateSet.add(d);
    }
  }

  const source = "airbnb";
  const incomingDates = Array.from(dateSet).sort();
  const incomingRows: BlockedDateRow[] = incomingDates.map((date) => ({ date, source }));

  // Load existing airbnb blocks (all), then compute adds/removes.
  const { data: existingRows, error: existingErr } = await supabaseAdmin
    .from("blocked_dates")
    .select("date,source")
    .eq("source", source);

  if (existingErr) {
    console.error("[sync-airbnb-calendar] blocked_dates select error", existingErr);
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const existingDates = new Set<string>(
    (existingRows ?? []).map((r: any) => String(r.date)),
  );

  const toAdd = incomingRows.filter((r) => !existingDates.has(r.date));
  const toRemoveNotInFeed = Array.from(existingDates).filter((d) => !dateSet.has(d));

  // Upsert new blocks (never touches other sources).
  if (toAdd.length > 0) {
    const { error: upErr } = await supabaseAdmin
      .from("blocked_dates")
      .upsert(toAdd);
    if (upErr) {
      console.error("[sync-airbnb-calendar] upsert error", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  // Remove expired airbnb blocks (in the past), plus blocks no longer present in feed.
  const todayParis = startOfTodayParis();

  const toRemove = new Set<string>(toRemoveNotInFeed);
  for (const d of existingDates) {
    if (d < todayParis) toRemove.add(d);
  }

  let removed = 0;
  if (toRemove.size > 0) {
    const list = Array.from(toRemove);
    const { error: delErr } = await supabaseAdmin
      .from("blocked_dates")
      .delete()
      .eq("source", source)
      .in("date", list);
    if (delErr) {
      console.error("[sync-airbnb-calendar] delete error", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    removed = list.length;
  }

  const total = incomingRows.length;
  return NextResponse.json(
    {
      ok: true,
      added: toAdd.length,
      removed,
      total,
    },
    { status: 200 },
  );
}

