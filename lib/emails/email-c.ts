// Email C — Booking confirmed / deposit paid (customer)
// Trigger: after Stripe deposit payment webhook (checkout.session.completed)

import { sendEmail } from "./mailer";

export interface EmailCParams {
  to: string;
  guestName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  longStay: boolean;
  totalPriceEur: string;
  depositAmountEur: string;
  balanceAmountEur: string;
  stripeSessionId?: string | null;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmailC(p: EmailCParams) {
  const guestName = escapeHtml(p.guestName);

  const subject =
    "파리 숙소 예약이 확정되었습니다 | Your Paris Stay is Confirmed";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;line-height:1.7;">

  <h2 style="color:#2c3e50;">파리 숙소 예약이 확정되었습니다 | Your Paris Stay is Confirmed</h2>

  <p>안녕하세요, <strong>${guestName}</strong>님 :)</p>

  <p>
    저희 아파트를 예약해 주셔서 감사합니다.<br/>
    예약이 정상적으로 확정되었습니다.<br/>
    파리에서의 즐거운 시간을 보내시길 바랍니다.
  </p>

  <p>
    아래는 숙박에 필요한 기본 정보입니다.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📍 주소
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    314 rue des Pyrenees<br/>
    75020 Paris
  </p>

  <ul style="font-size:14px;color:#555;padding-left:20px;margin:8px 0 16px 0;">
    <li>프랑스식 기준 4층 (엘리베이터 없음 / 계단)</li>
    <li>건물 내 전용 주차장은 없습니다</li>
  </ul>

  <p style="font-size:14px;color:#555;">
    <strong>Address</strong><br/>
    314 rue des Pyrenees<br/>
    75020 Paris
  </p>

  <ul style="font-size:14px;color:#555;padding-left:20px;margin:8px 0 16px 0;">
    <li>4th floor (French building style – stairs)</li>
    <li>No private parking inside the building</li>
  </ul>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🚇 교통
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    <strong>지하철</strong><br/>
    11호선 Jourdain 역 도보 3분
  </p>

  <p style="font-size:14px;color:#555;">
    CDG 공항에서 오시는 경우 택시 앱 이용을 추천드립니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>추천 앱</strong><br/>
    • Uber<br/>
    • Bolt<br/>
    • G7 (파리 공식 택시)
  </p>

  <p style="font-size:14px;color:#555;">
    공항에서 미리 예약하지 않았거나 택시 정류장이 아닌 곳에서 접근하는 운전자는 피하시는 것을 추천드립니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Transportation</strong><br/>
    Metro<br/>
    Line 11 – Jourdain station (3 min walk)
  </p>

  <p style="font-size:14px;color:#555;">
    From CDG Airport we recommend using taxi apps:
  </p>

  <p style="font-size:14px;color:#555;">
    • Uber<br/>
    • Bolt<br/>
    • G7 (official Paris taxi – recommended)
  </p>

  <p style="font-size:14px;color:#555;">
    We recommend avoiding drivers approaching passengers directly in the airport unless you booked in advance.
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
    체크인 전날 셀프 체크인 안내를 보내드립니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Check-in</strong><br/>
    Self check-in is available after 3:00 PM.
  </p>

  <p style="font-size:14px;color:#555;">
    A detailed self check-in guide will be sent the day before arrival.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📶 와이파이
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    네트워크: Livebox-E500<br/>
    비밀번호: GmXrNpdmSGtL3HRFqR
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Wi-Fi</strong><br/>
    Network: Livebox-E500<br/>
    Password: GmXrNpdmSGtL3HRFqR
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🍽 주방 안내
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    접시는 소파 옆 빌트인 수납장 안에 있습니다.<br/>
    왼쪽에서 오른쪽으로 여는 방식입니다.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Kitchen note</strong><br/>
    Plates are stored inside the built-in cabinet next to the sofa.<br/>
    The cabinet opens from left to right.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🏡 아파트 이용 안내
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    아파트에 있는 가구, 프린트, 세라믹 오브제들은<br/>
    제가 오랜 시간 모아온 컬렉션입니다.
  </p>

  <p style="font-size:14px;color:#555;">
    파손이나 손상이 없도록 조심히 사용 부탁드립니다 🙏🏼
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Apartment care</strong><br/>
    The furniture, prints and ceramic objects in the apartment<br/>
    are pieces I collected over many years.
  </p>

  <p style="font-size:14px;color:#555;">
    Please help us keep them in good condition.
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🛒 동네 마켓 가이드
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    <strong>🥖 빵집</strong><br/>
    <strong>Artisan Boulanger</strong><br/>
    304 rue des Pyrénées, 75020<br/>
    집에서 나와 왼쪽으로 1분. 크루아상과 바게트가 동네에서 가장 맛있는 곳.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🧀 치즈</strong><br/>
    <strong>Fromagerie Lefort</strong><br/>
    118 Rue de Belleville, 75020<br/>
    100종 이상의 셀렉션. 신선하고 가격도 좋음. 1-2가지 시식 가능.<br/>
    *주말엔 줄이 길어 평일 방문 추천.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🥩 햄 · 델리</strong><br/>
    <strong>O divine Epicerie</strong><br/>
    퀄리티 높은 햄과 구르메 식재료. 유기농 채소, 내추럴 와인 (특히 쥐라 지역).<br/>
    채소가게와 와인/햄 가게가 나란히 붙어있음.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🇮🇹 이탈리안 식재료</strong><br/>
    <strong>Vino Sfuso</strong><br/>
    5 Rue Jean-Baptiste Dumay, 75020<br/>
    절임채소, 생파스타, 소스 등 이탈리안 식재료 전문.<br/>
    드럼통에서 와인을 1병씩 소분. 병 가져가면 병값 할인.<br/><br/>
    <strong>Ciao Gnari Enoteca Italiana</strong><br/>
    333 rue des Pyrénées, 75020<br/>
    이탈리안 햄은 이곳이 최고. 수입 식재료와 와인도 다양.<br/>
    *브레이크 타임 있으니 구글맵에서 영업시간 확인 필수.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🍷 와인</strong><br/>
    <strong>Dix Vins de la Joie</strong><br/>
    Rue des Rigoles, 75020<br/>
    내추럴 와인 전문점 겸 와인바. 테이크아웃 가능. 영업 마감이 늦어서 좋음.<br/>
    선반 와인병의 흰 글씨가 테이크아웃 가격.<br/>
    *주말 광장 테라스는 이른 오후부터 만석.<br/><br/>
    <strong>Apertivus Belleville</strong><br/>
    117 Rue de Belleville, 75019 — 컨벤셔널 와인.<br/><br/>
    <strong>Nysa Cavistes</strong><br/>
    122 Rue de Belleville, 75020 — 컨벤셔널 와인.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🌸 꽃집</strong><br/>
    <strong>Nouvelle Ere</strong><br/>
    7 Rue du Jourdain, 75020<br/>
    감각적인 꽃집. *현금만 가능. 건너편 Crédit Agricole 또는 HSBC ATM 이용.<br/><br/>
    <strong>Morgan Page Fleurs</strong><br/>
    다양하고 가격 착함. 카드 가능. 주인 아주머니가 매우 친절하심.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🇯🇵 일본 식재료</strong><br/>
    <strong>Epicerie Umai-Jourdain</strong><br/>
    22 Rue de la Villette, 75019<br/>
    일본 식재료 전문점. 내추럴 와인도 함께 취급.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🍰 디저트</strong><br/>
    <strong>Patisserie de l&apos;Eglise</strong> — 고급 프렌치 파티세리.<br/><br/>
    <strong>Glaster</strong><br/>
    66 Rue de la Villette, 75019 — 수제 아이스크림 맛집.
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>🛒 슈퍼마켓</strong><br/>
    <strong>Franprix</strong> — 건물 바로 아래 오른쪽 옆건물. 가장 편리.<br/>
    322 rue des Pyrénées, 75020<br/><br/>
    <strong>Naturalia</strong> — 유기농.<br/>
    2 Rue du Jourdain, 75020<br/><br/>
    <strong>Bio C&apos;Bon</strong> — 유기농.<br/>
    341 rue des Pyrénées, 75020<br/><br/>
    <strong>Monoprix Belleville</strong> — 정육·생선 포함 고급 버전.<br/>
    133 Rue de Belleville, 75019
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>💊 약국</strong><br/>
    <strong>Pharmacie Principale de Belleville</strong> — 가장 가까운 약국. 화장품 및 약 취급.
  </p>

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
🍷 근처 레스토랑 &amp; 바 추천
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    <strong>Soces</strong><br/>
    프렌치 네오 비스트로<br/>
    32 Rue de la Villette, 75019<br/>
    *예약 추천
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Cheval d'or</strong><br/>
    프렌치 네오 비스트로 스타일의 아시안 요리<br/>
    21 Rue de la Villette, 75019<br/>
    *예약 추천
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Mensae</strong><br/>
    프렌치 파인 다이닝<br/>
    23 Rue Melingue, 75019<br/>
    *예약 추천
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Barrio Meschica</strong><br/>
    정통 멕시칸 타코<br/>
    Fruit Rouge 마가리타 추천<br/>
    15 Rue de la Villette, 75019
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Le Baratin</strong><br/>
    프랑스 미식계에서 매우 존경받는 셰프 Raquel Carena의 레스토랑<br/>
    1987년부터 이어져온 클래식 프렌치 비스트로<br/>
    3 Rue Jouye-Rouve, 75020
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Le Grand Bol – Belleville</strong><br/>
    중식당<br/>
    7 Rue de la Présentation, 75011
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Aux Mandarins de Belleville</strong><br/>
    가성비 좋은 중식당<br/>
    테라스 있음 / 예약 없이 방문 가능<br/>
    12 Rue Jules Romains, 75019
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Supra</strong><br/>
    조지아 내추럴 와인 바<br/>
    12 Rue Jouye-Rouve, 75020
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>La Cale</strong><br/>
    내추럴 와인 바<br/>
    113 Rue de Belleville, 75019
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Dix Vins de la Joie</strong><br/>
    내추럴 와인 바<br/>
    80 Rue des Rigoles, 75020
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
☕ 카페
━━━━━━━━━━━━━━━━━━━
  </h3>

  <p style="font-size:14px;color:#555;">
    <strong>Mardi</strong><br/>
    29 Rue de la Villette, 75019
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>Bokbar</strong><br/>
    스칸디나비안 스타일 카페<br/>
    72 Rue Julien Lacroix, 75020
  </p>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
  <h3 style="color:#2c3e50;white-space:pre-line;">
━━━━━━━━━━━━━━━━━━━
📸 인스타그램
━━━━━━━━━━━━━━━━━━━
  </h3>
  <p style="font-size:14px;color:#555;">
    파리 생활을 기록하고 계신다면<br/>
    <strong>@lapt.Jourdain</strong> 태그해서 올려주세요!<br/>
    선택된 게시물은 계정에 소개될 수 있습니다 :)
  </p>
  <p style="font-size:14px;color:#555;">
    If you're sharing your Paris life online,<br/>
    tag us at <strong>@lapt.Jourdain</strong>!<br/>
    We'd love to feature your moments on our page :)
  </p>

  <p style="font-size:14px;color:#555;">
    <strong>문의사항이 있으시면 이 이메일에 그대로 답장을 눌러 이메일을 보내주세요.</strong>
  </p>

  <p style="font-size:14px;color:#555;">
    즐거운 파리 여행 되시길 바랍니다!
  </p>

  <p style="font-size:14px;color:#555;">
    For any questions, replying directly to this email is the fastest way to reach us.
  </p>

  <p style="font-size:14px;color:#555;">
    We hope you have a wonderful stay in Paris :)
  </p>

  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />

  <p style="font-size:12px;color:#aaa;">
    L'appartement Jourdain — 예약 확정 메일
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
