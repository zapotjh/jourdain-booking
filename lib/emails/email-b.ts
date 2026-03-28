// Email B — Deposit payment link (customer)
// Trigger: after POST /api/host/approve creates Stripe session

import { sendEmail } from "./mailer";

export interface EmailBParams {
  to: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  longStay: boolean;
  totalPriceEur: string;
  depositAmountEur: string;
  balanceAmountEur: string;
  checkoutUrl: string;
  expiresAt: string; // ISO string
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailB(p: EmailBParams) {
  const guestName = escapeHtml(p.guestName);
  const safeCheckoutUrl = escapeHtml(p.checkoutUrl);

  const subject =
    "[예약 승인] 보증금 결제 안내 - L'appartement Jourdain, Paris";

  const expiresFormatted = new Date(p.expiresAt).toLocaleString("ko-KR", {
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

  <h2 style="color:#2c3e50;">예약이 승인되었습니다 — 예약금을 결제해 주세요</h2>

  <p>안녕하세요, <strong>${guestName}</strong>님</p>

  <p>
    <strong>L'appartement Jourdain</strong> 예약 요청이 호스트에 의해 승인되었습니다.<br/>
    아래 버튼을 눌러 예약금(총 금액의 40%)을 결제해 주세요.<br/>
    예약금 결제가 완료되면 예약이 최종 확정됩니다.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
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
      <td style="padding:8px 0;color:#555;">총 금액</td>
      <td style="padding:8px 0;font-weight:600;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">지금 결제할 예약금 (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">잔금 (60%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.balanceAmountEur}</td>
    </tr>
  </table>

  <div style="margin:8px 0 24px;padding:12px 16px;background:#fef9e7;border-left:4px solid #f39c12;border-radius:4px;font-size:13px;color:#7d6608;">
    💳 ${balanceDueNote}
  </div>

  <p style="margin:0 0 18px 0;">
    결제는 Stripe의 보안 결제 시스템을 통해 처리됩니다.
  </p>

  <a href="${safeCheckoutUrl}"
     style="display:inline-block;background:#2c3e50;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;margin-bottom:24px;">
    예약금 결제하기 — €${p.depositAmountEur}
  </a>

  <p style="font-size:13px;color:#c0392b;font-weight:600;">
    ⚠️ 결제 마감: ${expiresFormatted} (파리 시간)<br/>
    기한 내 결제가 완료되지 않으면 예약은 자동으로 취소됩니다.
  </p>

  <hr style="margin:40px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;">Booking Approved — Please Complete Your Deposit Payment</h3>

  <p>Dear <strong>${guestName}</strong>,</p>

  <p>
    Your booking request for <strong>L'appartement Jourdain</strong> has been approved by the host.<br/>
    Please use the button below to pay the deposit, which is 40% of the total booking amount.<br/>
    Your reservation will be confirmed once the deposit payment is successfully completed.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
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
      <td style="padding:8px 0;color:#555;">Total price</td>
      <td style="padding:8px 0;font-weight:600;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Due now — deposit (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Remaining balance (60%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.balanceAmountEur}</td>
    </tr>
  </table>

  <div style="margin:8px 0 24px;padding:12px 16px;background:#fef9e7;border-left:4px solid #f39c12;border-radius:4px;font-size:13px;color:#7d6608;">
    💳 ${balanceDueNoteEn}
  </div>

  <p style="margin:0 0 18px 0;">
    Payment is processed securely via Stripe.
  </p>

  <a href="${safeCheckoutUrl}"
     style="display:inline-block;background:#2c3e50;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;margin-bottom:24px;">
    Pay deposit — €${p.depositAmountEur}
  </a>

  <p style="font-size:13px;color:#c0392b;font-weight:600;">
    ⚠️ Payment deadline: ${expiresFormatted} (Paris time)<br/>
    If payment is not completed by the deadline, the reservation will be automatically cancelled.
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <p style="font-size:12px;color:#aaa;">
    This is an automated email regarding your approved booking and deposit payment.
  </p>

</div>`;

  return sendEmail({
    to: p.to,
    subject,
    html,
    recipientType: "guest",
  });
}