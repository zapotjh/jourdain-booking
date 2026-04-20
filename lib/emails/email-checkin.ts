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

  const whatsappLink = "https://wa.me/8210982488666";
  const whatsappQrSrc =
    "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" +
    encodeURIComponent(whatsappLink);

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
💬 WhatsApp
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;margin-top:14px;">
    WhatsApp으로도 문의하실 수 있습니다. 아래 QR 코드를 스캔하시거나 링크를 눌러 주세요.
  </p>
  <p style="margin:10px 0 12px 0;">
    <a href="${escapeHtml(whatsappLink)}" style="color:#1a73e8;word-break:break-all;">${escapeHtml(whatsappLink)}</a>
  </p>
  <img
    src="${escapeHtml(whatsappQrSrc)}"
    alt="WhatsApp QR"
    width="240"
    height="240"
    style="display:block;width:240px;height:240px;border-radius:10px;border:1px solid #eee;background:#fff;"
  />

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🚪 체크아웃
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    체크아웃 시간은 오전 11시입니다.
  </p>

  <div style="margin:18px 0 0 0;padding:14px 14px;border:1px solid #eee;border-radius:10px;background:#fafafa;">
    <p style="margin:0 0 10px 0;"><strong>퇴실전 필수 체크사항</strong></p>
    <ol style="margin:0 0 10px 18px;padding:0;">
      <li>히터 모두 끄기</li>
      <li>조명 모두 끄기</li>
      <li>창문을 모두 닫아주세요.<br/><span style="color:#555;">*창문을 닫지 않아 벌레가 들어오거나 도난이 발생하면 문제가 됩니다.</span></li>
      <li>쓰레기는 건물 뒤쪽 마당의 쓰레기통에 버려 주세요.<br/><span style="color:#555;">초록색: 일반 쓰레기 / 노랑뚜껑: 재활용 쓰레기</span></li>
    </ol>
    <p style="margin:12px 0 8px 0;"><strong>퇴실 시</strong></p>
    <ol style="margin:0 0 0 18px;padding:0;">
      <li>열쇠를 다시 키박스에 넣어 주세요</li>
      <li>코드: 3851</li>
      <li>네 개의 자물쇠 숫자를 섞어 주세요</li>
    </ol>
  </div>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📸 인스타그램
━━━━━━━━━━━━━━━━━━━
  </h3>
  <p style="font-size:14px;color:#555;">
    @lapt.Jourdain 태그해서<br/>
    파리 생활을 올려주세요!<br/>
    소중한 기록들을 계정에서 함께 나누고 싶습니다 :)
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

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;margin-top:16px;">WhatsApp</h3>

  <p style="font-size:14px;color:#555;margin-top:14px;">
    WhatsApp으로도 문의하실 수 있습니다. 아래 QR 코드를 스캔하시거나 링크를 눌러 주세요.
  </p>
  <p style="font-size:14px;color:#555;">
    You can also reach us on WhatsApp. Scan the QR code below or open the link.
  </p>

  <p style="margin:10px 0 12px 0;">
    <a href="${escapeHtml(whatsappLink)}" style="color:#1a73e8;word-break:break-all;">${escapeHtml(whatsappLink)}</a>
  </p>
  <img
    src="${escapeHtml(whatsappQrSrc)}"
    alt="WhatsApp QR"
    width="240"
    height="240"
    style="display:block;width:240px;height:240px;border-radius:10px;border:1px solid #eee;background:#fff;"
  />

  <h3 style="color:#2c3e50;margin-top:24px;">CHECK-OUT</h3>

  <p style="font-size:14px;color:#555;">
    Check-out time is <strong>11:00 AM</strong>.
  </p>

  <div style="margin:18px 0 0 0;padding:14px 14px;border:1px solid #eee;border-radius:10px;background:#fafafa;">
    <p style="margin:0 0 10px 0;"><strong>Required checklist before leaving</strong></p>
    <ol style="margin:0 0 10px 18px;padding:0;">
      <li>Turn off all heaters</li>
      <li>Turn off all lights</li>
      <li>Please close all windows.<br/><span style="color:#555;">*If windows are left open, insects may enter or theft may occur, which can cause issues.</span></li>
      <li>Please dispose of trash in the bins in the backyard behind the building.<br/><span style="color:#555;">Green: general waste / Yellow lid: recycling</span></li>
    </ol>
    <p style="margin:12px 0 8px 0;"><strong>At check-out</strong></p>
    <ol style="margin:0 0 0 18px;padding:0;">
      <li>Please return the key to the key box</li>
      <li>Code: 3851</li>
      <li>Scramble the four dials after locking</li>
    </ol>
  </div>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📸 Instagram
━━━━━━━━━━━━━━━━━━━
  </h3>
  <p style="font-size:14px;color:#555;">
    Tag us at <strong>@lapt.Jourdain</strong><br/>
    and share your Paris life!<br/>
    We'd love to feature your moments on our page :)
  </p>

  <p style="font-size:14px;color:#555;">
    Thank you and we hope you enjoy your stay in Paris :)
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    This is an automated check-in email from L'appartement Jourdain.
  </p>

  <p style="font-size:13px;color:#666;margin:14px 0 0 0;">
    <strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong>
  </p>
  <p style="font-size:13px;color:#666;margin:6px 0 0 0;">
    For any questions, replying directly to this email is the fastest way to reach us.
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

