'use client';

import Link from 'next/link';
import { AppHeaderWithBack } from '../../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import {
  contentTextColumnStyle,
  fluidQaHeading2,
  fluidQaHeading3,
  fluidQaBody,
} from '@/lib/content-layout';

const LANGUAGE_BUTTON_STYLE = {
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

const listStyle = {
  paddingLeft: 18,
  margin: 0,
  ...fluidQaBody,
} as const;

export default function FAQEnPage() {
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
        titleEnglish="FAQ"
        rightSlot={
          <Link href="/faq" style={LANGUAGE_BUTTON_STYLE}>
            KR
          </Link>
        }
      />

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
                  The building corridor is a typical Paris apartment corridor; it is not unusually narrow or excessively inconvenient
                  for large luggage.
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

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. What is the cancellation and refund policy?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>A. Short stay</p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>Cancel 14+ days before check-in: full refund</li>
                <li>Cancel 14–7 days before check-in: 50% refund of the deposit</li>
                <li>Cancel within 7 days of check-in or no-show: non-refundable</li>
              </ul>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>A. Long stay (28+ nights)</p>
              <p style={{ ...fluidQaBody, margin: '4px 0' }}>
                We operate as a long-stay home designed for “living like a local in Paris.” Once dates are confirmed, it becomes very
                difficult to resell the period, so the following policy applies:
              </p>
              <ul style={{ ...listStyle, margin: '4px 0' }}>
                <li>Cancel 30+ days before check-in: full refund</li>
                <li>Cancel within 30 days of check-in: non-refundable</li>
              </ul>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. What happens if the balance payment fails?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                A. Balance payment may fail due to authorization issues, insufficient funds, card expiration, etc. In that case, the
                system will automatically retry up to 3 times, typically once per day.
              </p>
              <p style={{ ...fluidQaBody, margin: '8px 0 0 0' }}>
                If all 3 attempts fail, automatic retries stop and a manual secure payment link (Stripe Secure Payment Link) may be sent.
                If payment is not completed within the allowed period, the booking may be canceled.
              </p>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. What if there is an issue with the apartment after arrival?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                Please contact our support channel within 2 hours of check-in if the apartment condition differs from what was described
                or if an urgent issue occurs. We may request photo/video evidence, and will respond as follows:
              </p>
              <ol style={{ ...listStyle, margin: '8px 0' }}>
                <li>Fix / resolve immediately when possible</li>
                <li>Partial refund depending on impact and duration</li>
                <li>Cancellation and refund only if the issue is severe and makes the stay effectively impossible</li>
              </ol>
              <p style={{ ...fluidQaBody, margin: '4px 0 0 0' }}>
                Note: reports made after 2 hours may be limited because it becomes difficult to verify the condition at arrival time.
              </p>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. Is it safe to book directly without a platform?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                Yes. We operate with a transparent, hotel-level payment and policy structure so guests can book with confidence:
              </p>
              <ul style={{ ...listStyle, margin: '8px 0' }}>
                <li>Payments are processed through an internationally recognized payment provider (Stripe).</li>
                <li>A 40% deposit / 60% balance structure reduces the burden of paying 100% upfront.</li>
                <li>Support and refund options are available if an issue occurs shortly after check-in.</li>
                <li>Operator information and policies (refunds / disputes) are disclosed transparently.</li>
              </ul>
            </article>

            <article style={{ marginBottom: 'clamp(18px, 4vw, 24px)' }}>
              <h3 style={fluidQaHeading3}>Q. Is this a hotel?</h3>
              <div style={{ height: 12 }} />
              <p style={fluidQaBody}>
                No. This is a private home that the host previously lived in and shares with guests for certain periods.
              </p>
              <ul style={{ ...listStyle, margin: '8px 0' }}>
                <li>Self check-in</li>
                <li>No on-site staff</li>
                <li>Please use the space respectfully, as you would your own home</li>
              </ul>
            </article>
          </section>
        </div>
      </main>

      <BottomTabBar active="qa" />
    </div>
  );
}

