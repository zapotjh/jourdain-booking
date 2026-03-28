// Email D2 — Balance payment failed (admin)
// Trigger: when automatic balance charge fails

import { sendAdminEmail } from "./mailer";

export interface EmailBalanceFailedAdminParams {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPriceEur: string;
  depositAmountEur: string;
  balanceAmountEur: string;
  attemptCount: number;
  failureReason?: string | null;
  stripeBalancePaymentIntentId?: string | null;
  /** When attemptCount === 3: balance payment link to forward to guest. */
  balancePaymentLinkUrl?: string | null;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailBalanceFailedAdmin(
  p: EmailBalanceFailedAdminParams,
) {
  const bookingId = escapeHtml(p.bookingId);
  const guestName = escapeHtml(p.guestName);
  const guestEmail = escapeHtml(p.guestEmail);
  const failureReason = p.failureReason ? escapeHtml(p.failureReason) : null;
  const stripeBalancePaymentIntentId = p.stripeBalancePaymentIntentId
    ? escapeHtml(p.stripeBalancePaymentIntentId)
    : null;

  const subject =
    "[관리자 알림] 예약 잔여금 자동결제 실패 - L'appartement Jourdain, Paris";

  const balanceLinkHtml =
    p.attemptCount === 3 && p.balancePaymentLinkUrl
      ? `
  <div style="margin:16px 0 24px;padding:16px;background:#fff3cd;border-left:4px solid #856404;border-radius:4px;">
    <p style="margin:0 0 8px;font-weight:600;color:#856404;">3회 모두 실패. 수동 취소 또는 고객에게 잔금결제 링크를 보내세요.</p>
    <p style="margin:0;"><a href="${escapeHtml(p.balancePaymentLinkUrl)}" style="color:#0d6efd;">잔금 결제 링크 (고객에게 전달)</a></p>
  </div>
  `
      : "";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#c0392b;">예약 잔여금 자동결제 실패 알림</h2>

  <p>
    자동 잔금 결제 시도가 실패했습니다. 24시간 내에 자동 재시도되며, 3회 시도 모두 실패 시 예약이 자동 취소됩니다. 아래 예약 정보를 확인해 주세요.
  </p>
  ${balanceLinkHtml}

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
      <td style="padding:8px 0;color:#555;">예약금 결제 완료</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">잔금 미결제</td>
      <td style="padding:8px 0;font-weight:600;color:#c0392b;">€${p.balanceAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">실패 횟수</td>
      <td style="padding:8px 0;font-weight:600;">${p.attemptCount}</td>
    </tr>
  </table>

  ${
    failureReason
      ? `
  <div style="margin:8px 0 24px;padding:12px 16px;background:#fdf2f2;border-left:4px solid #c0392b;border-radius:4px;font-size:13px;color:#7f1d1d;">
    실패 사유: ${failureReason}
  </div>
  `
      : ""
  }

  ${
    stripeBalancePaymentIntentId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe Balance PaymentIntent</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripeBalancePaymentIntentId}</span>
  </p>
  `
      : ""
  }

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#c0392b;">Balance Auto-Charge Failed</h3>

  <p>
    The automatic balance charge attempt has failed. It will be retried automatically within 24 hours; if all 3 attempts fail, the booking will be canceled automatically. Please review the booking details below.
  </p>
  ${
    p.attemptCount === 3 && p.balancePaymentLinkUrl
      ? `
  <div style="margin:16px 0 24px;padding:16px;background:#fff3cd;border-left:4px solid #856404;border-radius:4px;">
    <p style="margin:0 0 8px;font-weight:600;color:#856404;">All 3 attempts failed. Cancel manually or send the balance payment link to the guest.</p>
    <p style="margin:0;"><a href="${escapeHtml(p.balancePaymentLinkUrl)}" style="color:#0d6efd;">Balance payment link (forward to guest)</a></p>
  </div>
  `
      : ""
  }

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
      <td style="padding:8px 0;color:#555;">Deposit already paid</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Outstanding balance</td>
      <td style="padding:8px 0;font-weight:600;color:#c0392b;">€${p.balanceAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Attempt count</td>
      <td style="padding:8px 0;font-weight:600;">${p.attemptCount}</td>
    </tr>
  </table>

  ${
    failureReason
      ? `
  <div style="margin:8px 0 24px;padding:12px 16px;background:#fdf2f2;border-left:4px solid #c0392b;border-radius:4px;font-size:13px;color:#7f1d1d;">
    Failure reason: ${failureReason}
  </div>
  `
      : ""
  }

  ${
    stripeBalancePaymentIntentId
      ? `
  <p style="font-size:13px;color:#555;">
    <strong>Stripe Balance PaymentIntent</strong><br/>
    <span style="font-size:12px;word-break:break-all;">${stripeBalancePaymentIntentId}</span>
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
    Admin notification email for balance payment failure.
  </p>

</div>`;

  return sendAdminEmail({
    subject,
    html,
  });
}
