// Email — Security deposit refund request (admin)
// Trigger: after checkout, admin needs to manually refund security deposit

import { sendAdminEmail } from "./mailer";

export interface EmailSecurityDepositRefundRequestAdminParams {
  guestName: string;
  checkIn: string;
  checkOut: string;
  securityDepositAmountEur: string;
  refundLinkUrl: string;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailSecurityDepositRefundRequestAdmin(
  p: EmailSecurityDepositRefundRequestAdminParams,
) {
  const guestName = escapeHtml(p.guestName);
  const refundLinkUrl = escapeHtml(p.refundLinkUrl);

  const subject = "[관리자] 보증금 환불 요청 - L'appartement Jourdain";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">보증금 환불 요청 (관리자)</h2>

  <p>
    체크아웃 확인 후 아래 링크에서 <strong>보증금만</strong> 환불해 주세요.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">게스트</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">환불 보증금</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.securityDepositAmountEur}</td>
    </tr>
  </table>

  <a href="${refundLinkUrl}"
     style="display:inline-block;background:#2c3e50;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;margin-bottom:24px;">
    보증금 환불하기 — €${p.securityDepositAmountEur}
  </a>

  <p style="font-size:13px;color:#666;">
    링크는 환불 완료 전까지 여러 번 열 수 있습니다. 환불이 완료되면 더 이상 실행되지 않습니다.
  </p>

  <hr style="margin:40px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;">Security Deposit Refund Request (Admin)</h3>

  <p>
    After confirming check-out, please refund <strong>only the security deposit</strong> using the link below.
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">Guest</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
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
      <td style="padding:8px 0;color:#555;border-top:1px solid #eee;">Refundable security deposit</td>
      <td style="padding:8px 0;font-weight:600;color:#27ae60;border-top:1px solid #eee;">€${p.securityDepositAmountEur}</td>
    </tr>
  </table>

  <a href="${refundLinkUrl}"
     style="display:inline-block;background:#2c3e50;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;margin-bottom:24px;">
    Refund security deposit — €${p.securityDepositAmountEur}
  </a>

</div>`;

  return sendAdminEmail({ subject, html });
}

