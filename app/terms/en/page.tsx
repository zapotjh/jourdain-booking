'use client';

import Link from 'next/link';
import { AppHeaderWithBack } from '../../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../../components/layout/BottomTabBar';

/**
 * Terms & Conditions (English-only) — same layout/style as Korean page.
 * Presentational only. No API calls; no booking/payment logic.
 */
export default function TermsEnPage() {
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
      <AppHeaderWithBack titleKorean="" titleEnglish="TERMS & CONDITIONS" />

      <Link
        href="/terms"
        style={{
          position: 'fixed',
          top: 46,
          right: 'calc((100vw - min(640px, calc(100vw - 24px))) / 2 + 12px)',
          zIndex: 21,
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
        }}
      >
        KR
      </Link>

      <main
        style={{
          padding: '16px 16px 24px',
          boxSizing: 'border-box',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        {/* Top row: title + policy/legal buttons */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.4,
              color: 'rgba(13, 8, 34, 0.9)',
            }}
          >
            Terms &amp; Conditions
          </h1>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 160,
            }}
          >
            <a
              href="/privacy"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 999,
                border: '1px solid rgba(13, 8, 34, 0.12)',
                background: 'rgba(255,255,255,0.18)',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(13, 8, 34, 0.9)',
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
            >
              <span>Privacy policy</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>›</span>
            </a>
            <a
              href="/legal"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 999,
                border: '1px solid rgba(13, 8, 34, 0.12)',
                background: 'rgba(255,255,255,0.18)',
                fontSize: 12,
                fontWeight: 500,
                color: 'rgba(13, 8, 34, 0.9)',
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
            >
              <span>Legal notice</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>›</span>
            </a>
          </div>
        </header>

        <section
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'rgba(13, 8, 34, 0.8)',
          }}
        >
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            📄 Long-Term Stay Terms &amp; Conditions (English)
          </h2>

          <h3 style={{ margin: '12px 0 4px', fontSize: 14, fontWeight: 600 }}>1. Nature of the Accommodation</h3>
          <p style={{ margin: '0 0 8px' }}>
            This property is not a hotel or serviced apartment. It is a private home formerly lived in by the host and temporarily
            shared with guests. No front desk, room service, or hotel-style services are provided. Guests agree to treat the space with
            care and mutual respect.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>2. Booking Conditions</h3>
          <p style={{ margin: '0 0 4px' }}>Short-term stays: Minimum stay of 2 nights.</p>
          <p style={{ margin: '0 0 4px' }}>Long-term stays: Minimum 28 nights, maximum 90 nights.</p>
          <p style={{ margin: '0 0 8px' }}>
            For long-term stays (28 nights or more), a rental agreement in the form of a French legally compliant furnished rental
            contract (Bail de location meublée / Bail mobilité) will be automatically generated. By confirming the reservation, the
            guest agrees to and electronically signs this contract. By confirming a reservation, the guest is deemed to have agreed to
            these Terms &amp; Conditions as well as the applicable rental contract.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3. Payment</h3>
          <p style={{ margin: '0 0 4px' }}>At booking: 40% deposit</p>
          <p style={{ margin: '0 0 4px' }}>30 days before check-in: Remaining 60% automatically charged</p>
          <p style={{ margin: '0 0 8px' }}>
            Payments are processed through an internationally recognized payment provider. Card details are not stored.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3-1. Balance Payment Retry Policy</h3>
          <p style={{ margin: '0 0 8px' }}>
            The remaining balance will be automatically charged to the card used at the time of booking. If the payment fails due to
            card issues such as insufficient funds, card expiration, or authorization failure, the system will automatically retry the
            charge up to three (3) times. Retry attempts are made approximately every 24 hours. If all three attempts fail, automatic
            retries will stop and the guest may receive a manual secure payment link via Stripe to complete the payment. If the balance
            remains unpaid within the specified period, the reservation may be cancelled.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            3-2. Platform Bookings (Airbnb or Other Third-Party Platforms)
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            This property may accept reservations both through third-party booking platforms such as Airbnb and through this website.
            Guests are free to choose their preferred booking channel, and no specific platform is required for making a reservation.
            Reservations made through external platforms such as Airbnb remain subject to the policies, payment systems, and
            cancellation rules of those platforms. Reservations made directly through this website are governed solely by the Terms &amp;
            Conditions described here. The host is not responsible for differences in pricing, policies, cancellation rules, or payment
            structures between platform bookings and direct bookings. Each reservation is processed independently according to the
            policies and payment systems of the platform or website through which the booking was completed.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>4. Cancellation &amp; Refund</h3>
          <p style={{ margin: '0 0 8px' }}>
            Cancel 30 days before check-in: Full refund. Cancel within 30 days: Non-refundable.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            4-1. Availability &amp; Double Booking Protection
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            Although the host carefully manages availability across platforms, rare situations may occur where overlapping reservations
            happen due to synchronization delays between booking systems. In such cases, the host reserves the right to cancel the
            reservation and provide a full refund to the affected guest. The host will make reasonable efforts to assist the guest in
            finding alternative accommodation if such a situation occurs.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5. Security Deposit</h3>
          <p style={{ margin: '0 0 8px' }}>
            A fully refundable security deposit applies to protect the property and its contents. It will be charged together with the
            remaining balance before check-in, and fully refunded after checkout if no damage, loss, or excessive cleaning is identified.
            <br />
            Amount: ≤14 nights €500 / &gt;14 nights €1,200
            <br />
            Refund timing: After checkout, our staff will inspect the apartment within 3-5 business days. If no issues are found, the
            security deposit will be fully (100%) refunded.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5-1. Damage Charges</h3>
          <p style={{ margin: '0 0 8px' }}>
            If damage, loss, or excessive cleaning is identified after check-out, the host may charge the actual repair or replacement
            cost up to the security deposit amount. In cases where the damage exceeds the deposit amount, the guest may be responsible
            for the additional cost.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>6. House Rules</h3>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Quiet hours: 10 PM – 8 AM</li>
            <li>No parties or events</li>
            <li>No smoking</li>
            <li>No pets</li>
            <li>Only registered guests allowed</li>
            <li>Treat the home as your own</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>Violation may result in immediate termination without refund.</p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>7. Maintenance &amp; Issue Handling</h3>
          <p style={{ margin: '0 0 4px' }}>
            Please notify the host within 2 hours of check-in with photo/video evidence for any issues.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>Wi-Fi Issues</h4>
          <p style={{ margin: '0 0 4px' }}>Troubleshooting will be attempted.</p>
          <p style={{ margin: '0 0 8px' }}>
            If unresolved, a mobile eSIM for temporary internet access may be provided. Partial refunds may apply based on duration and
            severity.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>Major Issues</h4>
          <p style={{ margin: '0 0 8px' }}>
            Inability to enter, total utility outage, or serious hygiene issues may result in cancellation and refund.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>8. Cleaning</h3>
          <p style={{ margin: '0 0 8px' }}>
            Professional cleaning is provided before arrival. No regular cleaning is included during the stay unless requested as an
            additional service.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>9. Liability</h3>
          <p style={{ margin: '0 0 8px' }}>
            The host is not responsible for personal injury, loss, or theft. Guests are responsible for their own belongings and safety.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>9-1. Force Majeure</h4>
          <p style={{ margin: '0 0 8px' }}>
            The host shall not be held responsible for failure or delay in providing accommodation due to events beyond the host&apos;s
            reasonable control. Such events may include, but are not limited to, natural disasters, government regulations, public utility
            failures, transportation disruptions, epidemics, war, civil disturbances, strikes, or other force majeure events. In such
            circumstances, the host reserves the right to cancel the reservation or propose alternative dates. The host will make
            reasonable efforts to assist the guest in finding an appropriate solution whenever possible.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>10. Governing Law &amp; Disputes</h3>
          <p style={{ margin: '0 0 8px' }}>
            Disputes shall be resolved under the laws of the host’s country of residence.
          </p>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}

