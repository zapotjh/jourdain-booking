'use client';

import {
  WEEKDAY_RATE_EUR,
  WEEKEND_RATE_EUR,
  DISCOUNT_RATE_7_NIGHTS,
  DISCOUNT_RATE_28_NIGHTS,
} from '@/lib/booking-pricing';

export function BookingPriceGuide() {
  const discount7Percent = Math.round(DISCOUNT_RATE_7_NIGHTS * 100);
  const discount28Percent = Math.round(DISCOUNT_RATE_28_NIGHTS * 100);

  return (
    <section
      aria-label="요금 안내"
      style={{
        marginTop: 'clamp(10px, 2.5vw, 17px)',
        padding: 'clamp(10px, 3vw, 16px)',
        borderRadius: 12,
        border: '1px solid rgba(13, 8, 34, 0.12)',
        background: 'rgba(255,255,255,0.14)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(4px, 1.2vw, 6px)',
          color: '#FBBC05',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            width: 'clamp(5px, 1.2vw, 6px)',
            height: 'clamp(5px, 1.2vw, 6px)',
            borderRadius: 999,
            backgroundColor: '#FBBC05',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: 600, letterSpacing: 0.5 }}>
          PRICE
        </span>
        <span style={{ fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: 0.2 }}>
          {' / '}
        </span>
        <span style={{ fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 600, letterSpacing: 0.2 }}>
          요금안내
        </span>
      </div>
      <div style={{ height: 'clamp(6px, 2vw, 10px)' }} />
      <div
        style={{
          fontSize: 'clamp(13px, 3.2vw, 15px)',
          color: '#000000',
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0 }}>평일 1박 {WEEKDAY_RATE_EUR}유로</p>
        <p style={{ margin: 0 }}>주말(금/토 숙박) 1박 {WEEKEND_RATE_EUR}유로</p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0 }}>7일 이상 숙박시: {discount7Percent}% 할인 적용</p>
        <p style={{ margin: 0 }}>28일 이상 장기숙박시: {discount28Percent}% 할인 적용</p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0, fontSize: 'clamp(10px, 2.6vw, 12px)' }}>
          *본 숙소는 28일 이상 장기체류를 우선시 하여 운영되고 있습니다.
        </p>
      </div>
    </section>
  );
}

