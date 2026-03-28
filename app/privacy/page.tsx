'use client';

import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';

/**
 * Privacy Policy — public legal page. Presentational only. No API calls; no booking/payment logic.
 */
export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#CAB1A4',
        color: 'rgba(13, 8, 34, 0.8)',
        paddingBottom: '55px',
        paddingTop: 42,
        position: 'relative',
      }}
    >
      <AppHeaderWithBack titleKorean="개인정보 방침" titleEnglish="PRIVACY POLICY" />
      <main
        style={{
          padding: '16px 16px 24px',
          boxSizing: 'border-box',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        <section
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(13, 8, 34, 0.8)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'rgba(13, 8, 34, 0.9)' }}>
            개인정보처리방침 (Privacy Policy)
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(13, 8, 34, 0.7)' }}>최종 업데이트: 13 03 2026</p>
          <p style={{ margin: '0 0 16px' }}>
            본 웹사이트 https://lappartementjourdain.com/는 예약 요청 접수 및 숙박 운영을 위해 필요한 최소한의 개인정보만
            처리합니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>1. 개인정보처리자</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보처리자(Data Controller)는 아래와 같습니다.</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>운영자/호스트: Jihyun Lim</li>
            <li>연락처 이메일: apt.jourdain.paris@gmail.com</li>
            <li>주소: 314 rue des pyrenees, Paris 75020, France</li>
            <li>웹사이트: https://lappartementjourdain.com/</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>2. 수집하는 개인정보</h2>
          <p style={{ margin: '0 0 4px' }}>본 웹사이트는 다음 정보를 수집할 수 있습니다.</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>이름</li>
            <li>이메일 주소</li>
            <li>전화번호</li>
            <li>예약 관련 정보(체크인/체크아웃 날짜, 숙박 기간, 예약 상태 등)</li>
            <li>결제 관련 제한적 정보(결제 상태, 결제 참조 정보)</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>
            <strong>중요:</strong> 결제는 Stripe를 통해 처리되며, 카드 번호 전체와 같은 민감한 결제 정보는 당사 서버에
            저장되지 않습니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>3. 개인정보 처리 목적</h2>
          <p style={{ margin: '0 0 4px' }}>수집한 개인정보는 다음 목적에 한해 사용됩니다.</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>예약 요청 접수 및 관리</li>
            <li>게스트와의 연락 및 고객지원</li>
            <li>결제 처리 및 결제 상태 확인</li>
            <li>예약 확인, 승인, 체크인 안내, 잔금 결제 안내 등 운영상 필요한 이메일 발송</li>
            <li>법적 의무 이행 및 분쟁 대응</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>4. 처리의 법적 근거</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보 처리는 다음 법적 근거에 따라 이루어집니다.</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>예약 요청 및 숙박 계약 이행을 위한 처리</li>
            <li>법적 의무 준수</li>
            <li>예약 운영, 고객지원, 서비스 안전성 확보를 위한 정당한 이익</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>5. 개인정보 수령자</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보는 필요한 범위에서 다음 수령자와 공유될 수 있습니다.</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>결제 처리업체: Stripe</li>
            <li>이메일 발송 서비스 제공업체: Resend</li>
            <li>웹사이트/호스팅/기술 서비스 제공업체: Vercel, Supabase</li>
            <li>법률상 요구가 있는 경우 관할 기관</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>당사는 개인정보를 판매하지 않습니다.</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>6. 보관 기간</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보는 처리 목적 달성에 필요한 기간 동안만 보관합니다.</p>
          <p style={{ margin: '0 0 4px' }}>일반적으로:</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>예약 문의 및 예약 관련 정보: 예약 처리 및 사후 대응에 필요한 기간</li>
            <li>법적·회계적 의무와 관련된 정보: 관련 법령이 요구하는 기간</li>
            <li>분쟁 가능성이 있는 정보: 권리 보전 및 분쟁 대응에 필요한 기간</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>7. 국제 이전</h2>
          <p style={{ margin: '0 0 16px' }}>
            서비스 제공 과정에서 개인정보가 유럽경제지역(EEA) 외부의 서비스 제공업체에 의해 처리될 수 있습니다. 이 경우
            적용 가능한 개인정보 보호 법령에 따라 적절한 보호조치를 적용합니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>8. 정보주체의 권리</h2>
          <p style={{ margin: '0 0 4px' }}>이용자는 관련 법령에 따라 다음 권리를 가질 수 있습니다.</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>개인정보 열람권</li>
            <li>정정권</li>
            <li>삭제권</li>
            <li>처리 제한권</li>
            <li>처리 반대권</li>
            <li>데이터 이동권(법 applicable한 경우)</li>
            <li>감독기관에 불만 제기할 권리</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>
            프랑스 내 감독기관: CNIL (Commission Nationale de l&apos;Informatique et des Libertés)
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>9. 권리 행사 방법</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보 관련 요청은 아래 이메일로 보낼 수 있습니다.</p>
          <p style={{ margin: '0 0 8px' }}>apt.jourdain.paris@gmail.com</p>
          <p style={{ margin: '0 0 16px' }}>당사는 합리적인 기간 내에 관련 법령에 따라 응답합니다.</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>10. 쿠키 및 추적기술</h2>
          <p style={{ margin: '0 0 16px' }}>
            본 웹사이트는 기능 제공, 보안 유지, 성능 측정 등을 위해 제한적인 쿠키 또는 유사 기술을 사용할 수 있습니다.
            광고 목적의 추적 쿠키를 사용하는 경우, 필요한 경우 별도 고지 및 동의를 받습니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>11. 데이터 보안</h2>
          <p style={{ margin: '0 0 16px' }}>
            당사는 개인정보 보호를 위해 합리적인 기술적·관리적 조치를 취합니다. 다만 인터넷 전송 또는 전자 저장 방식이
            100% 안전함을 보장할 수는 없습니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>12. 문의</h2>
          <p style={{ margin: '0 0 4px' }}>개인정보 처리에 관한 문의는 아래로 연락해 주세요.</p>
          <p style={{ margin: '0 0 24px' }}>apt.jourdain.paris@gmail.com</p>

          {/* English */}
          <h1 style={{ margin: '32px 0 8px', fontSize: 18, fontWeight: 600, color: 'rgba(13, 8, 34, 0.9)' }}>
            Privacy Policy
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(13, 8, 34, 0.7)' }}>Last updated: 13 02 2026</p>
          <p style={{ margin: '0 0 16px' }}>
            This website https://lappartementjourdain.com/ processes only the minimum personal data necessary to manage
            booking requests and accommodation operations.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>1. Data Controller</h2>
          <p style={{ margin: '0 0 4px' }}>The Data Controller is: Jihyun Lim</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>Host / Operator: Jihyun Lim</li>
            <li>Contact email: apt.jourdain.paris@gmail.com</li>
            <li>Address: 314 rue des pyrenees, Paris 75020, France</li>
            <li>Website: https://lappartementjourdain.com/</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>2. Personal Data We Collect</h2>
          <p style={{ margin: '0 0 4px' }}>We may collect the following information:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Booking-related information (check-in/check-out dates, stay duration, reservation status, etc.)</li>
            <li>Limited payment-related information (payment status and payment reference information)</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>
            <strong>Important:</strong> Payments are processed through Stripe. Full card details and similar sensitive
            payment data are not stored on our servers.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>3. Purposes of Processing</h2>
          <p style={{ margin: '0 0 4px' }}>We use personal data only for the following purposes:</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>receiving and managing booking requests</li>
            <li>communicating with guests and providing support</li>
            <li>processing payments and verifying payment status</li>
            <li>sending operational emails such as booking confirmations, approval notices, check-in instructions, and balance payment notices</li>
            <li>complying with legal obligations and handling disputes</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>4. Legal Basis</h2>
          <p style={{ margin: '0 0 4px' }}>We process personal data on the following legal bases:</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>performance of a contract or steps prior to entering into a contract</li>
            <li>compliance with legal obligations</li>
            <li>legitimate interests in operating reservations, guest support, and service security</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>5. Recipients of Data</h2>
          <p style={{ margin: '0 0 4px' }}>Personal data may be shared, where necessary, with:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>payment processor: Stripe</li>
            <li>email delivery provider: Resend</li>
            <li>website / hosting / technical service providers: Vercel, Supabase</li>
            <li>competent authorities where required by law</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>We do not sell personal data.</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>6. Retention Period</h2>
          <p style={{ margin: '0 0 4px' }}>Personal data is retained only for as long as necessary for the purposes described above.</p>
          <p style={{ margin: '0 0 4px' }}>In general:</p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>booking inquiries and reservation information: for as long as needed to manage the stay and reasonable follow-up</li>
            <li>legally required records: for the period required by applicable law</li>
            <li>dispute-related information: for as long as reasonably necessary to protect legal rights</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>7. International Transfers</h2>
          <p style={{ margin: '0 0 16px' }}>
            In the course of providing the service, personal data may be processed by service providers located outside the
            European Economic Area (EEA). Where this occurs, appropriate safeguards are applied in accordance with
            applicable data protection law.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>8. Your Rights</h2>
          <p style={{ margin: '0 0 4px' }}>Under applicable law, you may have the right to:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>access your personal data</li>
            <li>rectify inaccurate data</li>
            <li>erase your data</li>
            <li>restrict processing</li>
            <li>object to processing</li>
            <li>receive your data in portable form, where applicable</li>
            <li>lodge a complaint with a supervisory authority</li>
          </ul>
          <p style={{ margin: '0 0 16px' }}>
            In France, the competent supervisory authority is: CNIL (Commission Nationale de l&apos;Informatique et des Libertés)
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>9. How to Exercise Your Rights</h2>
          <p style={{ margin: '0 0 4px' }}>You may send privacy-related requests to:</p>
          <p style={{ margin: '0 0 8px' }}>apt.jourdain.paris@gmail.com</p>
          <p style={{ margin: '0 0 16px' }}>We will respond within a reasonable period in accordance with applicable law.</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>10. Cookies and Tracking</h2>
          <p style={{ margin: '0 0 16px' }}>
            This website may use limited cookies or similar technologies for functionality, security, and performance
            measurement. If advertising or non-essential tracking cookies are used, notice and consent will be obtained
            where required.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>11. Data Security</h2>
          <p style={{ margin: '0 0 16px' }}>
            We take reasonable technical and organisational measures to protect personal data. However, no method of
            transmission over the Internet or electronic storage can be guaranteed to be completely secure.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>12. Contact</h2>
          <p style={{ margin: '0 0 4px' }}>For any privacy-related questions, please contact:</p>
          <p style={{ margin: 0 }}>apt.jourdain.paris@gmail.com</p>
        </section>
      </main>
      <BottomTabBar active="home" />
    </div>
  );
}
