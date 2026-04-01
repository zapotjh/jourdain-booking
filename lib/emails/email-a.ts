// Email A — Booking request received (customer)
// Trigger: after POST /api/request-booking succeeds

import { sendEmail } from "./mailer";

export interface EmailAParams {
  to: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPriceEur: string; // formatted: "1050.00"
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendEmailA(p: EmailAParams) {
  const guestName = escapeHtml(p.guestName);

  const subject =
    "[예약 요청 접수] 승인 대기 중 - L'appartement Jourdain, Paris";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">예약 요청이 접수되었습니다</h2>

  <p>안녕하세요, <strong>${guestName}</strong>님</p>

  <p>
    파리 <strong>L'appartement Jourdain</strong> 예약 요청이 정상적으로 접수되었습니다.<br/>
    현재 호스트의 검토 및 승인을 기다리고 있습니다.
  </p>

  <p style="color:#c0392b;font-weight:600;">
    ⚠️ 이 메일은 예약 확정이 아닙니다.<br/>
    호스트 승인 후 결제 링크가 별도로 발송됩니다.
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
  </table>

  <p>
    호스트가 예약 요청을 검토한 후 승인 여부를 안내드립니다.<br/>
    승인되면 보증금(총 금액의 40%) 결제 링크가 이메일로 발송됩니다.
  </p>

  <p>
    감사합니다 🙏
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;">Booking Request Received</h3>

  <p>Dear <strong>${guestName}</strong>,</p>

  <p>
    Your booking request for <strong>L'appartement Jourdain</strong> in Paris has been received.<br/>
    It is currently awaiting host review and approval.
  </p>

  <p style="color:#c0392b;font-weight:600;">
    ⚠️ This email is NOT a booking confirmation.<br/>
    A payment link will be sent only after the host approves your request.
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
  </table>

  <p>
    Once the host approves your request, you will receive a payment link for the 40% deposit.
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <p style="font-size:12px;color:#aaa;">
    This is an automated email regarding your booking request.
  </p>

  <p style="font-size:13px;color:#666;margin:14px 0 0 0;">
    문의사항이 있으시면 이 이메일에 그대로 답장해주시는 것이 가장 빠릅니다.
  </p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">
    For any questions, replying directly to this email is the fastest way to reach us.
  </p>

</div>
`;

  return sendEmail({
    to: p.to,
    subject,
    html,
    recipientType: "guest",
  });
}