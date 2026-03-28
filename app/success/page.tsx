import Image from "next/image";
import Link from "next/link";

type SuccessPageProps = {
  searchParams?: Promise<{
    booking_id?: string;
    guest_name?: string;
    check_in?: string;
    check_out?: string;
    nights?: string;
  }>;
};

function formatDate(dateString?: string) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function SuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = (await searchParams) ?? {};

  const bookingId = params.booking_id ?? "";
  const guestName = params.guest_name ?? "";
  const checkIn = params.check_in ?? "";
  const checkOut = params.check_out ?? "";
  const nights = params.nights ?? "";

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#CAB1A4",
        color: "rgba(13, 8, 34, 0.8)",
        padding: "32px 20px 56px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "0.04em",
          }}
        >
          주르당 아파트
        </div>

        <Image
          src="/logo.png"
          alt="L'appartement Jourdain"
          width={420}
          height={210}
          priority
          style={{
            width: "100%",
            maxWidth: "420px",
            height: "auto",
          }}
        />

        <section
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(13, 8, 34, 0.12)",
            borderRadius: "28px",
            padding: "32px 24px",
            boxShadow: "0 12px 30px rgba(13, 8, 34, 0.08)",
            backdropFilter: "blur(4px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 20px",
              borderRadius: "999px",
              border: "1px solid rgba(13, 8, 34, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              lineHeight: 1,
            }}
          >
            ✓
          </div>

          <h1
            style={{
              fontSize: "32px",
              lineHeight: 1.3,
              margin: "0 0 14px",
              fontWeight: 600,
            }}
          >
            예약이 완료되었습니다
            <br />
            Reservation Confirmed
          </h1>

          <p
            style={{
              margin: "0 auto",
              maxWidth: "520px",
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            예약이 정상적으로 완료되었습니다. 확인 이메일이 발송되었습니다.
            <br />
            Your booking has been successfully completed. A confirmation email
            has been sent to you.
          </p>
        </section>

        <section
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(13, 8, 34, 0.12)",
            borderRadius: "28px",
            padding: "28px 24px",
            boxShadow: "0 10px 24px rgba(13, 8, 34, 0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: "20px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            예약 정보
            <br />
            Booking Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 0",
                borderBottom: "1px solid rgba(13, 8, 34, 0.12)",
              }}
            >
              <span>예약번호 / Booking ID</span>
              <strong>{bookingId || "-"}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 0",
                borderBottom: "1px solid rgba(13, 8, 34, 0.12)",
              }}
            >
              <span>투숙객명 / Guest</span>
              <strong>{guestName || "-"}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 0",
                borderBottom: "1px solid rgba(13, 8, 34, 0.12)",
              }}
            >
              <span>체크인 / Check-in</span>
              <strong>{formatDate(checkIn)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 0",
                borderBottom: "1px solid rgba(13, 8, 34, 0.12)",
              }}
            >
              <span>체크아웃 / Check-out</span>
              <strong>{formatDate(checkOut)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 0",
              }}
            >
              <span>숙박일수 / Nights</span>
              <strong>{nights || "-"}</strong>
            </div>
          </div>
        </section>

        <section
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(13, 8, 34, 0.12)",
            borderRadius: "28px",
            padding: "28px 24px",
            boxShadow: "0 10px 24px rgba(13, 8, 34, 0.05)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            체크인 안내
            <br />
            Check-in Information
          </h2>

          <p
            style={{
              margin: "0 auto 18px",
              maxWidth: "540px",
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            체크인 안내 및 연락처는 도착 하루 전에 보내드립니다.
            <br />
            Detailed check-in instructions and contact details will be sent 1
            day before arrival.
          </p>

          <p
            style={{
              margin: "0 auto",
              maxWidth: "560px",
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            그 전 문의사항은 아래 이메일로 연락 부탁드립니다.
            <br />
            For any questions before arrival, please contact us by email.
            <br />
            <a
              href="mailto:apt.jourdain.paris@gmail.com"
              style={{
                color: "rgba(13, 8, 34, 0.8)",
                textDecoration: "underline",
                wordBreak: "break-word",
              }}
            >
              apt.jourdain.paris@gmail.com
            </a>
          </p>
        </section>

        <section
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(13, 8, 34, 0.12)",
            borderRadius: "28px",
            padding: "24px",
            boxShadow: "0 10px 24px rgba(13, 8, 34, 0.05)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            주소
            <br />
            Address
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: 1.8,
            }}
          >
            314 rue des Pyrénées
            <br />
            75020 Paris
          </p>
        </section>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
            marginTop: "4px",
          }}
        >
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

          <a
            href="mailto:apt.jourdain.paris@gmail.com"
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
              background: "transparent",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            이메일 문의 / Contact by Email
          </a>
        </div>
      </div>
    </main>
  );
}
