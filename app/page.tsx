'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [email, setEmail] = useState('');
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

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? '알 수 없는 에러');
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Jourdain Booking</h1>

      {statusMsg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 8,
          }}
        >
          {statusMsg}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <label>Email</label>
        <br />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{ padding: 10, width: 320, marginTop: 8 }}
        />
      </div>

      <button
        onClick={pay}
        style={{ marginTop: 16, padding: '10px 16px', cursor: 'pointer' }}
      >
        Pay (test)
      </button>
    </main>
  );
}