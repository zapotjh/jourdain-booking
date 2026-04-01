// Email — Balance payment success (customer)
// Trigger: when automatic balance charge succeeds (cron charge-balance)

import { sendEmail } from "./mailer";

export interface EmailBalanceSuccessParams {
  to: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPriceEur: string;
  depositAmountEur: string;
  balanceAmountEur: string;
  securityDepositAmountEur?: string;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailBalanceSuccess(
  p: EmailBalanceSuccessParams,
) {
  const guestName = escapeHtml(p.guestName);

  const subject =
    "잔금 결제가 완료되었습니다 | Balance Payment Completed";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#27ae60;">잔금 결제가 완료되었습니다 | Balance Payment Completed</h2>

  <p>안녕하세요, <strong>${guestName}</strong>님 :)</p>

  <p>
    잔금 결제가 정상적으로 완료되었습니다.<br/>
    이제 예약 결제가 모두 완료되었습니다.
  </p>

  <p style="font-size:14px;color:#2c3e50;margin:14px 0 0 0;">
    보증금은 체크아웃 후 <strong>최대 48시간 이내</strong> 스태프가 숙소를 확인한 뒤 문제가 없을 경우
    <strong>100% 환불</strong>됩니다.
  </p>

  <p style="font-size:14px;color:#555;">
    체크인 하루 전에 셀프 체크인 안내 메일이 발송됩니다.
  </p>

  <h3 style="color:#2c3e50;margin-top:24px;">예약 정보</h3>

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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">총 금액</td>
      <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">예약금 (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">잔금 (60%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.balanceAmountEur}</td>
    </tr>
    ${
      p.securityDepositAmountEur
        ? `
    <tr>
      <td style="padding:8px 0;color:#555;">환불 보증금</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.securityDepositAmountEur}</td>
    </tr>`
        : ""
    }
  </table>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#27ae60;">Balance Payment Completed</h3>

  <p>Dear <strong>${guestName}</strong>,</p>

  <p>
    Your balance payment has been successfully completed.<br/>
    Your booking is now fully confirmed.
  </p>

  <p style="font-size:14px;color:#2c3e50;margin:14px 0 0 0;">
    After checkout, our staff will inspect the apartment within <strong>up to 48 hours</strong>. If no issues are found, the security
    deposit will be <strong>fully (100%) refunded</strong>.
  </p>

  <p style="font-size:14px;color:#555;">
    Self check-in instructions will be sent one day before arrival.
  </p>

  <h3 style="color:#2c3e50;margin-top:24px;">Booking details</h3>

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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Total price</td>
      <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Deposit (40%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Balance (60%)</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.balanceAmountEur}</td>
    </tr>
    ${
      p.securityDepositAmountEur
        ? `
    <tr>
      <td style="padding:8px 0;color:#555;">Refundable security deposit</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.securityDepositAmountEur}</td>
    </tr>`
        : ""
    }
  </table>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    L'appartement Jourdain — 잔금 결제 완료 안내
  </p>

</div>`;

  return sendEmail({
    to: p.to,
    subject,
    html,
    recipientType: "guest",
  });
}
