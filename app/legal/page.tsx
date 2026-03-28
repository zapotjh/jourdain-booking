'use client';

import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';

/**
 * Legal Notice (Mentions légales) — public legal page. Presentational only. No API calls; no booking/payment logic.
 */
export default function LegalPage() {
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
      <AppHeaderWithBack titleKorean="법적 고지" titleEnglish="LEGAL NOTICE" />
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
            법적 고지 (Legal Notice / Mentions légales)
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(13, 8, 34, 0.7)' }}>최종 업데이트: 16 03 2026</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>1. 웹사이트 운영자</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>상호 또는 성명: Jihyun Lim</li>
            <li>법적 형태: 개인사업자</li>
            <li>주소: 314 rue des pyrenees, Paris, France</li>
            <li>이메일: apt.jourdain.paris@gmail.com</li>
            <li>전화번호: +82 10 9824 8666</li>
            <li>사업자 등록번호 / SIRET: 98807200500016</li>
            <li>출판 책임자(Directeur de la publication): Jihyun Lim</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>2. 웹사이트 정보</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>웹사이트명: L&apos;appartement Jourdain</li>
            <li>도메인: https://lappartementjourdain.com/</li>
            <li>서비스 내용: 파리 소재 가구 포함 개인 숙소의 중/장기 직접 예약 서비스</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>3. 호스팅 제공자</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>호스팅 제공자명: Vercel Inc.</li>
            <li>주소: 440 N Barranca Ave #4133, Covina, CA 91723, United States</li>
            <li>웹사이트: https://vercel.com/</li>
            <li>이메일 주소: privacy@vercel.com 또는 support@vercel.com</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>4. 기술 서비스 제공자</h2>
          <p style={{ margin: '0 0 4px' }}>
            본 웹사이트는 운영을 위해 다음과 같은 제3자 서비스를 사용할 수 있습니다.
          </p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>결제 처리: Stripe</li>
            <li>데이터베이스/백엔드: Supabase</li>
            <li>이메일 발송: Resend</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>5. 지적재산권</h2>
          <p style={{ margin: '0 0 16px' }}>
            본 웹사이트의 텍스트, 이미지, 로고, 디자인, 구조 및 기타 콘텐츠는 별도의 명시가 없는 한 운영자 또는 적법한
            권리자에게 권리가 있습니다. 사전 서면 허가 없이 복제, 배포, 수정 또는 상업적 이용을 할 수 없습니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>6. 책임 제한</h2>
          <p style={{ margin: '0 0 8px' }}>
            운영자는 웹사이트 정보의 정확성을 유지하기 위해 합리적인 노력을 기울입니다. 다만 기술적 오류, 누락, 일시적
            서비스 중단 또는 외부 서비스 제공자의 장애 등에 대해 절대적인 보증을 제공하지 않습니다.
          </p>
          <p style={{ margin: '0 0 16px' }}>
            본 웹사이트에서 제공되는 정보는 일반 안내를 위한 것이며, 예약 확정 시 적용되는 최종 조건은 이용약관 및 개별
            예약 내용에 따릅니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>7. 외부 링크</h2>
          <p style={{ margin: '0 0 16px' }}>
            본 웹사이트는 제3자 웹사이트 또는 서비스로 연결되는 링크를 포함할 수 있습니다. 운영자는 외부 사이트의
            콘텐츠, 정책 또는 운영에 대해 책임을 지지 않습니다.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>8. 준거법</h2>
          <p style={{ margin: '0 0 24px' }}>
            본 웹사이트 및 관련 분쟁은 적용 가능한 법령 및 본 웹사이트의 이용약관에 따라 해석됩니다.
          </p>

          {/* English */}
          <h1 style={{ margin: '32px 0 8px', fontSize: 18, fontWeight: 600, color: 'rgba(13, 8, 34, 0.9)' }}>
            Legal Notice (Mentions légales)
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(13, 8, 34, 0.7)' }}>Last updated: 16 March 2026</p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>1. Website Operator</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>Name / Business Name: Jihyun Lim</li>
            <li>Legal Form: Sole Proprietor</li>
            <li>Address: 314 rue des Pyrénées, Paris, France</li>
            <li>Email: apt.jourdain.paris@gmail.com</li>
            <li>Phone: +82 10 9824 8666</li>
            <li>Business Registration / SIRET Number: 98807200500016</li>
            <li>Publication Director (Directeur de la publication): Jihyun Lim</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>2. Website Information</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>Website Name: L&apos;appartement Jourdain</li>
            <li>Domain: https://lappartementjourdain.com/</li>
            <li>Service Description: Direct booking service for a furnished private apartment located in Paris for medium- and long-term stays.</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>3. Hosting Provider</h2>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>Hosting Provider: Vercel Inc.</li>
            <li>Address: 440 N Barranca Ave #4133, Covina, CA 91723, United States</li>
            <li>Website: https://vercel.com/</li>
            <li>Email: privacy@vercel.com or support@vercel.com</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>4. Technical Service Providers</h2>
          <p style={{ margin: '0 0 4px' }}>
            This website may use third-party service providers necessary for its operation, including:
          </p>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
            <li>Payment Processing: Stripe</li>
            <li>Database / Backend: Supabase</li>
            <li>Email Delivery: Resend</li>
          </ul>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>5. Intellectual Property</h2>
          <p style={{ margin: '0 0 16px' }}>
            Unless otherwise stated, the texts, images, logos, design, structure, and other content of this website are
            owned by the operator or the respective rights holders. They may not be reproduced, distributed, modified, or
            used for commercial purposes without prior written permission.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>6. Limitation of Liability</h2>
          <p style={{ margin: '0 0 8px' }}>
            The operator makes reasonable efforts to ensure that the information provided on this website is accurate and up
            to date. However, the operator does not guarantee the absence of technical errors, omissions, temporary service
            interruptions, or failures caused by third-party service providers.
          </p>
          <p style={{ margin: '0 0 16px' }}>
            Information provided on this website is for general informational purposes only. Final conditions applicable
            to a stay are those confirmed at the time of reservation in the Terms &amp; Conditions and the specific booking
            details.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>7. External Links</h2>
          <p style={{ margin: '0 0 16px' }}>
            This website may contain links to third-party websites or services. The operator is not responsible for the
            content, policies, or operation of such external websites.
          </p>

          <h2 style={{ margin: '20px 0 8px', fontSize: 16, fontWeight: 600 }}>8. Governing Law</h2>
          <p style={{ margin: 0 }}>
            This website and any disputes related to it shall be interpreted in accordance with applicable law and the
            Terms &amp; Conditions of this website.
          </p>
        </section>
      </main>
      <BottomTabBar active="home" />
    </div>
  );
}
