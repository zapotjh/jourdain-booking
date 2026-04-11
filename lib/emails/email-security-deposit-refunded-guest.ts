// Email — Security deposit refunded (customer)
// Trigger: after admin executes security deposit refund successfully

import { sendEmail } from "./mailer";

export interface EmailSecurityDepositRefundedGuestParams {
  to: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  securityDepositAmountEur: string;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailSecurityDepositRefundedGuest(
  p: EmailSecurityDepositRefundedGuestParams,
) {
  const guestName = escapeHtml(p.guestName);

  const subject = "보증금 환불 완료 안내 | Security Deposit Refunded";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">보증금 환불 완료 안내</h2>

  <p>안녕하세요, <strong>${guestName}</strong>님</p>

  <p>
    보증금 환불이 정상적으로 처리되었습니다.
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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">환불 금액</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.securityDepositAmountEur}</td>
    </tr>
  </table>

  <p style="font-size:13px;color:#666;">
    카드사/은행 처리 일정에 따라 환불 반영까지 영업일 기준 3–5일 정도 소요될 수 있습니다.
  </p>

  <hr style="margin:40px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;">Security Deposit Refunded</h3>

  <p>Dear <strong>${guestName}</strong>,</p>

  <p>
    Your security deposit refund has been successfully processed.
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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Refunded amount</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.securityDepositAmountEur}</td>
    </tr>
  </table>

  <p style="font-size:13px;color:#666;">
    Depending on your card issuer/bank, it may take 3–5 business days for the refund to appear.
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <p style="font-size:12px;color:#aaa;">
    This is an automated email regarding your security deposit refund.
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

