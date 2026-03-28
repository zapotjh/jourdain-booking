'use client';

/**
 * NON-PRODUCTION: manual Stripe Checkout session via POST /api/checkout.
 * Kept for internal testing only — not part of the booking request flow.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentLinkTestPage() {
  const [email, setEmail] = useState('');
  const [priceCents, setPriceCents] = useState('1000');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') setStatusMsg('결제가 완료됐어요 ✅');
    else if (params.get('canceled') === '1') setStatusMsg('결제가 취소됐어요 ❌');
    else setStatusMsg(null);
  }, []);

  const pay = async () => {
    try {
      if (!email.includes('@')) {
        alert('이메일을 제대로 입력해줘');
        return;
      }
      const cents = Number(priceCents);
      if (!Number.isFinite(cents) || cents <= 0) {
        alert('금액(센트)을 올바르게 입력해줘');
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          price: cents,
          checkIn: checkIn || 'test',
          checkOut: checkOut || 'test',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('API error:', data);
        alert(data?.error ?? '결제 요청 실패');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Stripe URL이 비어있어');
      }
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : '알 수 없는 에러');
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/">← 홈으로</Link>
      </p>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Stripe 결제 링크 테스트 (비프로덕션)</h1>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
        POST /api/checkout — 수동 테스트용입니다. 예약 플로우와 무관합니다.
      </p>
      {statusMsg && <p style={{ marginBottom: 12 }}>{statusMsg}</p>}
      <label style={{ display: 'block', marginBottom: 8 }}>
        이메일
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', maxWidth: 360, marginTop: 4, padding: 8 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        금액 (센트, 예: 10유로 = 1000)
        <input
          type="text"
          inputMode="numeric"
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
          style={{ display: 'block', width: '100%', maxWidth: 360, marginTop: 4, padding: 8 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        checkIn (선택, 메타데이터)
        <input
          type="text"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          style={{ display: 'block', width: '100%', maxWidth: 360, marginTop: 4, padding: 8 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 16 }}>
        checkOut (선택, 메타데이터)
        <input
          type="text"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          style={{ display: 'block', width: '100%', maxWidth: 360, marginTop: 4, padding: 8 }}
        />
      </label>
      <button type="button" onClick={pay} style={{ padding: '10px 16px', cursor: 'pointer' }}>
        Stripe Checkout 열기
      </button>
    </div>
  );
}
