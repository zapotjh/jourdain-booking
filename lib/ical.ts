/**
 * Minimal iCalendar helpers for this codebase (no external deps).
 * Supports all-day events like Airbnb iCal (DTSTART/DTEND with VALUE=DATE or YYYYMMDD).
 */

function unfoldIcsLines(ics: string): string[] {
  // RFC 5545 line folding: CRLF + space/tab means continuation.
  const raw = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if (!line) continue;
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseIcsDateValue(v: string): string | null {
  // Accept YYYYMMDD or YYYY-MM-DD
  const s = v.trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export type IcsAllDayEvent = {
  dtstart: string; // YYYY-MM-DD
  dtendExclusive: string; // YYYY-MM-DD (exclusive end)
  uid?: string;
  summary?: string;
};

export function parseAllDayEventsFromIcs(ics: string): IcsAllDayEvent[] {
  const lines = unfoldIcsLines(ics);
  const events: IcsAllDayEvent[] = [];
  let inEvent = false;
  let cur: Partial<IcsAllDayEvent> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (cur.dtstart && cur.dtendExclusive) {
        events.push(cur as IcsAllDayEvent);
      }
      cur = {};
      continue;
    }
    if (!inEvent) continue;

    const [kRaw, ...rest] = line.split(":");
    if (!kRaw || rest.length === 0) continue;
    const value = rest.join(":");
    const key = kRaw.toUpperCase();

    if (key.startsWith("DTSTART")) {
      const dt = parseIcsDateValue(value);
      if (dt) cur.dtstart = dt;
    } else if (key.startsWith("DTEND")) {
      const dt = parseIcsDateValue(value);
      if (dt) cur.dtendExclusive = dt;
    } else if (key === "UID") {
      cur.uid = value.trim();
    } else if (key === "SUMMARY") {
      cur.summary = value.trim();
    }
  }

  return events;
}

export function expandAllDayEventToDates(dtstart: string, dtendExclusive: string): string[] {
  // Expand [start, endExclusive) into YYYY-MM-DD list
  if (!dtstart || !dtendExclusive) return [];
  if (dtendExclusive < dtstart) return [];
  const out: string[] = [];
  let d = dtstart;
  while (d < dtendExclusive) {
    out.push(d);
    d = addDaysYmd(d, 1);
  }
  return out;
}

