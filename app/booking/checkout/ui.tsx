'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppHeaderWithBack } from '@/app/components/layout/AppHeaderWithBack';
import { BottomTabBar } from '@/app/components/layout/BottomTabBar';
import { computeTotalWithCleaning, computeDepositBalance, getSecurityDepositTier } from '@/lib/booking-pricing';
import { isValidInternationalPhone } from '@/lib/phone-validation';

type ValidationState = {
  isValid: boolean;
  message: string | null;
};

export function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const checkInStr = searchParams.get('check_in');
  const checkOutStr = searchParams.get('check_out');

  const checkIn = useMemo(
    () => (checkInStr ? new Date(`${checkInStr}T00:00:00Z`) : null),
    [checkInStr],
  );
  const checkOut = useMemo(
    () => (checkOutStr ? new Date(`${checkOutStr}T00:00:00Z`) : null),
    [checkOutStr],
  );

  const hasValidRange = checkIn && checkOut && checkOut > checkIn;

  const breakdown = useMemo(
    () => (hasValidRange && checkIn && checkOut ? computeTotalWithCleaning(checkIn, checkOut) : null),
    [hasValidRange, checkIn, checkOut],
  );

  const depositBalance = useMemo(
    () => (breakdown != null ? computeDepositBalance(breakdown.totalEur) : null),
    [breakdown],
  );

  const nights = breakdown?.nights ?? 0;
  const stayPriceEur = breakdown?.stayEur ?? null;
  const cleaningFeeEur = breakdown?.cleaningEur ?? null;
  const totalPriceEur = breakdown?.totalEur ?? null;
  const depositEur = depositBalance?.depositEur ?? null;
  const balanceEur = depositBalance?.balanceEur ?? null;
  const securityDepositEur = useMemo(() => getSecurityDepositTier(nights).securityDepositEur, [nights]);

  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Group A — policy agreements (4)
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePaymentInfo, setAgreePaymentInfo] = useState(false);
  const [agreeCancelPolicy, setAgreeCancelPolicy] = useState(false);
  const [agreeDepositPolicy, setAgreeDepositPolicy] = useState(false);

  // Group B — input-linked agreements (2)
  const [agreeEmailConfirm, setAgreeEmailConfirm] = useState(false);
  const [agreePhoneConfirm, setAgreePhoneConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const emailValidation: ValidationState = useMemo(() => {
    if (!email) return { isValid: false, message: null };
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return {
      isValid: ok,
      message: ok ? null : '올바른 이메일 주소를 입력해주세요.',
    };
  }, [email]);

  const phoneValidation: ValidationState = useMemo(() => {
    if (!phone) return { isValid: false, message: null };
    const ok = isValidInternationalPhone(phone);
    return {
      isValid: ok,
      message: ok ? null : '국제 전화번호 형식(+국가번호 포함)을 확인해주세요.',
    };
  }, [phone]);

  const trimmedName = guestName.trim();
  const nameIsValid = trimmedName.length >= 2;

  // If email / phone becomes invalid, linked checkboxes are auto-reset.
  useEffect(() => {
    if (!emailValidation.isValid && agreeEmailConfirm) {
      setAgreeEmailConfirm(false);
    }
  }, [emailValidation.isValid, agreeEmailConfirm]);

  useEffect(() => {
    if ((!phoneValidation.isValid || !nameIsValid) && agreePhoneConfirm) {
      setAgreePhoneConfirm(false);
    }
  }, [phoneValidation.isValid, nameIsValid, agreePhoneConfirm]);

  const isFormValid =
    nameIsValid &&
    !!email &&
    !!phone &&
    emailValidation.isValid &&
    phoneValidation.isValid &&
    agreeTerms &&
    agreePaymentInfo &&
    agreeCancelPolicy &&
    agreeDepositPolicy &&
    agreeEmailConfirm &&
    agreePhoneConfirm &&
    !!hasValidRange &&
    totalPriceEur != null;

  const canSubmit = isFormValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid || !checkIn || !checkOut || totalPriceEur == null) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        guest_name: guestName.trim(),
        email,
        phone,
        check_in: checkInStr,
        check_out: checkOutStr,
        total_price_eur: totalPriceEur,
      };

      const res = await fetch('/api/request-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 409) {
          setSubmitError(
            '이미 같은 날짜로 예약 요청이 접수되어 있습니다. 승인 결과를 기다리거나 잠시 후 다시 시도해주세요.',
          );
        } else {
          setSubmitError('예약 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        return;
      }

      router.push('/booking-requested');
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasValidRange || !checkIn || !checkOut) {
    // 잘못된 접근: 캘린더에서 날짜 없이 들어온 경우
    if (typeof window !== 'undefined') {
      router.replace('/booking');
    }
    return null;
  }

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
      <AppHeaderWithBack titleKorean="체크아웃" titleEnglish="CHECK OUT" />

      <main
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 16px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* 예약 기간 */}
          <section
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 28,
              backgroundColor: 'rgba(219, 200, 190, 0.85)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              예약기간 <span style={{ fontSize: 14, opacity: 0.85 }}>/ Dates</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {formatDisplayDate(checkInStr!)} ~ {formatDisplayDate(checkOutStr!)} ({nights}박/{nights}night)
            </div>
          </section>

          {/* 항목별 요약 */}
          <section
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 28,
              backgroundColor: 'rgba(219, 200, 190, 0.85)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span>
                숙박 요금 <span style={{ fontSize: 16, opacity: 0.85 }}>/ Accommodation</span>
              </span>
              <span>{stayPriceEur != null ? `€${stayPriceEur.toFixed(2)}` : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>
                청소비 <span style={{ fontSize: 16, opacity: 0.85 }}>/ Cleaning</span>
              </span>
              <span>{cleaningFeeEur != null ? `€${cleaningFeeEur.toFixed(2)}` : '-'}</span>
            </div>
          </section>

          {/* Group A — 정책 동의 (4개) */}
          <section
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 28,
              backgroundColor: 'rgba(219, 200, 190, 0.85)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ whiteSpace: 'pre-line' }}>
                    이용약관을 읽었으며 약관에 동의합니다.
                    {'\n'}I have read and agree to the Terms &amp; Conditions.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => router.push('/terms')}
                  style={{
                    border: 'none',
                    padding: 0,
                    background: 'none',
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#0D0822',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  약관보기 / Terms
                </button>
              </div>
            </div>

            <CheckboxRow
              checked={agreePaymentInfo}
              onChange={setAgreePaymentInfo}
              label={
                '결제는 공식 결제사를 통해 안전하게 처리되며 카드 정보는 저장되지 않습니다.\nPayment is processed securely via an official payment provider and card details are not stored.'
              }
            />
            <CheckboxRow
              checked={agreeCancelPolicy}
              onChange={setAgreeCancelPolicy}
              label={
                '체크인 14/30일 전까지 전액 환불 가능\n14/30일 이내 환불 불가 정책이 적용됩니다.(단/장기)\n\nFull refund is available up to 14/30 days before check-in.\nNo refund applies within 14/30 days (short/long stay).'
              }
            />
            <CheckboxRow
              checked={agreeDepositPolicy}
              onChange={setAgreeDepositPolicy}
              label={
                '환불 보증금은 파손/분실 등에 대비한 예치금이며, 퇴실후 문제가 없을 시 100% 환불 가능합니다.\n금액: 14박 이하 €500 / 14박 초과 €1,200\n결제 시점: 체크인 전 잔금(60%) 자동 결제 시 잔금과 함께 보증금이 함께 청구됩니다.\n환불: 체크아웃 후 파손·분실·과도한 오염 등이 없을 경우 전액 환불됩니다.\n\nA refundable security deposit is collected to cover potential damage or loss, and is eligible for a 100% refund if no issues are found after check-out.\nAmount: ≤14 nights €500 / >14 nights €1,200\nPayment timing: The security deposit is charged together with the remaining balance (60%) before check-in.\nRefund: The security deposit is fully refunded after check-out if no damage, loss, or excessive cleaning is found.'
              }
            />
          </section>

          {/* Group B — 입력 연동 동의 (2개) */}
          <section
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 28,
              backgroundColor: 'rgba(219, 200, 190, 0.85)',
              fontSize: 12,
            }}
          >
            <CheckboxRow
              checked={agreeEmailConfirm}
              onChange={setAgreeEmailConfirm}
              label={'입력한 이메일 주소로 예약 관련 안내를 받겠습니다.\nI will receive booking updates at the email address provided.'}
              disabled={!emailValidation.isValid}
            />
            <LabeledInput
              label="이메일 / Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              error={emailValidation.message}
            />

            <CheckboxRow
              checked={agreePhoneConfirm}
              onChange={setAgreePhoneConfirm}
              label={'입력한 전화번호와 이름으로 예약 관련 연락을 받겠습니다.\nI will receive booking-related contact using the phone number and name provided.'}
              disabled={!phoneValidation.isValid || !nameIsValid}
            />
            <LabeledInput
              label="전화번호 / Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+82 10-1234-5678"
              error={phoneValidation.message}
            />
            <LabeledInput label="이름 / Name" value={guestName} onChange={setGuestName} placeholder="홍길동" />

            <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(13, 8, 34, 0.7)' }}>
              주요 지원 국가: +82 (KR), +1 (US), +44 (UK), +33 (FR), +81 (JP), +49 (DE), +86 (CN)
            </div>
          </section>

          {/* 총 금액 및 40/60 분할 */}
          <section
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 28,
              backgroundColor: 'rgba(219, 200, 190, 0.85)',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>
                총 요금 <span style={{ fontSize: 15, opacity: 0.85 }}>/ Total</span>
              </span>
              <span>{totalPriceEur != null ? `€${totalPriceEur.toFixed(2)}` : '-'}</span>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 18, backgroundColor: 'rgba(13, 8, 34, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span>
                  지금 결제 (예약금 40%) <span style={{ fontSize: 14, opacity: 0.85 }}>/ Pay now (Booking fee 40%)</span>
                </span>
                <span>{depositEur != null ? `€${depositEur.toFixed(2)}` : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span>
                  체크인 전 자동 결제 (잔금 60%)
                  <div style={{ fontSize: 10, opacity: 0.75 }}>Remaining balance (60%) before check-in</div>
                </span>
                <span>{balanceEur != null ? `€${balanceEur.toFixed(2)}` : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>
                  환불 보증금
                  <div style={{ fontSize: 10, opacity: 0.75 }}>Fully refundable security deposit</div>
                </span>
                <span>{securityDepositEur ? `€${securityDepositEur.toFixed(2)}` : '-'}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, lineHeight: 1.4, color: 'rgba(13, 8, 34, 0.78)' }}>
                환불 보증금은 파손/분실 등에 대비한 예치금이며, 퇴실후 문제가 없을 시 100% 환불 가능합니다.
                <div style={{ marginTop: 4 }}>금액: 14박 이하 €500 / 14박 초과 €1,200</div>
                <div>결제 시점: 체크인 전 잔금(60%) 자동 결제 시 잔금과 함께 보증금이 함께 청구됩니다.</div>
                <div>환불: 체크아웃 후 파손·분실·과도한 오염 등이 없을 경우 전액 환불됩니다.</div>
                <div style={{ marginTop: 2 }}>
                  A refundable security deposit is collected to cover potential damage or loss, and is eligible for a 100% refund if no issues are found after check-out.
                  <div style={{ marginTop: 4 }}>Amount: ≤14 nights €500 / &gt;14 nights €1,200</div>
                  <div>Payment timing: The security deposit is charged together with the remaining balance (60%) before check-in.</div>
                  <div>Refund: The security deposit is fully refunded after check-out if no damage, loss, or excessive cleaning is found.</div>
                </div>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 999,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: canSubmit ? 'rgba(251, 188, 5, 1.0)' : 'rgba(251, 188, 5, 0.3)',
              backgroundColor: canSubmit ? 'rgba(13, 8, 34, 1.0)' : 'rgba(13, 8, 34, 0.3)',
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {isSubmitting ? '전송 중... / Sending...' : '예약 요청 보내기 / Send booking request'}
          </button>
          {submitError && (
            <p role="alert" style={{ margin: '12px 0 0', fontSize: 12, color: '#C0392B', textAlign: 'center' }}>
              {submitError}
            </p>
          )}
        </div>
      </main>

      <BottomTabBar active="calendar" />
    </div>
  );
}

type CheckboxRowProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
};

function CheckboxRow({ checked, onChange, label, disabled }: CheckboxRowProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          if (disabled) return;
          onChange(e.target.checked);
        }}
        disabled={disabled}
        style={{ marginTop: 2 }}
      />
      <span style={{ whiteSpace: 'pre-line' }}>{label}</span>
    </label>
  );
}

type LabeledInputProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: string;
  error?: string | null;
};

function LabeledInput({ label, value, onChange, placeholder, type = 'text', error }: LabeledInputProps) {
  const errorId = error ? `err-${label.replace(/\s/g, '-')}` : undefined;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={errorId}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 999,
          border: error ? '1px solid #C0392B' : '1px solid rgba(13, 8, 34, 0.4)',
          fontSize: 12,
          boxSizing: 'border-box',
          color: value ? (error ? '#E4153E' : '#0D0822') : undefined,
        }}
      />
      {error && (
        <div id={errorId} role="alert" style={{ marginTop: 4, fontSize: 11, color: '#C0392B' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((part) => Number(part));
  if (!y || !m || !d) return dateStr;
  return `${y}.${m < 10 ? `0${m}` : m}.${d < 10 ? `0${d}` : d}`;
}

