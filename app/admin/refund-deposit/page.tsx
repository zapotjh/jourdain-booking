import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export const runtime = "nodejs";

function eurFromCents(cents: number): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n) / 100).toFixed(2);
}

export default async function RefundDepositAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string; token?: string; status?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const bookingId = (sp.booking_id ?? "").trim();
  const token = (sp.token ?? "").trim();

  if (!bookingId || !token) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>보증금 환불</h1>
        <p style={{ margin: 0, color: "#555" }}>유효하지 않은 링크입니다.</p>
      </main>
    );
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,guest_name,email,check_in,check_out,security_deposit_amount_cents,security_deposit_refund_token,security_deposit_refunded,security_deposit_refunded_at,stripe_deposit_refund_id,stripe_balance_payment_intent_id,stripe_security_deposit_payment_intent_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>보증금 환불</h1>
        <p style={{ margin: 0, color: "#555" }}>예약 정보를 찾을 수 없습니다.</p>
      </main>
    );
  }

  const tokenOk = String((booking as any).security_deposit_refund_token ?? "") === token;
  if (!tokenOk) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>보증금 환불</h1>
        <p style={{ margin: 0, color: "#555" }}>유효하지 않은 토큰입니다.</p>
      </main>
    );
  }

  const guestName = (booking as any).guest_name ?? "Guest";
  const checkIn = (booking as any).check_in ?? "";
  const checkOut = (booking as any).check_out ?? "";
  const depositCents = Number((booking as any).security_deposit_amount_cents ?? 0);
  const depositEur = eurFromCents(depositCents);
  const refunded = Boolean((booking as any).security_deposit_refunded) || !!(booking as any).stripe_deposit_refund_id;

  const status = (sp.status ?? "").trim();
  const message = (sp.message ?? "").trim();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", lineHeight: 1.7 }}>
      <h1 style={{ margin: "0 0 10px 0" }}>보증금 환불 (관리자)</h1>

      <div style={{ margin: "12px 0 18px 0", padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 8, columnGap: 10 }}>
          <div style={{ color: "#666" }}>예약 ID</div>
          <div style={{ fontSize: 12, wordBreak: "break-all" }}>{bookingId}</div>
          <div style={{ color: "#666" }}>게스트</div>
          <div>{guestName}</div>
          <div style={{ color: "#666" }}>숙박 일정</div>
          <div>
            {checkIn} ~ {checkOut}
          </div>
          <div style={{ color: "#666" }}>환불 대상 보증금</div>
          <div style={{ fontWeight: 700 }}>€{depositEur}</div>
        </div>
        <p style={{ margin: "12px 0 0 0", color: "#666", fontSize: 13 }}>
          안전 규칙: <strong>보증금만</strong> 부분 환불됩니다. (숙박 잔금/예약금은 환불하지 않음)
        </p>
      </div>

      {status ? (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #eee",
            background: status === "ok" ? "#f2fbf5" : "#fff6f6",
            color: status === "ok" ? "#1f6f3a" : "#b00020",
          }}
        >
          {message || (status === "ok" ? "처리되었습니다." : "실패했습니다.")}
        </div>
      ) : null}

      {refunded ? (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #eee", background: "#fafafa" }}>
          <p style={{ margin: 0 }}>
            이미 환불 처리됨.{" "}
            {(booking as any).security_deposit_refunded_at ? (
              <span style={{ color: "#666" }}>({String((booking as any).security_deposit_refunded_at)})</span>
            ) : null}
          </p>
        </div>
      ) : (
        <form action="/api/admin/refund-deposit" method="POST">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            보증금 환불 실행
          </button>
          <p style={{ margin: "10px 0 0 0", color: "#666", fontSize: 12 }}>
            주의: 실행 즉시 Stripe에 부분 환불이 생성됩니다. 중복 환불은 시스템이 차단합니다.
          </p>
        </form>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href="/" style={{ color: "#1a73e8" }}>
          홈으로
        </Link>
      </div>
    </main>
  );
}

