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
  /** Accommodation balance (60%) only (not including refundable security deposit). */
  accommodationBalanceAmountEur: string;
  securityDepositAmountEur?: string;
  /** Total charged at balance time (accommodation balance + security deposit), for display. */
  totalChargedAmountEur?: string;
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
    "잔금 결제 완료 안내 | Balance Payment Confirmed";

  const hasSecurityDeposit =
    !!(p.securityDepositAmountEur && p.securityDepositAmountEur.length > 0);
  const totalChargedNowEur =
    (p.totalChargedAmountEur && p.totalChargedAmountEur.length > 0)
      ? p.totalChargedAmountEur
      : p.accommodationBalanceAmountEur;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <div style="padding:18px 18px;border-radius:12px;background:#f2fbf5;border:1px solid #e6f4ea;">
    <h2 style="color:#1f6f3a;margin:0;">잔금 결제 완료 안내 | Balance Payment Confirmed</h2>
    <p style="margin:12px 0 0 0;color:#2c3e50;font-size:14px;">
      안녕하세요, <strong>${guestName}</strong>님 :)
    </p>
    <p style="margin:10px 0 0 0;color:#2c3e50;font-size:14px;">
      ${hasSecurityDeposit ? "잔금 및 보증금 결제가 정상적으로 완료되었습니다." : "잔금 결제가 정상적으로 완료되었습니다."}<br/>
      이제 예약에 대한 모든 결제가 완료되어, 예약이 최종 확정되었습니다.
    </p>
  </div>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;margin:0;">예약 정보 | Booking Details</h3>

  <table style="width:100%;border-collapse:collapse;margin:14px 0 0 0;">
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
  </table>

  <div style="margin:18px 0 0 0;padding:16px 16px;border-radius:12px;background:#fafafa;border:1px solid #eee;">
    <h3 style="color:#2c3e50;margin:0 0 10px 0;">결제 내역 | Payment Summary</h3>
    <table style="width:100%;border-collapse:collapse;margin:0;">
      <tr>
        <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">총 숙박 금액</td>
        <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">예약금 (40%) — 이미 결제됨</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">잔금 (60%)</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.accommodationBalanceAmountEur}</td>
      </tr>
      ${
        hasSecurityDeposit
          ? `
      <tr>
        <td style="padding:8px 0;color:#555;">환불 보증금</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.securityDepositAmountEur}</td>
      </tr>`
          : ""
      }
    </table>

    <div style="margin:14px 0 0 0;padding:12px 12px;border-radius:10px;background:#ffffff;border:1px solid #eee;">
      <p style="margin:0;font-size:14px;color:#2c3e50;font-weight:700;">
        이번 결제 금액: €${totalChargedNowEur}
      </p>
      ${
        hasSecurityDeposit
          ? `<p style="margin:6px 0 0 0;font-size:13px;color:#666;">(잔금 €${p.accommodationBalanceAmountEur} + 보증금 €${p.securityDepositAmountEur})</p>`
          : ""
      }
    </div>
  </div>

  ${
    hasSecurityDeposit
      ? `
  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;margin:0;">보증금 환불 안내 | Security Deposit</h3>

  <p style="margin:12px 0 0 0;font-size:14px;color:#555;">
    환불 보증금 €${p.securityDepositAmountEur}은 체크아웃 후 최대 3-5일 이내,<br/>
    숙소 상태 확인 후 문제가 없을 경우 전액 환불됩니다.
  </p>
`
      : ""
  }

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;margin:0;">체크인 안내 | Check-in</h3>
  <p style="margin:12px 0 0 0;font-size:14px;color:#555;">
    체크인 하루 전에 셀프 체크인 안내 메일이 발송됩니다.
  </p>

  <hr style="margin:26px 0;border:none;border-top:1px solid #eee;" />

  <h2 style="color:#1f6f3a;margin:0;">Balance Payment Confirmed</h2>
  <p style="margin:12px 0 0 0;color:#2c3e50;font-size:14px;">
    Hello, <strong>${guestName}</strong> :)
  </p>
  <p style="margin:10px 0 0 0;color:#2c3e50;font-size:14px;">
    ${hasSecurityDeposit ? "Your balance payment and security deposit were successfully processed." : "Your balance payment was successfully processed."}<br/>
    Your booking is now fully confirmed.
  </p>

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;margin:0;">Booking Details</h3>
  <table style="width:100%;border-collapse:collapse;margin:14px 0 0 0;">
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
  </table>

  <div style="margin:18px 0 0 0;padding:16px 16px;border-radius:12px;background:#fafafa;border:1px solid #eee;">
    <h3 style="color:#2c3e50;margin:0 0 10px 0;">Payment Summary</h3>
    <table style="width:100%;border-collapse:collapse;margin:0;">
      <tr>
        <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Total accommodation</td>
        <td style="padding:8px 0;font-weight:600;border-top:1px solid #eee;">€${p.totalPriceEur}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Deposit (40%) — already paid</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.depositAmountEur}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#555;">Balance (60%)</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.accommodationBalanceAmountEur}</td>
      </tr>
      ${
        hasSecurityDeposit
          ? `
      <tr>
        <td style="padding:8px 0;color:#555;">Refundable security deposit</td>
        <td style="padding:8px 0;font-weight:600;color:#27ae60;">€${p.securityDepositAmountEur}</td>
      </tr>`
          : ""
      }
    </table>

    <div style="margin:14px 0 0 0;padding:12px 12px;border-radius:10px;background:#ffffff;border:1px solid #eee;">
      <p style="margin:0;font-size:14px;color:#2c3e50;font-weight:700;">
        Charged this time: €${totalChargedNowEur}
      </p>
      ${
        hasSecurityDeposit
          ? `<p style="margin:6px 0 0 0;font-size:13px;color:#666;">(Balance €${p.accommodationBalanceAmountEur} + Deposit €${p.securityDepositAmountEur})</p>`
          : ""
      }
    </div>
  </div>

  ${
    hasSecurityDeposit
      ? `
  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;margin:0;">Security Deposit</h3>
  <p style="margin:12px 0 0 0;font-size:14px;color:#555;">
    The refundable security deposit (€${p.securityDepositAmountEur}) will be fully refunded after check-out, within 3-5 business days,
    if no issues are found during the inspection.
  </p>
`
      : ""
  }

  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;margin:0;">Check-in</h3>
  <p style="margin:12px 0 0 0;font-size:14px;color:#555;">
    Self check-in instructions will be sent one day before arrival.
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    L'appartement Jourdain — 잔금 결제 완료 안내
  </p>

  <p style="font-size:13px;color:#666;margin:14px 0 0 0;">
    <strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong>
  </p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">
    For any questions, replying directly to this email is the fastest way to reach us.
  </p>

</div>`;

  return sendEmail({
    to: p.to,
    subject,
    html,
    recipientType: "guest",
  });
}
