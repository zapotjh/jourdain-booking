import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function mustPasswordOk(searchParams: Record<string, string | string[] | undefined>) {
  const expected = (process.env.ADMIN_PAGE_PASSWORD ?? "").trim();
  if (!expected) return true; // If not configured, don't block (dev-friendly).
  const p = String(searchParams.password ?? "").trim();
  return p === expected;
}

export default async function AdminBlockedDatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ok = mustPasswordOk(sp);

  if (!ok) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>Blocked dates</h1>
        <p style={{ margin: 0, color: "#555" }}>Unauthorized.</p>
      </main>
    );
  }

  const { data, error } = await supabaseAdmin
    .from("blocked_dates")
    .select("date,source,created_at")
    .order("date", { ascending: true })
    .limit(2000);

  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>Blocked dates</h1>
        <p style={{ margin: 0, color: "#c0392b" }}>Error: {error.message}</p>
      </main>
    );
  }

  const rows = (data ?? []) as Array<{ date: string; source: string; created_at: string }>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
      <h1 style={{ margin: "0 0 10px 0" }}>Blocked dates</h1>
      <p style={{ margin: "0 0 16px 0", color: "#555" }}>
        Total: <strong>{rows.length}</strong>
      </p>

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Source</th>
              <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.date}:${r.source}`}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>{r.date}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>{r.source}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2", color: "#666" }}>
                  {new Date(r.created_at).toISOString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={{ padding: "10px 12px", color: "#666" }} colSpan={3}>
                  No blocked dates.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p style={{ margin: "16px 0 0 0", fontSize: 12, color: "#888" }}>
        Tip: add <code>?password=...</code> if <code>ADMIN_PAGE_PASSWORD</code> is set.
      </p>
    </main>
  );
}

