'use client';

import type { ReactNode } from 'react';

export type DayState =
  | 'normal'
  | 'selected'
  | 'inRange'
  | 'blockedConfirmed'
  | 'blockedPending'
  | 'disabled';

export type DayCell = {
  date: Date;
  label: string;
  state: DayState;
  isToday: boolean;
};

type BookingCalendarShellProps = {
  currentMonthLabel: string;
  weeks: DayCell[][];
  onDayClick: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export function BookingCalendarShell({
  currentMonthLabel,
  weeks,
  onDayClick,
  onPrevMonth,
  onNextMonth,
}: BookingCalendarShellProps) {
  /** Inner circle scales with cell; base ~30px at ~38px cell height. */
  const innerSize = 30;

  return (
    <section
      aria-label="예약 달력"
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {/* Month header with navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <PlainButton onClick={onPrevMonth} ariaLabel="이전 달">
          ‹
        </PlainButton>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: 'rgba(13, 8, 34, 0.9)',
          }}
        >
          {currentMonthLabel}
        </span>
        <PlainButton onClick={onNextMonth} ariaLabel="다음 달">
          ›
        </PlainButton>
      </div>

      {/* Calendar shell */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(13, 8, 34, 0.08)',
        }}
      >
        {/* Weekday header — 7 equal columns fill full width (no gap beside Sa) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            width: '100%',
            backgroundColor: '#CAB1A4',
          }}
        >
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, di) => (
            <div
              key={d}
              style={{
                minHeight: 28,
                borderLeft: '1px solid #E0E0E0',
                borderTop: '1px solid #E0E0E0',
                borderRight: di === 6 ? '1px solid #E0E0E0' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#666666',
                }}
              >
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              width: '100%',
              backgroundColor: 'rgba(202, 177, 164, 0.8)',
            }}
          >
            {week.map((day, di) => (
              <div
                key={di}
                style={{
                  aspectRatio: '1',
                  minHeight: 0,
                  minWidth: 0,
                  borderLeft: '1px solid #E0E0E0',
                  borderTop: '1px solid #E0E0E0',
                  borderRight: di === 6 ? '1px solid #E0E0E0' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    day.state === 'blockedConfirmed'
                      ? 'rgba(105, 88, 80, 0.75)'
                      : day.state === 'blockedPending'
                      ? 'rgba(189, 158, 141, 0.75)'
                      : 'rgba(202, 177, 164, 0.8)',
                  opacity: day.state === 'disabled' ? 0.35 : 1,
                  cursor:
                    day.state === 'disabled' ||
                    day.state === 'blockedConfirmed' ||
                    day.state === 'blockedPending'
                      ? 'not-allowed'
                      : 'pointer',
                }}
                onClick={() => {
                  if (
                    day.state === 'disabled' ||
                    day.state === 'blockedConfirmed' ||
                    day.state === 'blockedPending'
                  )
                    return;
                  onDayClick(day.date);
                }}
              >
                <div
                  style={{
                    width: `min(${innerSize}px, 78%)`,
                    height: `min(${innerSize}px, 78%)`,
                    maxWidth: '78%',
                    maxHeight: '78%',
                    aspectRatio: '1',
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      day.state === 'selected' || day.state === 'inRange'
                        ? 'rgba(229, 176, 20, 0.9)'
                        : 'transparent',
                    boxShadow:
                      day.state === 'selected'
                        ? '0 0 0 1px rgba(13, 8, 34, 0.5)'
                        : undefined,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color:
                        day.state === 'blockedConfirmed' || day.state === 'blockedPending'
                          ? 'rgba(13, 8, 34, 0.46)'
                          : 'rgba(13, 8, 34, 0.9)',
                    }}
                  >
                    {day.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend chips (20% smaller than previous) */}
      <div
        style={{
          display: 'flex',
          gap: 6.4,
          marginTop: 8,
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4.8,
            padding: '4.8px 8px',
            borderRadius: 999,
            background: 'rgba(189, 158, 141, 0.35)',
            color: 'rgba(13, 8, 34, 0.9)',
            fontSize: 9.6,
            fontWeight: 600,
            fontFamily: 'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          승인 대기중 / Pending reservation
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4.8,
            padding: '4.8px 8px',
            borderRadius: 999,
            background: 'rgba(105, 88, 80, 0.60)',
            color: 'rgba(255,255,255,0.95)',
            fontSize: 9.6,
            fontWeight: 600,
            fontFamily: 'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          예약불가 / Not available
        </span>
      </div>
    </section>
  );
}

type PlainButtonProps = {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
};

function PlainButton({ children, onClick, ariaLabel }: PlainButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: 'rgba(219, 200, 190, 0.9)',
        color: '#0D0822',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{children}</span>
    </button>
  );
}

