// Email — Check-in reminder / self check-in information
// Trigger: 1 day before check-in (cron)

import { sendEmail } from "./mailer";

export interface EmailCheckinParams {
  to: string;
  guestName: string;
  checkIn: string; // YYYY-MM-DD
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailCheckinHtml(p: { guestName: string; checkIn: string }) {
  const safeName = escapeHtml(p.guestName || "게스트");
  const safeCheckIn = escapeHtml(p.checkIn);

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">체크인 안내 | Self Check-in Information</h2>

  <p>안녕하세요, <strong>${safeName}</strong>님 :)</p>

  <p>
    곧 파리 숙박이 시작됩니다.<br/>
    도착을 위한 셀프 체크인 안내입니다.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🕒 체크인
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    체크인은 오후 3시 이후 가능합니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>첫 번째 출입문 코드</strong><br/>
    B5791
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>열쇠 박스 위치</strong><br/>
    아파트 층에서<br/>
    반층 아래 (3.5층)<br/>
    창문 옆 벽에 있습니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>열쇠박스 코드</strong><br/>
    3851
  </p>

  <p style="font-size:14px;color:#555;">
    열쇠를 꺼낸 후<br/>
    네 개의 자물쇠 숫자를 섞어 주세요.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>아파트</strong><br/>
    4층까지 올라오시면<br/>
    파란색 체크 도어매트가 있는 문이 아파트입니다.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
⚠️ 이용 시 부탁드립니다
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    외출 시 아래 사항을 확인해 주세요
  </p>

  <ul style="font-size:14px;color:#555;padding-left:20px;margin:8px 0 16px 0;">
    <li>히터는 꺼두거나 낮게 조절</li>
    <li>창문은 항상 닫기</li>
    <li>조명은 끄기</li>
  </ul>

  <p style="font-size:14px;color:#555;">
    창문을 열어 두면 개미나 벌레가 들어올 수 있습니다.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🚪 체크아웃
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    체크아웃 시간은 오전 11시입니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>퇴실 시</strong><br/>
    1️⃣ 열쇠를 다시 키박스에 넣어 주세요<br/>
    2️⃣ 코드: 3851<br/>
    3️⃣ 네 개의 자물쇠 숫자를 섞어 주세요
  </p>

  <p style="font-size:14px;color:#555;">
    쓰레기는 청소팀이 처리합니다.<br/>
    음식물 쓰레기가 있다면 건물 뒤쪽 마당의 쓰레기통에 버려 주세요.
  </p>

  <p style="font-size:14px;color:#555;">
    감사합니다 :)<br/>
    파리에서 즐거운 시간 보내시길 바랍니다!
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:14px;color:#555;">
    Hello :)
  </p>

  <p style="font-size:14px;color:#555;">
    Your stay in Paris is coming soon.<br/>
    Here is the self check-in information.
  </p>

  <h3 style="color:#2c3e50;margin-top:16px;">CHECK-IN</h3>

  <p style="font-size:14px;color:#555;">
    Check-in is available after 3:00 PM.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Building door code</strong><br/>
    B5791
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Key box location</strong><br/>
    Half stair down from the apartment (3.5 floor)<br/>
    Next to the window.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Key box code</strong><br/>
    3851
  </p>

  <p style="font-size:14px;color:#555;">
    After taking the key, please shuffle the four lock numbers.
  </p>

  <p style="font-size:14px;color:#555;">
    The apartment is on the 4th floor<br/>
    with a blue check doormat.
  </p>

  <h3 style="color:#2c3e50;margin-top:24px;">IMPORTANT</h3>

  <p style="font-size:14px;color:#555;">
    When leaving the apartment please make sure
  </p>

  <ul style="font-size:14px;color:#555;padding-left:20px;margin:8px 0 16px 0;">
    <li>heaters are turned off or set low</li>
    <li>windows are closed</li>
    <li>lights are turned off</li>
  </ul>

  <p style="font-size:14px;color:#555;">
    Leaving windows open may allow insects to enter.
  </p>

  <h3 style="color:#2c3e50;margin-top:24px;">CHECK-OUT</h3>

  <p style="font-size:14px;color:#555;">
    Check-out time is 11:00 AM.
  </p>

  <p style="font-size:14px;color:#555;">
    Please return the keys to the key box (3.5 floor wall)<br/>
    Code: 3851
  </p>

  <p style="font-size:14px;color:#555;">
    Please shuffle the four lock numbers again.
  </p>

  <p style="font-size:14px;color:#555;">
    Thank you and we hope you enjoy your stay in Paris :)
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    This is an automated check-in email from L'appartement Jourdain.
  </p>

</div>
`;
}

export async function sendEmailCheckin(p: EmailCheckinParams) {
  const subject = "체크인 안내 | Self Check-in Information";

  const html = buildEmailCheckinHtml({
    guestName: p.guestName,
    checkIn: p.checkIn,
  });

  return sendEmail({
    to: p.to,
    subject,
    html,
    recipientType: "guest",
  });
}

