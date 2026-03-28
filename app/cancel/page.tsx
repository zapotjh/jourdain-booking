import Image from "next/image";
import Link from "next/link";

export default function CancelPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#CAB1A4",
        color: "rgba(13, 8, 34, 0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "32px 20px 56px",
      }}
    >
      <div style={{ fontSize: "14px", letterSpacing: "0.04em", marginBottom: "16px" }}>
        주르당 아파트
      </div>

      <Image
        src="/logo.png"
        alt="L'appartement Jourdain"
        width={320}
        height={160}
        style={{ width: "100%", maxWidth: "320px", height: "auto", marginBottom: "32px" }}
      />

      <h1 style={{ fontSize: "28px", marginBottom: "16px", fontWeight: 600 }}>
        결제가 취소되었습니다
        <br />
        Payment Cancelled
      </h1>

      <p style={{ maxWidth: "420px", lineHeight: 1.8, marginBottom: "32px", fontSize: "15px" }}>
        결제가 완료되지 않았습니다. 예약 페이지에서 다시 시도하실 수 있습니다.
        <br />
        Your payment was not completed. You can return to the booking page and try again.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "180px",
          padding: "14px 24px",
          borderRadius: "999px",
          textDecoration: "none",
          border: "1px solid rgba(13, 8, 34, 0.18)",
          color: "rgba(13, 8, 34, 0.8)",
          background: "rgba(255,255,255,0.18)",
          boxShadow: "0 8px 20px rgba(13, 8, 34, 0.06)",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        홈으로 돌아가기 / Back to Home
      </Link>
    </main>
  );
}