// Email A2 — New booking approval request (admin notification)
// Trigger: after POST /api/request-booking succeeds

import { sendAdminEmail } from "./mailer";

export interface EmailA2Params {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPriceEur: string;
  depositAmountEur: string;
  approvalToken: string;
  siteUrl: string;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailA2(p: EmailA2Params) {
  const bookingId = escapeHtml(p.bookingId);
  const guestName = escapeHtml(p.guestName);
  const guestEmail = escapeHtml(p.guestEmail);
  const guestPhone = escapeHtml(p.guestPhone ?? "-");
  const approvalToken = escapeHtml(p.approvalToken);

  const normalizedSiteUrl = p.siteUrl.replace(/\/+$/, "");
  const approveUrl = `${normalizedSiteUrl}/api/host/approve`;
  const approveOneClickUrl = `${normalizedSiteUrl}/api/host/approve?approval_token=${p.approvalToken}`;
  const rejectOneClickUrl = `${normalizedSiteUrl}/api/host/reject?approval_token=${p.approvalToken}`;

  const subject =
    "[관리자 알림] 새로운 예약 승인 요청 - L'appartement Jourdain, Paris";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">새로운 예약 승인 요청</h2>

  <p>
    새로운 예약 요청이 접수되었습니다.<br/>
    아래 내용을 확인한 후 <strong>승인하기</strong>를 클릭해 주세요.
  </p>

  <p style="margin:24px 0;">
    <a href="${approveOneClickUrl}" style="display:inline-block;padding:14px 28px;background:#27ae60;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">승인하기</a>
    <span style="margin-left:12px;"></span>
    <a href="${rejectOneClickUrl}" style="display:inline-block;padding:14px 28px;background:#95a5a6;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">거절하기</a>
  </p>
  <p style="font-size:12px;color:#666;">
    승인: <a href="${approveOneClickUrl}" style="color:#2980b9;word-break:break-all;">${approveOneClickUrl}</a><br/>
    거절: <a href="${rejectOneClickUrl}" style="color:#7f8c8d;word-break:break-all;">${rejectOneClickUrl}</a>
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">예약 ID</td>
      <td style="padding:8px 0;font-weight:600;font-size:12px;word-break:break-all;">${bookingId}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">게스트 이름</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">이메일</td>
      <td style="padding:8px 0;font-weight:600;">${guestEmail}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">전화번호</td>
      <td style="padding:8px 0;">${guestPhone}</td>
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
      <td style="padding:8px 0;color:#555;">총 금액</td>
      <td style="padding:8px 0;font-weight:600;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">예약금 (40%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.depositAmountEur}</td>
    </tr>
  </table>

  <p style="margin:16px 0;font-size:13px;color:#555;">
    승인 토큰:
    <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:12px;word-break:break-all;">${approvalToken}</code>
  </p>

  <p style="font-size:13px;color:#555;">
    승인 API 예시:
  </p>

  <pre style="background:#f7f7f7;padding:12px 14px;border-radius:8px;font-size:12px;overflow:auto;line-height:1.5;white-space:pre-wrap;word-break:break-word;margin:8px 0 24px 0;">curl -X POST ${approveUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"approval_token":"${approvalToken}"}'</pre>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;">New Booking Approval Request</h3>

  <p>
    A new booking request has been submitted.<br/>
    Please review the details below and click <strong>Approve</strong>.
  </p>

  <p style="margin:24px 0;">
    <a href="${approveOneClickUrl}" style="display:inline-block;padding:14px 28px;background:#27ae60;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Approve</a>
    <span style="margin-left:12px;"></span>
    <a href="${rejectOneClickUrl}" style="display:inline-block;padding:14px 28px;background:#95a5a6;color:#fff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Reject</a>
  </p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr>
      <td style="padding:8px 0;color:#555;">Booking ID</td>
      <td style="padding:8px 0;font-weight:600;font-size:12px;word-break:break-all;">${bookingId}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Guest name</td>
      <td style="padding:8px 0;font-weight:600;">${guestName}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Email</td>
      <td style="padding:8px 0;font-weight:600;">${guestEmail}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Phone</td>
      <td style="padding:8px 0;">${guestPhone}</td>
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
      <td style="padding:8px 0;color:#555;">Total price</td>
      <td style="padding:8px 0;font-weight:600;">€${p.totalPriceEur}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#555;">Deposit (40%)</td>
      <td style="padding:8px 0;font-weight:600;">€${p.depositAmountEur}</td>
    </tr>
  </table>

  <p style="font-size:13px;color:#555;">
    Approval token:
    <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:12px;word-break:break-all;">${approvalToken}</code>
  </p>

  <p style="font-size:13px;color:#555;">
    Approval endpoint: ${approveUrl}
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:13px;color:#666;">
    <strong>L'appartement Jourdain</strong><br/>
    314 rue des Pyrénées<br/>
    75020 Paris, France
  </p>

  <p style="font-size:12px;color:#aaa;">
    Admin notification email for booking approval workflow.
  </p>

</div>`;

  return sendAdminEmail({
    subject,
    html,
  });
}