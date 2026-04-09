'use client';

import { useEffect, useMemo, useState } from "react";

type BlockedRow = { date: string; source: string; created_at?: string };

const BG = "#CAB1A4";
const FG = "rgba(13, 8, 34, 0.9)";
const FG_MUTED = "rgba(13, 8, 34, 0.7)";

const STORAGE_KEY = "admin_blocked_dates_authed_v1";

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function daysInMonth(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function weekdayIndexMonday0(d: Date): number {
  // JS: Sun=0..Sat=6 -> Mon=0..Sun=6
  const js = d.getUTCDay();
  return (js + 6) % 7;
}

async function apiFetch(path: string, password: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "content-type": "application/json",
      "x-admin-password": password,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const msg = json?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export default function AdminBlockedDatesPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  const byDate = useMemo(() => {
    const map = new Map<string, { manual: boolean; airbnb: boolean }>();
    for (const r of rows) {
      const key = String(r.date).slice(0, 10);
      const prev = map.get(key) ?? { manual: false, airbnb: false };
      if (r.source === "manual") prev.manual = true;
      if (r.source === "airbnb") prev.airbnb = true;
      map.set(key, prev);
    }
    return map;
  }, [rows]);

  const totalBlocked = useMemo(() => {
    // Unique dates blocked by either manual or airbnb
    return byDate.size;
  }, [byDate]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setAuthed(true);
    } catch {}
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch("/api/admin/blocked-dates", password, { method: "GET" });
      setRows((json?.rows ?? []) as BlockedRow[]);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setAuthed(true);
    } catch (e) {
      setAuthed(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setError((e as Error)?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleDate(dateStr: string) {
    const flags = byDate.get(dateStr);
    if (flags?.airbnb) return; // Airbnb blocks are read-only

    setError(null);
    // Optimistic UI
    setRows((prev) => {
      const hasManual = prev.some((r) => String(r.date).slice(0, 10) === dateStr && r.source === "manual");
      if (hasManual) return prev.filter((r) => !(String(r.date).slice(0, 10) === dateStr && r.source === "manual"));
      return [{ date: dateStr, source: "manual", created_at: new Date().toISOString() }, ...prev];
    });

    try {
      const hasManualNow = flags?.manual === true;
      if (hasManualNow) {
        await apiFetch("/api/admin/blocked-dates", password, {
          method: "DELETE",
          body: JSON.stringify({ date: dateStr }),
        });
      } else {
        await apiFetch("/api/admin/blocked-dates", password, {
          method: "POST",
          body: JSON.stringify({ date: dateStr, source: "manual" }),
        });
      }
      // Refresh authoritative state
      const json = await apiFetch("/api/admin/blocked-dates", password, { method: "GET" });
      setRows((json?.rows ?? []) as BlockedRow[]);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed");
      // Re-load to revert optimistic changes
      try {
        const json = await apiFetch("/api/admin/blocked-dates", password, { method: "GET" });
        setRows((json?.rows ?? []) as BlockedRow[]);
      } catch {}
    }
  }

  const y = month.getUTCFullYear();
  const m = month.getUTCMonth(); // 0-based
  const monthLabel = month.toLocaleDateString("ko-KR", { year: "numeric", month: "long", timeZone: "UTC" });
  const first = new Date(Date.UTC(y, m, 1));
  const padStart = weekdayIndexMonday0(first);
  const dim = daysInMonth(month);

  const cells: Array<{ dateStr: string | null; day: number | null }> = [];
  for (let i = 0; i < padStart; i++) cells.push({ dateStr: null, day: null });
  for (let day = 1; day <= dim; day++) {
    const d = new Date(Date.UTC(y, m, day));
    const dateStr = ymd(d);
    cells.push({ dateStr, day });
  }
  while (cells.length % 7 !== 0) cells.push({ dateStr: null, day: null });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, color: FG, paddingTop: 16, paddingBottom: 24 }}>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
        <h1 style={{ margin: "8px 0 6px 0", fontSize: 18, fontWeight: 700 }}>Blocked dates</h1>
        <p style={{ margin: 0, color: FG_MUTED, fontSize: 13 }}>
          차단된 날짜 수: <strong>{totalBlocked}</strong>
        </p>

        {!authed ? (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(13, 8, 34, 0.12)" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: 13, color: FG_MUTED }}>
              관리자 비밀번호를 입력해 주세요.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN_PAGE_PASSWORD"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.18)",
                  background: "rgba(255,255,255,0.5)",
                  color: FG,
                  outline: "none",
                }}
              />
              <button
                onClick={() => void load()}
                disabled={loading || password.trim().length === 0}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.18)",
                  background: "rgba(13, 8, 34, 0.9)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {loading ? "..." : "확인"}
              </button>
            </div>
            {error ? <p style={{ margin: "10px 0 0 0", color: "#7b241c", fontSize: 13 }}>{error}</p> : null}
          </div>
        ) : (
          <>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <button
                onClick={() => setMonth((d) => addMonths(d, -1))}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.12)",
                  background: "rgba(255,255,255,0.18)",
                  color: FG,
                  fontWeight: 600,
                }}
              >
                이전
              </button>
              <div style={{ fontWeight: 700 }}>{monthLabel}</div>
              <button
                onClick={() => setMonth((d) => addMonths(d, 1))}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.12)",
                  background: "rgba(255,255,255,0.18)",
                  color: FG,
                  fontWeight: 600,
                }}
              >
                다음
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: FG_MUTED }}>
              <span>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#b03a2e", marginRight: 6, verticalAlign: "middle" }} />
                manual(클릭 토글)
              </span>
              <span>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#7f8c8d", marginRight: 6, verticalAlign: "middle" }} />
                airbnb(삭제 불가)
              </span>
            </div>

            {error ? <p style={{ margin: "10px 0 0 0", color: "#7b241c", fontSize: 13 }}>{error}</p> : null}

            <div
              style={{
                marginTop: 12,
                borderRadius: 14,
                border: "1px solid rgba(13, 8, 34, 0.12)",
                background: "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, borderBottom: "1px solid rgba(13, 8, 34, 0.08)" }}>
                {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
                  <div key={w} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, color: FG_MUTED, fontWeight: 700 }}>
                    {w}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {cells.map((c, idx) => {
                  const flags = c.dateStr ? byDate.get(c.dateStr) : null;
                  const isAirbnb = !!flags?.airbnb;
                  const isManual = !!flags?.manual;
                  const bg =
                    isAirbnb ? "rgba(127,140,141,0.35)" : isManual ? "rgba(176,58,46,0.50)" : "rgba(255,255,255,0.12)";
                  const border = "1px solid rgba(13, 8, 34, 0.06)";
                  const clickable = !!c.dateStr && !isAirbnb;
                  return (
                    <button
                      key={idx}
                      onClick={() => c.dateStr && void toggleDate(c.dateStr)}
                      disabled={!clickable}
                      style={{
                        height: 54,
                        border,
                        background: c.day ? bg : "transparent",
                        cursor: clickable ? "pointer" : "default",
                        color: FG,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: isManual || isAirbnb ? 800 : 600,
                        opacity: c.day ? 1 : 0,
                      }}
                      aria-label={c.dateStr ? `toggle ${c.dateStr}` : "empty"}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch {}
                  setAuthed(false);
                  setRows([]);
                  setPassword("");
                  setError(null);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.12)",
                  background: "rgba(255,255,255,0.18)",
                  color: FG,
                  fontWeight: 700,
                }}
              >
                로그아웃
              </button>
              <button
                onClick={() => void load()}
                disabled={loading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(13, 8, 34, 0.12)",
                  background: "rgba(13, 8, 34, 0.9)",
                  color: "#fff",
                  fontWeight: 800,
                  minWidth: 110,
                }}
              >
                {loading ? "로딩..." : "새로고침"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

