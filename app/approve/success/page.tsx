"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
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

const LINK_STYLE = {
  color: "rgba(13, 8, 34, 0.9)",
  textDecoration: "underline",
};

function ApproveSuccessContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const rejected = searchParams.get("rejected");
  const checkoutUrl = searchParams.get("checkout_url");
  const bookingId = searchParams.get("booking_id");

  if (error) {
    return (
      <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
        <h1 style={{ marginBottom: "16px", fontWeight: 600 }}>처리 실패</h1>
        <p style={{ marginBottom: "24px", maxWidth: "400px" }}>{decodeURIComponent(error)}</p>
        <Link href="/" style={LINK_STYLE}>홈으로</Link>
      </main>
    );
  }

  if (rejected === "1") {
    return (
      <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
        <h1 style={{ marginBottom: "16px", fontWeight: 600 }}>거절 완료</h1>
        <p style={{ marginBottom: "24px", maxWidth: "420px" }}>
          해당 예약 요청이 거절되었습니다. 게스트에게 안내 이메일이 발송됩니다.
        </p>
        {bookingId && (
          <p style={{ fontSize: "13px", marginBottom: "16px" }}>
            예약 ID: <code style={{ background: "rgba(255,255,255,0.3)", padding: "2px 6px", borderRadius: "4px" }}>{bookingId}</code>
          </p>
        )}
        <Link href="/" style={LINK_STYLE}>홈으로</Link>
      </main>
    );
  }

  return (
    <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
      <h1 style={{ marginBottom: "16px", fontWeight: 600 }}>승인 완료</h1>
      <p style={{ marginBottom: "24px", maxWidth: "420px" }}>
        게스트에게 결제 링크가 발송되었습니다.
      </p>
      {bookingId && (
        <p style={{ fontSize: "13px", marginBottom: "16px" }}>
          예약 ID: <code style={{ background: "rgba(255,255,255,0.3)", padding: "2px 6px", borderRadius: "4px" }}>{bookingId}</code>
        </p>
      )}
      {checkoutUrl && (
        <p style={{ marginTop: "16px" }}>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "rgba(13, 8, 34, 0.85)",
              color: "#CAB1A4",
              borderRadius: "999px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            결제 링크 열기 (게스트에게 전달 가능)
          </a>
        </p>
      )}
      <Link href="/" style={{ ...LINK_STYLE, marginTop: "32px" }}>홈으로</Link>
    </main>
  );
}

export default function ApproveSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ ...PAGE_STYLE, textAlign: "center" }}>
        <p>로딩 중…</p>
      </main>
    }>
      <ApproveSuccessContent />
    </Suspense>
  );
}
