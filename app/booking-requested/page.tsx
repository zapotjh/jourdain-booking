'use client';

import Image from 'next/image';
import { BottomTabBar } from '../components/layout/BottomTabBar';

/**
 * 예약요청 완료 (Booking requested) — presentational only.
 * Shown after user submits a booking request (client redirects here on success).
 * No API calls; no booking/approval/payment logic.
 */
export default function BookingRequestedPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#CAB1A4',
        color: 'rgba(13, 8, 34, 0.9)',
        paddingBottom: '55px',
        position: 'relative',
      }}
    >
      {/* Status bar — empty, no icons */}
      <div
        style={{
          height: '44px',
          flexShrink: 0,
        }}
        aria-hidden
      />

      {/* CONTENTS: logo + message block, vertical flex, large gap */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 56,
          paddingBottom: 18,
          paddingLeft: 8,
          paddingRight: 8,
          boxSizing: 'border-box',
          gap: 114,
        }}
      >
        {/* Logo — same as HOME */}
        <div
          style={{
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Image
            src="/logo.png"
            alt="L'appartement Jourdain"
            width={320}
            height={160}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
          />
        </div>

        {/* Content block — title + copy */}
        <div
          style={{
            width: '100%',
            maxWidth: 319,
            paddingLeft: 24,
            paddingRight: 24,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.5,
              color: 'rgba(13, 8, 34, 0.9)',
            }}
          >
            예약요청 완료!
          </h1>
          <div
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'rgba(13, 8, 34, 0.9)',
            }}
          >
            <p style={{ margin: 0 }}>예약 내용을 이메일로 확인하세요.</p>
            <p style={{ margin: '0.25em 0' }}> </p>
            <p style={{ margin: 0, fontWeight: 500 }}>
              예약이 확정되면
              <br />
              이메일로 결제링크가 발송됩니다.
            </p>
            <p style={{ margin: '0.25em 0' }}> </p>
            <p style={{ margin: 0, fontWeight: 500 }}>
              결제링크는 24시간 동안 유효하며
            </p>
            <p style={{ margin: 0, fontWeight: 500 }}>이후 예약은 자동 취소 됩니다.</p>
            <p style={{ margin: '0.5em 0' }}> </p>
            <p style={{ margin: 0, opacity: 0.9 }}>Please check your booking details in your email.</p>
            <p style={{ margin: '0.25em 0' }}> </p>
            <p style={{ margin: 0, fontWeight: 500, opacity: 0.9 }}>
              Once your booking is confirmed,
              <br />
              a payment link will be sent via email.
            </p>
            <p style={{ margin: '0.25em 0' }}> </p>
            <p style={{ margin: 0, fontWeight: 500, opacity: 0.9 }}>The payment link is valid for 24 hours,</p>
            <p style={{ margin: 0, fontWeight: 500, opacity: 0.9 }}>and your booking will be canceled automatically after that.</p>
          </div>
        </div>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}
