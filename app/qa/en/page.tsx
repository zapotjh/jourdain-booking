'use client';

import Link from 'next/link';
import { AppHeaderWithBack } from '../../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { contentTextColumnStyle, fluidQaHeading2, fluidQaHeading3, fluidQaBody } from '@/lib/content-layout';

const listStyle = {
  paddingLeft: 18,
  margin: 0,
  ...fluidQaBody,
} as const;

const BUTTON_STYLE = {
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
} as const;

export default function QAEnPage() {
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
      <AppHeaderWithBack
        titleKorean=""
        titleEnglish="Q&A"
        rightSlot={
          <Link href="/qa" style={BUTTON_STYLE}>
            KR
          </Link>
        }
      />

      <Link
        href="/terms"
        style={{
          position: 'fixed',
          top: 46,
          right: 'calc((100vw - min(640px, calc(100vw - 24px))) / 2 + 12px)',
          zIndex: 21,
          ...BUTTON_STYLE,
        }}
      >
        TERMS
      </Link>

      <main
        style={{
          padding: 'clamp(12px, 3vw, 16px) 0 clamp(16px, 4vw, 24px)',
          boxSizing: 'border-box',
        }}
      >
        <div style={contentTextColumnStyle}>
          <section>
            <h2 style={fluidQaHeading2}>❓ Frequently Asked Questions</h2>

            <div style={{ height: 'clamp(12px, 3vw, 16px)' }} />

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>❗ Important Notice</h3>
              <div style={{ height: 12 }} />
              <ul style={{ ...listStyle, margin: '4px 0 0 0' }}>
                <li>Basic amenities are provided: shampoo, conditioner, soap, 2 towels per guest, and clean bedding.</li>
                <li>This property operates as a self check-in accommodation with no on-site staff.</li>
                <li>Check-in: 3:00 PM / Check-out: 11:00 AM</li>
                <li>Due to the nature of older Paris buildings, there is no elevator and no air conditioning.</li>
                <li>
                  The building corridor is a typical Paris apartment corridor; it is not unusually narrow or excessively inconvenient for
                  large luggage.
                </li>
              </ul>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. How does payment work?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>A. Short stay</p>
              <ul style={{ ...listStyle, margin: '4px 0 8px 0' }}>
                <li>At booking: 40% deposit payment</li>
                <li>14 days before check-in: remaining balance is charged automatically (card payment)</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>A. Long stay (28+ nights)</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>At booking: 40% deposit payment</li>
                <li>30 days before check-in: remaining 60% is charged automatically</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>Security deposit</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>
                  A refundable security deposit is collected to cover potential damage or loss, and is eligible for a 100% refund if no
                  issues are found after check-out.
                </li>
                <li>Amount: ≤14 nights €500 / &gt;14 nights €1,200</li>
                <li>Payment timing: charged together with the remaining balance (60%) before check-in</li>
                <li>Refund: fully refunded after check-out if no damage, loss, or excessive cleaning is found</li>
              </ul>
            </article>
          </section>
        </div>
      </main>

      <BottomTabBar active="qa" />
    </div>
  );
}

