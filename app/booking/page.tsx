'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import {
  BookingCalendarShell,
  type DayCell,
  type DayState,
} from '../components/booking/BookingCalendarShell';
import { BookingSummary } from '../components/booking/BookingSummary';
import { BookingCheckoutButton } from '../components/booking/BookingCheckoutButton';
import { BookingPriceGuide } from '../components/booking/BookingPriceGuide';
import {
  calculateTotalPriceEur,
  addDays,
  startOfDay,
  diffNights,
  MIN_STAY_NIGHTS,
  getStayDiscountDisplay,
  type StayDiscountDisplay,
} from '@/lib/booking-pricing';
import { contentShellStyle } from '@/lib/content-layout';

type DiscountType = 'none' | 'sevenPlus' | 'twentyEightPlus';

export default function BookingPage() {
  const router = useRouter();
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(() => ({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(), // 0-based
  }));

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  // Demo용 blocked ranges (UI 상태만): 실제 가용성 API 연동 전까지는 예시로만 사용.
  const confirmedRanges = useMemo(
    () => [
      createRange(today, addDays(today, 3)), // 오늘~3일 뒤까지 예시 확정
    ],
    [today],
  );
  const pendingRanges = useMemo(
    () => [createRange(addDays(today, 7), addDays(today, 9))],
    [today],
  );

  const {
    weeksForView,
    nights,
    discountType,
    warningMessage,
    totalPriceEur,
    isCheckoutEnabled,
  } = useBookingCalendarState({
    currentMonth,
    checkIn,
    checkOut,
    confirmedRanges,
    pendingRanges,
  });

  const currentMonthLabel = useMemo(
    () => formatYearMonth(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month],
  );

  const handleDayClick = (date: Date) => {
    const d = startOfDay(date);

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
      return;
    }

    if (d.getTime() <= checkIn.getTime()) {
      setCheckIn(d);
      setCheckOut(null);
      return;
    }

    setCheckOut(d);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const m = new Date(Date.UTC(prev.year, prev.month, 1));
      m.setUTCMonth(m.getUTCMonth() - 1);
      return { year: m.getUTCFullYear(), month: m.getUTCMonth() };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const m = new Date(Date.UTC(prev.year, prev.month, 1));
      m.setUTCMonth(m.getUTCMonth() + 1);
      return { year: m.getUTCFullYear(), month: m.getUTCMonth() };
    });
  };

  const handleCheckoutClick = () => {
    if (!checkIn || !checkOut) return;
    const checkInStr = formatDateForApi(checkIn);
    const checkOutStr = formatDateForApi(checkOut);
    router.push(`/booking/checkout?check_in=${encodeURIComponent(checkInStr)}&check_out=${encodeURIComponent(checkOutStr)}`);
  };

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
      <AppHeaderWithBack titleKorean="예약하기" titleEnglish="BOOKING" />

      <main
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 'clamp(12px, 3vw, 20px) clamp(12px, 2vw, 16px) clamp(16px, 4vw, 24px)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            ...contentShellStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <BookingCalendarShell
            currentMonthLabel={currentMonthLabel}
            weeks={weeksForView}
            onDayClick={handleDayClick}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <BookingSummary
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            totalPriceEur={totalPriceEur}
            warningMessage={warningMessage}
          />

          <BookingCheckoutButton enabled={isCheckoutEnabled} onClick={handleCheckoutClick} />

          <BookingPriceGuide />
        </div>
      </main>

      <BottomTabBar active="calendar" />
    </div>
  );
}

// ---- Hook & helpers --------------------------------------------------------

type DateRange = { start: Date; end: Date };

type UseBookingCalendarStateArgs = {
  currentMonth: { year: number; month: number };
  checkIn: Date | null;
  checkOut: Date | null;
  confirmedRanges: DateRange[];
  pendingRanges: DateRange[];
};

function useBookingCalendarState({
  currentMonth,
  checkIn,
  checkOut,
  confirmedRanges,
  pendingRanges,
}: UseBookingCalendarStateArgs) {
  const today = startOfDay(new Date());

  const { weeksForView, nights } = useMemo(() => {
    const { weeks } = buildWeeksForView({
      year: currentMonth.year,
      month: currentMonth.month,
      today,
      checkIn,
      checkOut,
      confirmedRanges,
      pendingRanges,
    });

    const n = checkIn && checkOut ? diffNights(checkIn, checkOut) : 0;

    return { weeksForView: weeks, nights: n };
  }, [currentMonth.year, currentMonth.month, today, checkIn, checkOut, confirmedRanges, pendingRanges]);

  const { discountType, warningMessage, totalPriceEur, isCheckoutEnabled } = useMemo(() => {
    if (!checkIn || !checkOut) {
      return {
        discountType: 'none' as DiscountType,
        warningMessage: null,
        totalPriceEur: null,
        isCheckoutEnabled: false,
      };
    }

    const n = nights;
    const discountDisplay: StayDiscountDisplay = getStayDiscountDisplay(n);
    let warning: string | null = null;

    if (n > 0 && n < MIN_STAY_NIGHTS) {
      warning = `최소 ${MIN_STAY_NIGHTS}박 이상부터 예약 가능합니다.`;
    } else if (discountDisplay.discountType !== 'none') {
      warning = `${discountDisplay.thresholdNights}박이상 ${discountDisplay.discountPercent}% 할인 적용`;
    }

    const total = n >= MIN_STAY_NIGHTS ? calculateTotalPriceEur(checkIn, checkOut) : null;

    const hasOverlap =
      rangeOverlapsAny(createRange(checkIn, checkOut), confirmedRanges) ||
      rangeOverlapsAny(createRange(checkIn, checkOut), pendingRanges);

    const enabled = Boolean(checkIn && checkOut && n >= MIN_STAY_NIGHTS && !hasOverlap);

    return {
      discountType: discountDisplay.discountType as DiscountType,
      warningMessage: warning,
      totalPriceEur: total,
      isCheckoutEnabled: enabled,
    };
  }, [checkIn, checkOut, nights, confirmedRanges, pendingRanges]);

  return {
    weeksForView,
    nights,
    discountType,
    warningMessage,
    totalPriceEur,
    isCheckoutEnabled,
  };
}

type BuildWeeksArgs = {
  year: number;
  month: number; // 0-based
  today: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  confirmedRanges: DateRange[];
  pendingRanges: DateRange[];
};

function buildWeeksForView({
  year,
  month,
  today,
  checkIn,
  checkOut,
  confirmedRanges,
  pendingRanges,
}: BuildWeeksArgs): { weeks: DayCell[][] } {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0–6
  const startDate = addDays(firstOfMonth, -startWeekday);

  const weeks: DayCell[][] = [];

  for (let w = 0; w < 6; w += 1) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(startDate, w * 7 + d);
      const inCurrentMonth = date.getUTCMonth() === month;

      const inConfirmed = isInAnyRange(date, confirmedRanges);
      const inPending = isInAnyRange(date, pendingRanges);

      let state: DayState = 'normal';
      if (!inCurrentMonth) {
        state = 'disabled';
      } else if (inConfirmed) {
        state = 'blockedConfirmed';
      } else if (inPending) {
        state = 'blockedPending';
      } else if (checkIn && !checkOut && sameDay(date, checkIn)) {
        state = 'selected';
      } else if (checkIn && checkOut && inRangeInclusive(date, checkIn, checkOut)) {
        if (sameDay(date, checkIn) || sameDay(date, checkOut)) {
          state = 'selected';
        } else {
          state = 'inRange';
        }
      }

      const isToday = sameDay(date, today);

      week.push({
        date,
        label: String(date.getUTCDate()),
        state,
        isToday,
      });
    }
    weeks.push(week);
  }

  return { weeks };
}

// Utility functions

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function inRangeInclusive(date: Date, start: Date, end: Date): boolean {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

function isInAnyRange(date: Date, ranges: DateRange[]): boolean {
  const t = startOfDay(date).getTime();
  return ranges.some((r) => {
    const s = startOfDay(r.start).getTime();
    const e = startOfDay(r.end).getTime();
    return t >= s && t <= e;
  });
}

function rangeOverlapsAny(target: DateRange, ranges: DateRange[]): boolean {
  const s = startOfDay(target.start).getTime();
  const e = startOfDay(target.end).getTime();
  return ranges.some((r) => {
    const rs = startOfDay(r.start).getTime();
    const re = startOfDay(r.end).getTime();
    return rs <= e && re >= s;
  });
}

function createRange(start: Date, end: Date): DateRange {
  return { start: startOfDay(start), end: startOfDay(end) };
}

function formatYearMonth(year: number, monthZeroBased: number): string {
  const month = monthZeroBased + 1;
  const mm = month < 10 ? `0${month}` : `${month}`;
  return `${year}. ${mm}`;
}

function formatDateForApi(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const mm = m < 10 ? `0${m}` : `${m}`;
  const dd = d < 10 ? `0${d}` : `${d}`;
  return `${y}-${mm}-${dd}`;
}

