// Frontend-only pricing helpers for booking UI.
// Backend cents/deposit/balance logic remains canonical in app/api/request-booking/route.ts.

/** 평일 1박 요금 (EUR). */
export const WEEKDAY_RATE_EUR = 143;
/** 금/토 1박 요금 (EUR). */
export const WEEKEND_RATE_EUR = 160;
/** 7박 이상 할인율 (0–1). 표시용 18% = 0.18. */
export const DISCOUNT_RATE_7_NIGHTS = 0.18;
/** 28박 이상 할인율 (0–1). 표시용 40% = 0.4. */
export const DISCOUNT_RATE_28_NIGHTS = 0.4;

/** 7박 이상 시 할인 적용 임계값. */
export const STAY_DISCOUNT_THRESHOLD_7 = 7;
/** 28박 이상 시 장기 할인 적용 임계값. */
export const STAY_DISCOUNT_THRESHOLD_28 = 28;

/** 최소 숙박 박수. 이 미만이면 예약 불가. */
export const MIN_STAY_NIGHTS = 2;

export type StayDiscountDisplay = {
  discountType: 'none' | 'sevenPlus' | 'twentyEightPlus';
  discountPercent: number;
  thresholdNights: number;
};

/**
 * 숙박 할인 표시용. booking 화면에서 "7박이상 18% 할인" 등 메시지에 사용.
 * thresholds/비율은 calculateTotalPriceEur 와 동일한 정책.
 */
export function getStayDiscountDisplay(nights: number): StayDiscountDisplay {
  if (nights >= STAY_DISCOUNT_THRESHOLD_28) {
    return { discountType: 'twentyEightPlus', discountPercent: Math.round(DISCOUNT_RATE_28_NIGHTS * 100), thresholdNights: STAY_DISCOUNT_THRESHOLD_28 };
  }
  if (nights >= STAY_DISCOUNT_THRESHOLD_7) {
    return { discountType: 'sevenPlus', discountPercent: Math.round(DISCOUNT_RATE_7_NIGHTS * 100), thresholdNights: STAY_DISCOUNT_THRESHOLD_7 };
  }
  return { discountType: 'none', discountPercent: 0, thresholdNights: 0 };
}

export function calculateTotalPriceEur(checkIn: Date, checkOut: Date): number | null {
  const nights = diffNights(checkIn, checkOut);
  if (!Number.isFinite(nights) || nights <= 0) return null;

  if (nights < MIN_STAY_NIGHTS) {
    return null;
  }

  let baseTotal = 0;
  for (let i = 0; i < nights; i += 1) {
    const d = addDays(checkIn, i);
    const weekday = d.getUTCDay(); // 0 = Sun ... 5 = Fri, 6 = Sat
    const isFriOrSat = weekday === 5 || weekday === 6;
    baseTotal += isFriOrSat ? WEEKEND_RATE_EUR : WEEKDAY_RATE_EUR;
  }

  let discountRate = 0;
  if (nights >= STAY_DISCOUNT_THRESHOLD_28) discountRate = DISCOUNT_RATE_28_NIGHTS;
  else if (nights >= STAY_DISCOUNT_THRESHOLD_7) discountRate = DISCOUNT_RATE_7_NIGHTS;

  const total = baseTotal * (1 - discountRate);
  return Math.round(total * 100) / 100;
}

/** 청소비: 언제나 60 EUR. 맨 마지막 체크아웃 화면(/booking/checkout)에서만 숙박 요금에 더해진다. */
export const CLEANING_FEE_EUR = 60;

/** 표시용 보증금 비율. 백엔드 app/api/request-booking/route.ts 의 DEPOSIT_RATIO 와 동일한 값. */
export const DEPOSIT_RATIO = 0.4;

export type SecurityDepositTier = {
  securityDepositEur: number;
};

/**
 * 환불 보증금 (표시/계산 공통): 숙박 기간 기준 고정 티어.
 * - 14박 이하: €500
 * - 14박 초과: €1,200
 */
export function getSecurityDepositTier(nights: number): SecurityDepositTier {
  if (!Number.isFinite(nights) || nights <= 0) return { securityDepositEur: 0 };
  return { securityDepositEur: nights <= 14 ? 500 : 1200 };
}

export function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

export type TotalWithCleaning = {
  stayEur: number;
  cleaningEur: number;
  totalEur: number;
  nights: number;
};

/**
 * 숙박 + 청소비 총액 및 박수. 2박 미만이면 null.
 * 맨 마지막 체크아웃 화면에서만 사용; 캘린더 페이지는 숙박만 표시.
 */
export function computeTotalWithCleaning(
  checkIn: Date,
  checkOut: Date,
): TotalWithCleaning | null {
  const stayEur = calculateTotalPriceEur(checkIn, checkOut);
  if (stayEur == null) return null;
  const nights = diffNights(checkIn, checkOut);
  const cleaningEur = CLEANING_FEE_EUR;
  const totalEur = roundToTwo(stayEur + cleaningEur);
  return { stayEur, cleaningEur, totalEur, nights };
}

export type DepositBalance = {
  depositEur: number;
  balanceEur: number;
};

/**
 * 표시용 보증금/잔금. 백엔드 cents 계산과 무관; UI 전용.
 */
export function computeDepositBalance(totalEur: number): DepositBalance {
  const depositEur = roundToTwo(totalEur * DEPOSIT_RATIO);
  const balanceEur = roundToTwo(totalEur * (1 - DEPOSIT_RATIO));
  return { depositEur, balanceEur };
}

export function diffNights(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

