"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

const PAGE_STYLE = {
  minHeight: "100vh" as const,
  backgroundColor: "#CAB1A4",
  color: "rgba(13, 8, 34, 0.8)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  alignItems: "center",
  padding: "32px 20px 56px",
  fontFamily: "sans-serif",
};

function RejectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const approvalToken = searchParams.get("approval_token");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!approvalToken) {
    return (
      <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
        <h1 style={{ marginBottom: "16px", fontWeight: 600 }}>잘못된 링크</h1>
        <p style={{ marginBottom: "24px" }}>approval_token이 없습니다. 이메일의 거절하기 링크로 접속해 주세요.</p>
        <Link href="/" style={{ color: "rgba(13, 8, 34, 0.9)", textDecoration: "underline" }}>홈으로</Link>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/api/host/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_token: approvalToken,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "거절 처리에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      const params = new URLSearchParams({ rejected: "1" });
      if (data.booking_id) params.set("booking_id", data.booking_id);
      router.push(`/approve/success?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <main style={PAGE_STYLE}>
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <h1 style={{ marginBottom: "8px", fontWeight: 600 }}>예약 거절</h1>
        <p style={{ marginBottom: "24px", fontSize: "14px", opacity: 0.9 }}>
          아래 메시지는 선택 사항이며, 입력하시면 게스트가 받는 거절 안내 이메일에 포함됩니다.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px" }}>
            게스트에게 전달할 메시지 (선택)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예: 해당 기간에 이미 예약이 있어 불가능합니다. 다른 날짜로 문의해 주세요."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid rgba(13, 8, 34, 0.2)",
              borderRadius: "12px",
              fontSize: "14px",
              resize: "vertical",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.2)",
              color: "rgba(13, 8, 34, 0.9)",
            }}
          />
          {error && (
            <p style={{ color: "rgba(139, 0, 0, 0.9)", fontSize: "14px", marginTop: "8px" }}>{error}</p>
          )}
          <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 24px",
                background: submitting ? "rgba(13, 8, 34, 0.4)" : "rgba(13, 8, 34, 0.75)",
                color: "#CAB1A4",
                border: "none",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "처리 중…" : "거절하기"}
            </button>
            <Link href="/" style={{ color: "rgba(13, 8, 34, 0.8)", fontSize: "14px", textDecoration: "underline" }}>취소</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function RejectPage() {
  return (
    <Suspense fallback={
      <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
        <p>로딩 중…</p>
      </main>
    }>
      <RejectContent />
    </Suspense>
  );
}
