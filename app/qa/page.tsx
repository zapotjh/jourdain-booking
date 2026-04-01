'use client';

import Link from 'next/link';
import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import {
  contentTextColumnStyle,
  fluidQaHeading1,
  fluidQaHeading2,
  fluidQaHeading3,
  fluidQaBody,
} from '@/lib/content-layout';

const listStyle = {
  paddingLeft: 18,
  margin: 0,
  ...fluidQaBody,
} as const;

export default function QAPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#CAB1A4',
        color: '#0D0822',
        paddingBottom: '55px',
        paddingTop: 42,
        position: 'relative',
      }}
    >
      <AppHeaderWithBack titleKorean="자주 묻는 질문" titleEnglish="Q&A" />

      <Link
        href="/terms"
        style={{
          position: 'fixed',
          top: 46,
          right: 'calc((100vw - min(640px, calc(100vw - 24px))) / 2 + 12px)',
          zIndex: 21,
          padding: '8.5px 11.9px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.24)',
          border: '1px solid rgba(13, 8, 34, 0.14)',
          color: '#0D0822',
          fontSize: '10.2px',
          fontWeight: 600,
          textDecoration: 'none',
          lineHeight: 1.25,
          fontFamily: 'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        약관보기
      </Link>

      <main
        style={{
          padding: 'clamp(12px, 3vw, 16px) 0 clamp(16px, 4vw, 24px)',
          boxSizing: 'border-box',
        }}
      >
        <div style={contentTextColumnStyle}>
          <section style={{ marginBottom: 'clamp(24px, 6vw, 32px)' }}>
            <h1 style={fluidQaHeading1}>❗ 필독사항 (Important Notice)</h1>
            <div style={{ height: 'clamp(6px, 2vw, 8px)' }} />
            <ul style={{ ...listStyle, margin: '4px 0 0 0' }}>
              <li>기본 어메니티: 샴푸, 린스, 비누, 수건 2장, 깨끗한 침구가 제공됩니다.</li>
              <li>본 숙소는 셀프 체크인(Self Check-in)으로 운영되며 상주하는 직원은 없습니다.</li>
              <li>체크인: 오후 3pm / 체크아웃: 오전 11am</li>
              <li>파리의 오래된 건물 특성상 엘리베이터와 에어컨은 설치되어 있지 않습니다.</li>
              <li>
                건물의 복도는 일반적인 파리 아파트 수준으로, 큰 캐리어 이동에 지나치게 불편하거나
                좁지는 않습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={fluidQaHeading2}>❓ 자주 묻는 질문 (Q&A)</h2>

            <div style={{ height: 'clamp(12px, 3vw, 16px)' }} />

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 결제는 어떻게 진행되나요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>A. 단기 체류</p>
              <ul style={{ ...listStyle, margin: '4px 0 8px 0' }}>
                <li>예약 시: 예약금(총 금액의 40%) 결제</li>
                <li>체크인 14일 전: 잔금 자동 결제(카드 결제)</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>A. 장기 체류(28박 이상)</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>예약 시: 예약금(총 금액의 40%) 결제</li>
                <li>체크인 30일 전: 잔금 60% 자동 결제(완불)</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>보증금(Deposit)</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>
                  환불 보증금은 <strong>숨겨진 추가 비용이 아니라</strong> 파손/분실 등에 대비한{' '}
                  <strong>100% 환불 가능한 예치금</strong>입니다.
                </li>
                <li>
                  금액: <strong>14박 이하 €500</strong> / <strong>14박 초과 €1,200</strong>
                </li>
                <li>
                  결제 시점: <strong>체크인 전 잔금(60%) 자동 결제 시</strong> 잔금과 함께{' '}
                  <strong>보증금이 함께 청구</strong>됩니다.
                </li>
                <li>
                  환불: 체크아웃 후 파손·분실·과도한 오염 등이 없을 경우 <strong>전액 환불</strong>
                  됩니다.
                </li>
              </ul>
              <div style={{ height: 6 }} />
              <p style={{ ...fluidQaBody, fontSize: 'clamp(12px, 3vw, 13px)', opacity: 0.9 }}>
                EN: A fully refundable security deposit will be charged together with the remaining balance before check-in. It will be
                fully refunded after checkout if no damage is found. (≤14 nights €500 / &gt;14 nights €1,200)
              </p>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 취소 및 환불 규정은 어떻게 되나요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>A. 단기 예약</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>체크인 14일 전까지 취소: 전액 환불</li>
                <li>체크인 14~7일 전 취소: 예약금의 50% 환불</li>
                <li>체크인 7일 이내 취소 또는 노쇼(No-show): 환불 불가</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>A. 장기 예약(28박 이상)</p>
              <p style={{ ...fluidQaBody, margin: '4px 0' }}>
                저희 숙소는 ‘파리에서 로컬처럼 한 달 살기’를 위한 장기 체류형 숙소로 운영됩니다. 장기
                예약 특성상 일정이 확정되는 순간 다른 예약을 받을 수 없기 때문에, 아래와 같은 정책을
                적용합니다.
              </p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>체크인 30일 전까지 취소: 전액 환불</li>
                <li>체크인 30일 이내 취소: 환불 불가</li>
              </ul>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 잔금 결제가 실패하면 어떻게 되나요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                A. 잔금 결제가 카드 승인 문제, 한도 초과, 카드 만료 등으로 실패할 수 있습니다. 이 경우
                시스템은 최대 3회까지 자동으로 재결제를 시도하며, 자동 재시도는 하루 간격으로
                진행됩니다.
              </p>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>
                만약 3회 모두 결제가 실패할 경우 자동 재시도는 중단되며, 게스트에게 수동 결제 링크
                (Stripe Secure Payment Link)가 발송될 수 있습니다. 지정된 기간 내 결제가 완료되지 않을
                경우 예약은 취소될 수 있습니다.
              </p>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 도착 후 숙소에 문제가 있으면 어떻게 하나요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                도착 후 숙소 상태가 안내된 내용과 다르거나 즉시 해결이 필요한 문제가 있을 경우 체크인
                후 2시간 이내 고객지원 채널로 연락해 주세요. 원활한 처리를 위해 사진/영상 증빙을
                요청드릴 수 있으며 확인 후 아래 방식으로 대응합니다.
              </p>
              <ol style={{ ...listStyle, margin: '8px 0' }}>
                <li>가능한 경우 즉시 조치 / 수리</li>
                <li>문제의 범위 및 기간에 따른 부분 환불</li>
                <li>문제가 중대하여 숙박이 사실상 불가능한 경우에 한해 예약 취소 및 환불</li>
              </ol>
              <p style={{ ...fluidQaBody, margin: '4px 0 0 0' }}>
                ※ 체크인 후 2시간이 경과한 뒤 접수된 사항은 도착 시점의 상태 확인이 어려워 조치/환불이
                제한될 수 있습니다.
              </p>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 플랫폼을 통하지 않아도 안전한가요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                네. 플랫폼 중개 없이도 게스트가 안심할 수 있도록 호텔 수준의 결제·환불 구조로
                운영합니다.
              </p>
              <ul style={{ ...listStyle, margin: '8px 0' }}>
                <li>결제는 국제 공인 결제사(Stripe)를 통해 진행됩니다.</li>
                <li>예약금/잔금 분리 방식으로 전액 선결제에 대한 부담을 최소화했습니다.</li>
                <li>체크인 직후 문제가 발생할 경우 조치 또는 환불 옵션이 제공됩니다.</li>
                <li>운영자 정보와 정책(환불/분쟁 처리)을 투명하게 공개합니다.</li>
              </ul>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. 이 숙소는 호텔인가요?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                아니요. 이곳은 호텔이나 전문 민박이 아닌, 호스트가 실제로 지내던 개인 집을 일정 기간
                공유하는 공간입니다.
              </p>
              <ul style={{ ...listStyle, margin: '8px 0' }}>
                <li>셀프 체크인 방식</li>
                <li>상주 직원 없음</li>
                <li>서로의 공간을 존중하는 이용을 부탁드립니다.</li>
              </ul>
            </article>

            <p style={{ ...fluidQaBody, margin: 'clamp(12px, 3vw, 16px) 0 clamp(6px, 2vw, 8px) 0' }}>
              감사합니다.
            </p>
          </section>
        </div>
      </main>

      <BottomTabBar active="qa" />
    </div>
  );
}
