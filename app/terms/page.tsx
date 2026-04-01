'use client';

import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';

/**
 * Terms & Conditions — minimal placeholder so "약관보기" from checkout does not 404.
 * Presentational only. No API calls; no booking/payment logic.
 */
export default function TermsPage() {
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
      <AppHeaderWithBack titleKorean="전체 약관" titleEnglish="TERMS & CONDITIONS" />

      <main
        style={{
          padding: '16px 16px 24px',
          boxSizing: 'border-box',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        {/* Top row: title + policy/legal buttons */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.4,
              color: 'rgba(13, 8, 34, 0.9)',
            }}
          >
            전체 이용약관
          </h1>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 160,
            }}
          >
            <a
              href="/privacy"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 999,
                border: '1px solid rgba(13, 8, 34, 0.12)',
                background: 'rgba(255,255,255,0.18)',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(13, 8, 34, 0.9)',
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
            >
              <span>개인정보 방침 / Privacy policy</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>›</span>
            </a>
            <a
              href="/legal"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 999,
                border: '1px solid rgba(13, 8, 34, 0.12)',
                background: 'rgba(255,255,255,0.18)',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(13, 8, 34, 0.9)',
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
            >
              <span>법적 고지 / Legal notice</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>›</span>
            </a>
          </div>
        </header>

        <section
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(13, 8, 34, 0.8)',
          }}
        >
          {/* Korean Terms */}
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            전체 이용약관 (Korean)
          </h2>

          <h3 style={{ margin: '12px 0 4px', fontSize: 14, fontWeight: 600 }}>
            1. 숙소의 성격 및 기대치
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            본 숙소는 호텔이나 전문 민박업소가 아닌 호스트가 실제로 거주하던 개인 주거 공간을 일정 기간 공유하는
            형태의 숙소입니다. 따라서 상주 직원, 24시간 프론트 데스크, 룸서비스 등 호텔식 서비스는 제공되지 않습니다.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            건물의 구조, 시설, 주변 환경은 일반적인 호텔과 다를 수 있으며 파리의 오래된 주거 건물 특성이 반영될 수
            있습니다. 게스트는 본 숙소가 개인의 집(Home)이라는 점을 이해하고, 상호 존중을 기반으로 공간을 이용하는 것에
            동의합니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>2. 예약 조건</h3>
          <p style={{ margin: '0 0 4px' }}>단기 체류: 최소 2박 이상</p>
          <p style={{ margin: '0 0 4px' }}>장기 체류: 최소 28박 이상 ~ 최대 90박 이하</p>
          <p style={{ margin: '0 0 8px' }}>
            장기 체류(28박 이상)의 경우 프랑스 법률에 따른 단·장기임대(Bail mobilité) 형식의 계약서가 자동 생성되며
            예약 확정 시 전자서명으로 동의한 것으로 간주됩니다. 예약 확정 시, 본 이용약관 및 해당 계약서에 모두 동의한
            것으로 간주됩니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3. 결제 방식</h3>
          <p style={{ margin: '0 0 4px' }}>단기 체류:</p>
          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>예약 시: 총 숙박 요금의 40% 예약금 결제</li>
            <li>체크인 14일 전: 잔금 60% 자동 결제(완불)</li>
          </ul>
          <p style={{ margin: '8px 0 4px' }}>장기 체류:</p>
          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>예약 시: 총 숙박 요금의 40% 예약금 결제</li>
            <li>체크인 30일 전: 잔금 60% 자동 결제(완불)</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *모든 결제는 국제 공인 결제사를 통해 처리되며, 카드 정보는 저장되지 않습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            3-1. 잔금 자동 결제 및 재시도 정책
          </h3>
          <p style={{ margin: '0 0 4px' }}>
            잔금 결제는 예약 시 등록된 카드로 자동 결제됩니다. 카드 승인 실패, 한도 초과, 카드 만료 등으로 결제가
            실패할 경우 시스템은 최대 3회까지 자동 재시도를 진행합니다. 재시도는 약 24시간 간격으로 진행됩니다.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            3회 자동 결제가 모두 실패할 경우 자동 재시도는 중단되며, 게스트에게 수동 결제 링크(Stripe Secure Payment
            Link)가 제공될 수 있습니다. 지정된 기간 내 결제가 완료되지 않을 경우 예약은 취소될 수 있습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            3-2. 플랫폼 예약 관련 규정 (Airbnb 등 외부 플랫폼)
          </h3>
          <p style={{ margin: '0 0 4px' }}>
            본 숙소는 Airbnb 등 제3자 예약 플랫폼과 본 웹사이트를 통해 동시에 예약을 운영할 수 있습니다. 게스트는 어떤
            경로로 예약을 진행할지 자유롭게 선택할 수 있으며, 특정 플랫폼 이용이 강제되지 않습니다.
          </p>
          <p style={{ margin: '0 0 4px' }}>
            Airbnb 등 외부 플랫폼을 통해 이루어진 예약은 해당 플랫폼의 결제 시스템 및 정책(취소 정책, 환불 규정 등)을
            따릅니다. 본 웹사이트에서 직접 이루어진 예약은 본 이용약관(Terms &amp; Conditions)에 명시된 규정에 따라
            운영됩니다.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            플랫폼 예약과 직접 예약 간의 정책, 가격, 취소 규정 또는 결제 방식의 차이로 인해 발생하는 사항에 대해 호스트는
            책임을 지지 않습니다. 각 예약은 실제 결제가 이루어진 플랫폼 또는 웹사이트의 정책 및 결제 시스템에 따라
            독립적으로 처리됩니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            4. 취소 및 환불 정책
          </h3>
          <p style={{ margin: '0 0 4px' }}>단기 체류:</p>
          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>체크인 14일 전까지 취소: 전액 환불</li>
            <li>체크인 14~7일 전 취소: 예약금의 50% 환불</li>
            <li>체크인 7일 이내 취소 또는 노쇼(No-show): 환불 불가 (해당 시점에는 잔금 결제가 진행됩니다)</li>
          </ul>
          <p style={{ margin: '8px 0 4px' }}>장기 체류:</p>
          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>체크인 30일 전까지 취소: 전액 환불</li>
            <li>체크인 30일 이내 취소: 환불 불가</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *장기 예약은 일정이 확정되는 순간 해당 기간의 재판매가 사실상 어렵기 때문에 위 정책이 적용됩니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            4-1. 예약 가능 여부 및 중복 예약 방지
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            호스트는 여러 예약 플랫폼(Airbnb 등)과 본 웹사이트를 통해 예약을 관리하고 있으며, 예약 가능 일정은 최대한
            정확하게 유지되도록 관리됩니다. 다만 플랫폼 간 일정 동기화 지연 등의 이유로 드물게 동일한 날짜에 중복 예약이
            발생할 수 있습니다.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            이러한 경우 호스트는 해당 예약을 취소하고 전액 환불을 진행할 수 있습니다. 가능한 경우 호스트는 게스트가 대체
            숙소를 찾을 수 있도록 합리적인 범위 내에서 도움을 제공할 수 있습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5. 보증금 (Security Deposit)</h3>
          <p style={{ margin: '0 0 8px' }}>
            숙소 및 비품 보호를 위해 환불 보증금이 적용됩니다. 보증금은 <strong>숨겨진 추가 비용이 아니라</strong> 파손·분실
            등의 위험에 대비하기 위한 <strong>100% 환불 가능한 예치금</strong>입니다. 보증금은 <strong>체크인 전 잔금 결제 시</strong>{' '}
            잔금(60%)과 함께 청구되며, 체크아웃 후 파손·분실·과도한 오염 등이 없을 경우 <strong>전액 환불</strong>됩니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            5-1. 손상 및 추가 비용 청구
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            체크아웃 이후 숙소 또는 비품의 파손, 분실, 과도한 오염 등이 확인될 경우 실제 수리 또는 교체 비용이 보증금
            범위 내에서 청구될 수 있습니다. 손상 비용이 보증금 금액을 초과하는 경우 게스트는 추가 비용에 대해 책임을 질 수
            있습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>6. 하우스룰 (House Rules)</h3>
          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>조용한 시간: 22:00 – 08:00</li>
            <li>파티, 이벤트, 대규모 모임 금지</li>
            <li>숙소 내 흡연 금지</li>
            <li>반려동물 동반 불가</li>
            <li>예약된 인원 외 출입 금지</li>
            <li>숙소 및 비품은 본인의 집처럼 조심스럽게 사용</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *위 규정 위반 시 예약이 즉시 종료될 수 있으며, 환불은 제공되지 않습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            7. 하자 및 문제 발생 시 대응 (Maintenance &amp; Issue Handling)
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            호스트는 숙소가 정상적으로 이용 가능하도록 최선을 다합니다. 다만 개인 주거 공간의 특성상 예기치 못한 기술적
            문제(전기, 수도, 난방, 인터넷, 가전 등)가 발생할 수 있습니다.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-1. 신고 기한</h4>
          <p style={{ margin: '0 0 8px' }}>
            문제가 있을 경우 체크인 후 2시간 이내 고객지원 채널로 사진 또는 영상과 함께 알려주셔야 합니다.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-2. 기본 대응 절차</h4>
          <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>문제 확인</li>
            <li>가능한 경우 즉시 수리 또는 조치</li>
            <li>해결까지 일정 시간이 필요한 경우 임시 대안 제공 또는 부분 환불 검토</li>
          </ol>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-3. 인터넷(Wi-Fi) 문제</h4>
          <p style={{ margin: '0 0 4px' }}>문제 발생 시 우선 복구를 시도합니다.</p>
          <p style={{ margin: '0 0 4px' }}>
            복구가 지연될 경우, 모바일 데이터로 사용 가능한 eSIM(임시 인터넷)을 제공할 수 있습니다.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            Wi-Fi 장애로 인한 환불은 문제 지속 시간과 범위에 따라 부분 환불로 산정됩니다.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-4. 중대 하자</h4>
          <p style={{ margin: '0 0 8px' }}>
            아래와 같은 경우, 숙박이 사실상 불가능하다고 판단될 수 있습니다: 입실 불가, 전기/수도/난방 전체 중단,
            심각한 위생 문제. 이 경우 예약 취소 및 환불이 진행될 수 있습니다.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-5. 신고 기한 경과 시</h4>
          <p style={{ margin: '0 0 8px' }}>
            체크인 후 2시간이 경과한 뒤 접수된 사항은 도착 시점의 상태 확인이 어려워 조치 및 환불이 제한될 수 있습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>8. 청소 및 관리</h3>
          <p style={{ margin: '0 0 8px' }}>
            숙소는 체크인 전 전문 청소를 거쳐 제공됩니다. 장기 체류 중 정기 청소는 기본 제공되지 않으며, 필요 시 추가
            비용으로 요청할 수 있습니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>9. 책임의 한계</h3>
          <p style={{ margin: '0 0 8px' }}>
            게스트의 부주의로 발생한 사고, 분실, 도난에 대해 호스트는 책임을 지지 않습니다. 숙소 이용 중 발생하는 개인
            상해, 질병, 사고에 대한 책임은 게스트 본인에게 있습니다.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>9-1. 불가항력 (Force Majeure)</h4>
          <p style={{ margin: '0 0 8px' }}>
            천재지변, 정부 규제, 교통 마비, 전염병, 전쟁, 파업, 공공 서비스 중단 등 호스트의 통제를 벗어난 불가항력적
            상황으로 인해 숙박 제공이 어려워질 경우 호스트는 예약 취소 또는 일정 변경을 제안할 수 있습니다. 이 경우
            호스트는 가능한 범위 내에서 합리적인 해결 방안을 제공하기 위해 노력합니다.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>10. 분쟁 해결</h3>
          <p style={{ margin: '0 0 8px' }}>
            본 약관과 관련된 분쟁은 호스트의 거주국 법률을 따르며, 상호 협의를 통해 우선 해결하도록 합니다.
          </p>

          {/* English Terms */}
          <h2
            style={{
              margin: '24px 0 12px',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            📄 Long-Term Stay Terms &amp; Conditions (English)
          </h2>

          <h3 style={{ margin: '12px 0 4px', fontSize: 14, fontWeight: 600 }}>1. Nature of the Accommodation</h3>
          <p style={{ margin: '0 0 8px' }}>
            This property is not a hotel or serviced apartment. It is a private home formerly lived in by the host and temporarily
            shared with guests. No front desk, room service, or hotel-style services are provided. Guests agree to treat the space with
            care and mutual respect.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>2. Booking Conditions</h3>
          <p style={{ margin: '0 0 4px' }}>Short-term stays: Minimum stay of 2 nights.</p>
          <p style={{ margin: '0 0 4px' }}>Long-term stays: Minimum 28 nights, maximum 90 nights.</p>
          <p style={{ margin: '0 0 8px' }}>
            For long-term stays (28 nights or more), a rental agreement in the form of a French legally compliant furnished rental
            contract (Bail de location meublée / Bail mobilité) will be automatically generated. By confirming the reservation, the
            guest agrees to and electronically signs this contract. By confirming a reservation, the guest is deemed to have agreed to
            these Terms &amp; Conditions as well as the applicable rental contract.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3. Payment</h3>
          <p style={{ margin: '0 0 4px' }}>At booking: 40% deposit</p>
          <p style={{ margin: '0 0 4px' }}>30 days before check-in: Remaining 60% automatically charged</p>
          <p style={{ margin: '0 0 8px' }}>
            Payments are processed through an internationally recognized payment provider. Card details are not stored.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3-1. Balance Payment Retry Policy</h3>
          <p style={{ margin: '0 0 8px' }}>
            The remaining balance will be automatically charged to the card used at the time of booking. If the payment fails due to
            card issues such as insufficient funds, card expiration, or authorization failure, the system will automatically retry the
            charge up to three (3) times. Retry attempts are made approximately every 24 hours. If all three attempts fail, automatic
            retries will stop and the guest may receive a manual secure payment link via Stripe to complete the payment. If the balance
            remains unpaid within the specified period, the reservation may be cancelled.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            3-2. Platform Bookings (Airbnb or Other Third-Party Platforms)
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            This property may accept reservations both through third-party booking platforms such as Airbnb and through this website.
            Guests are free to choose their preferred booking channel, and no specific platform is required for making a reservation.
            Reservations made through external platforms such as Airbnb remain subject to the policies, payment systems, and
            cancellation rules of those platforms. Reservations made directly through this website are governed solely by the Terms &amp;
            Conditions described here. The host is not responsible for differences in pricing, policies, cancellation rules, or payment
            structures between platform bookings and direct bookings. Each reservation is processed independently according to the
            policies and payment systems of the platform or website through which the booking was completed.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>4. Cancellation &amp; Refund</h3>
          <p style={{ margin: '0 0 8px' }}>
            Cancel 30 days before check-in: Full refund. Cancel within 30 days: Non-refundable.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            4-1. Availability &amp; Double Booking Protection
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            Although the host carefully manages availability across platforms, rare situations may occur where overlapping reservations
            happen due to synchronization delays between booking systems. In such cases, the host reserves the right to cancel the
            reservation and provide a full refund to the affected guest. The host will make reasonable efforts to assist the guest in
            finding alternative accommodation if such a situation occurs.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5. Security Deposit</h3>
          <p style={{ margin: '0 0 8px' }}>
            A fully refundable security deposit applies to protect the property and its contents. This is <strong>not a hidden extra
            fee</strong>, but a <strong>100% refundable deposit</strong>. It will be charged together with the remaining balance before
            check-in, and fully refunded after checkout if no damage, loss, or excessive cleaning is identified.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5-1. Damage Charges</h3>
          <p style={{ margin: '0 0 8px' }}>
            If damage, loss, or excessive cleaning is identified after check-out, the host may charge the actual repair or replacement
            cost up to the security deposit amount. In cases where the damage exceeds the deposit amount, the guest may be responsible
            for the additional cost.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>6. House Rules</h3>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Quiet hours: 10 PM – 8 AM</li>
            <li>No parties or events</li>
            <li>No smoking</li>
            <li>No pets</li>
            <li>Only registered guests allowed</li>
            <li>Treat the home as your own</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>Violation may result in immediate termination without refund.</p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>7. Maintenance &amp; Issue Handling</h3>
          <p style={{ margin: '0 0 4px' }}>
            Please notify the host within 2 hours of check-in with photo/video evidence for any issues.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>Wi-Fi Issues</h4>
          <p style={{ margin: '0 0 4px' }}>Troubleshooting will be attempted.</p>
          <p style={{ margin: '0 0 8px' }}>
            If unresolved, a mobile eSIM for temporary internet access may be provided. Partial refunds may apply based on duration and
            severity.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>Major Issues</h4>
          <p style={{ margin: '0 0 8px' }}>
            Inability to enter, total utility outage, or serious hygiene issues may result in cancellation and refund.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>8. Cleaning</h3>
          <p style={{ margin: '0 0 8px' }}>
            Professional cleaning is provided before arrival. No regular cleaning is included during the stay unless requested as an
            additional service.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>9. Liability</h3>
          <p style={{ margin: '0 0 8px' }}>
            The host is not responsible for personal injury, loss, or theft. Guests are responsible for their own belongings and safety.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>9-1. Force Majeure</h4>
          <p style={{ margin: '0 0 8px' }}>
            The host shall not be held responsible for failure or delay in providing accommodation due to events beyond the host&apos;s
            reasonable control. Such events may include, but are not limited to, natural disasters, government regulations, public utility
            failures, transportation disruptions, epidemics, war, civil disturbances, strikes, or other force majeure events. In such
            circumstances, the host reserves the right to cancel the reservation or propose alternative dates. The host will make
            reasonable efforts to assist the guest in finding an appropriate solution whenever possible.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>10. Governing Law &amp; Disputes</h3>
          <p style={{ margin: '0 0 8px' }}>
            Disputes shall be resolved under the laws of the host’s country of residence.
          </p>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}
