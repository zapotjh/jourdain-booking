'use client';

import { format } from './date-format';

type BookingSummaryProps = {
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
  totalPriceEur: number | null;
  warningMessage: string | null;
};

export function BookingSummary({
  checkIn,
  checkOut,
  nights,
  totalPriceEur,
  warningMessage,
}: BookingSummaryProps) {
  const hasRange = Boolean(checkIn && checkOut && nights > 0);
  const enLabelStyle = { fontSize: 'clamp(15px, 3.6vw, 16px)', opacity: 0.85 } as const;

  return (
    <section
      aria-label="예약 요약"
      style={{
        marginTop: 4,
        borderBottom: '1px solid #CAB1A4',
        padding: '5px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <p
          style={{
            margin: 0,
            width: 'clamp(88px, 24vw, 100px)',
            flexShrink: 0,
            fontSize: 'clamp(13px, 3.2vw, 14px)',
            fontWeight: 500,
            color: '#0D0822',
          }}
        >
          예약기간 <span style={enLabelStyle}>/ Booking dates</span>
        </p>
        <div
          style={{
            flex: 1,
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            color: '#0D0822',
            minWidth: 0,
          }}
        >
          {hasRange ? (
            <>
              <p style={{ margin: 0 }}>
                {format(checkIn!)} - {format(checkOut!)}
              </p>
              <p style={{ margin: 0 }}>
                {nights}박 <span style={enLabelStyle}>/ {nights}Nights</span>
              </p>
            </>
          ) : (
            <p style={{ margin: 0, opacity: 0.7 }}>날짜를 선택해 주세요.</p>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 2,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(13px, 3.2vw, 14px)',
            fontWeight: 500,
            color: '#0D0822',
          }}
        >
          총 요금 <span style={enLabelStyle}>/ Total</span>
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            fontWeight: 500,
            fontFamily: 'Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            color: '#0D0822',
          }}
        >
          {totalPriceEur != null && hasRange ? (
            <>
              <span>€</span>
              <span>{totalPriceEur.toFixed(2)}</span>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>—</span>
          )}
        </p>
      </div>

      {warningMessage && (
        <p
          style={{
            margin: '2px 0 0 0',
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            fontWeight: 600,
            fontFamily: 'Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            color: '#E4153E',
          }}
        >
          {warningMessage}
        </p>
      )}
    </section>
  );
}

