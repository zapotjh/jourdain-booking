// Email C2 — Payment success admin notification
// Trigger: same webhook event as Email C (checkout.session.completed)

import { sendAdminEmail } from "./mailer";

export interface EmailC2Params {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  longStay: boolean;
  totalPriceEur: string;
  depositAmountEur: string;
  balanceAmountEur: string;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  confirmedAt: string; // ISO string
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailC2(p: EmailC2Params) {
  const bookingId = escapeHtml(p.bookingId);
  const guestName = escapeHtml(p.guestName);
  const guestEmail = escapeHtml(p.guestEmail);
  const stripeSessionId = p.stripeSessionId
    ? escapeHtml(p.stripeSessionId)
    : null;
  const stripePaymentIntentId = p.stripePaymentIntentId
    ? escapeHtml(p.stripePaymentIntentId)
    : null;

  const subject =
    "[관리자 알림] 결제 완료 및 예약 확정 - L'appartement Jourdain, Paris";

  const confirmedFormatted = new Date(p.confirmedAt).toLocaleString("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  const balanceDueNote = p.longStay
    ? "잔금(60%)은 체크인 30일 전에 자동으로 청구됩니다."
    : "잔금(60%)은 체크인 14일 전에 자동으로 청구됩니다.";

  const balanceDueNoteEn = p.longStay
    ? "The remaining balance (60%) will be auto-charged 30 days before check-in."
    : "The remaining balance (60%) will be auto-charged 14 days before check-in.";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#27ae60;">결제 완료 및 예약 확정</h2>

  <p>
    게스트의 예약금 결제가 완료되었으며 예약 상태가 <strong>confirmed</strong>로 변경되었습니다.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">예약 ID</td>
      <td style="padding:8px 0;font-size:12px;word-break:break-all;">${bookingId}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">게스트 이름</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">게스트 이메일</td>
      <td style="padding:8px 0;">${guestEmail}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">체크인</td>
      <td style="padding:8px 0;font-weight:600;">${p.checkIn}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">체크아웃</td>
      <td style="padding:8px 0;font-weight:600;">${p.checkOut}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">숙박 기간</td>
      <td style="padding:8px 0;font-weight:600;">${p.nights}박</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">총 금액</td>
      <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">결제 완료 예약금 (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">잔금 (60%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.balanceAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">예약 상태</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">confirmed</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">확정 시각</td>
      <td style="padding:8px 0;">${confirmedFormatted} (파리 시간)</td>
    </tr>
  </table>

  <div style="margin:8px 0 24px;padding:12px 16px;background:#eafaf1;border-left:4px solid #27ae60;border-radius:4px;font-size:13px;color:#1e8449;">
    💳 ${balanceDueNote}
  </div>

  ${stripeSessionId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe Session</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripeSessionId}</span>
  </p>
  `
      : ""
    }

  ${stripePaymentIntentId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe PaymentIntent</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripePaymentIntentId}</span>
  </p>
  `
      : ""
    }

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#27ae60;">Payment Received — Booking Confirmed</h3>

  <p>
    The guest's deposit payment has been received and the booking status is now <strong>confirmed</strong>.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">Booking ID</td>
      <td style="padding:8px 0;font-size:12px;word-break:break-all;">${bookingId}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Guest name</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Guest email</td>
      <td style="padding:8px 0;">${guestEmail}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Check-in</td>
      <td style="padding:8px 0;font-weight:600;">${p.checkIn}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Check-out</td>
      <td style="padding:8px 0;font-weight:600;">${p.checkOut}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Nights</td>
      <td style="padding:8px 0;font-weight:600;">${p.nights}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Total price</td>
      <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Deposit paid (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Remaining balance (60%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.balanceAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Status</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">confirmed</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Confirmed at</td>
      <td style="padding:8px 0;">${confirmedFormatted} (Paris time)</td>
    </tr>
  </table>

  <div style="margin:8px 0 24px;padding:12px 16px;background:#eafaf1;border-left:4px solid #27ae60;border-radius:4px;font-size:13px;color:#1e8449;">
    💳 ${balanceDueNoteEn}
  </div>

  ${stripeSessionId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe Session</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripeSessionId}</span>
  </p>
  `
      : ""
    }

  ${stripePaymentIntentId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe PaymentIntent</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripePaymentIntentId}</span>
  </p>
  `
      : ""
    }

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    Admin notification email for booking payment confirmation.
  </p>

</div>`;

  return sendAdminEmail({
    subject,
    html,
  });
}