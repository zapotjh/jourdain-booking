'use client';

import Link from 'next/link';
import { AppHeaderWithBack } from '../../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../../components/layout/BottomTabBar';

/**
 * Terms & Conditions (English-only) — identical layout/style as Korean page.
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
      <AppHeaderWithBack
        titleKorean=""
        titleEnglish="TERMS & CONDITIONS"
        rightSlot={
          <Link
            href="/terms"
            style={{
              padding: '8.5px 11.9px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.24)',
              border: '1px solid rgba(13, 8, 34, 0.14)',
              color: '#0D0822',
              fontSize: 10.2,
              fontWeight: 600,
              textDecoration: 'none',
              lineHeight: 1.25,
              fontFamily:
                'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            KR
          </Link>
        }
      />

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
            📄 Terms &amp; Conditions (English)
          </h2>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>1. Nature of the Accommodation</h3>
          <p style={{ margin: '0 0 8px' }}>
            This property is not a hotel or professionally managed rental. It is a private home formerly lived in by the host,
            temporarily shared with guests for a defined period. No on-site staff, front desk, room service, or hotel-style amenities
            are provided.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            The building&apos;s structure, facilities, and surrounding environment reflect the character of an older Parisian residential
            building and may differ from a standard hotel. Guests acknowledge that this is a private home and agree to use the space with
            care and mutual respect.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>2. Booking Conditions</h3>
          <p style={{ margin: '0 0 8px' }}>Short-term stays: Minimum 2 nights.</p>
          <p style={{ margin: '0 0 8px' }}>Long-term stays: Minimum 28 nights, maximum 90 nights.</p>
          <p style={{ margin: '0 0 8px' }}>
            For long-term stays of 28 nights or more, a standard furnished rental agreement under French law (Bail mobilité) is prepared
            as part of the booking process. By confirming the reservation, the guest agrees to these Terms &amp; Conditions and the
            applicable agreement.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3. Payment</h3>
          <p style={{ margin: '0 0 8px' }}>Short-term stay:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>At booking: 40% reservation fee</li>
            <li>14 days before check-in: remaining 60% automatically charged</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>Long-term stay:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>At booking: 40% reservation fee</li>
            <li>30 days before check-in: remaining 60% automatically charged</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *All payments are processed through an internationally recognized payment provider. Card details are not stored.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>3-1. Balance Payment Retry Policy</h3>
          <p style={{ margin: '0 0 8px' }}>
            The remaining balance is automatically charged to the card used at booking. If payment fails due to insufficient funds, card
            expiration, or authorization failure, the system will automatically retry up to three (3) times, approximately every 24
            hours.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            If all three attempts fail, automatic retries will stop and the guest may receive a manual secure payment link (Stripe Secure
            Payment Link). If payment is not completed within the specified period, the reservation may be cancelled.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            3-2. Platform Bookings (Airbnb or Other Third-Party Platforms)
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            This property may accept reservations through third-party platforms such as Airbnb as well as directly through this website.
            Guests are free to choose their preferred booking channel.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            Reservations made through external platforms are subject to the payment systems and policies (cancellation, refunds, etc.) of
            those platforms. Reservations made directly through this website are governed solely by these Terms &amp; Conditions.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            The host is not responsible for differences in pricing, policies, cancellation rules, or payment structures between platform
            and direct bookings. Each reservation is processed independently according to the platform or website through which it was
            made.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>4. Cancellation &amp; Refund Policy</h3>
          <p style={{ margin: '0 0 8px' }}>Short-term stay:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Cancel 14+ days before check-in: full refund</li>
            <li>Cancel 14–7 days before check-in: 50% refund of reservation fee</li>
            <li>
              Cancel within 7 days of check-in or no-show: non-refundable (balance payment is processed at this point)
            </li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>Long-term stay:</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Cancel 30+ days before check-in: full refund</li>
            <li>Cancel within 30 days of check-in: non-refundable</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *For long-term stays, once dates are confirmed it becomes very difficult to resell the period, which is why this policy
            applies.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>
            4-1. Availability &amp; Double Booking Protection
          </h3>
          <p style={{ margin: '0 0 8px' }}>
            The host manages availability carefully across all booking channels. However, in rare cases, a double booking may occur
            during the approval process due to calendar synchronisation delays between platforms.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            If this happens, the host will cancel the affected reservation and provide a full refund. Where possible, the host will also
            make reasonable efforts to help the guest find alternative accommodation.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5. Security Deposit</h3>
          <p style={{ margin: '0 0 8px' }}>
            A fully refundable security deposit is required to protect the property and its contents. It is charged together with the
            remaining balance (60%) before check-in, and fully refunded after check-out if no damage, loss, or excessive cleaning is
            identified.
          </p>
          <p style={{ margin: '0 0 8px' }}>Amount: ≤14 nights €500 / &gt;14 nights €1,200</p>
          <p style={{ margin: '0 0 8px' }}>
            Refund: After check-out, staff will inspect the apartment within 3–5 business days. If no issues are found, the security
            deposit will be fully (100%) refunded.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>5-1. Damage Charges</h3>
          <p style={{ margin: '0 0 8px' }}>
            If damage, loss, or excessive cleaning is identified after check-out, the actual repair or replacement cost may be charged up
            to the security deposit amount. If the cost exceeds the deposit, the guest may be responsible for the additional amount.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>6. House Rules</h3>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Quiet hours: 10:00 PM – 8:00 AM</li>
            <li>No parties, events, or large gatherings</li>
            <li>No smoking inside the property</li>
            <li>No pets</li>
            <li>No guests beyond the registered number</li>
            <li>Please treat the property and its contents with care</li>
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            *Violation of these rules may result in immediate termination of the stay without refund.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>7. Maintenance &amp; Issue Handling</h3>
          <p style={{ margin: '0 0 8px' }}>
            The host makes every effort to ensure the property is in full working order. However, as with any private residential space,
            unexpected technical issues may arise (electricity, plumbing, heating, internet, appliances, etc.).
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-1. Reporting Window</h4>
          <p style={{ margin: '0 0 8px' }}>
            Any issues must be reported within 2 hours of check-in via the support channel, with photo or video evidence.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-2. Response Process</h4>
          <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            <li>Assessment of the issue</li>
            <li>Immediate repair or resolution where possible</li>
            <li>If resolution requires time: temporary alternative provided or partial refund considered</li>
          </ol>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-3. Wi-Fi Issues</h4>
          <p style={{ margin: '0 0 8px' }}>
            Troubleshooting will be attempted as a priority. If unresolved, a mobile eSIM for temporary internet access may be provided.
            Refunds for Wi-Fi outages will be calculated as partial refunds based on duration and severity.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-4. Major Issues</h4>
          <p style={{ margin: '0 0 8px' }}>
            The following may constitute situations where the stay is effectively impossible: inability to enter the property, total
            outage of electricity/water/heating, or serious hygiene issues. In such cases, cancellation and refund may be arranged.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>7-5. Late Reporting</h4>
          <p style={{ margin: '0 0 8px' }}>
            Issues reported more than 2 hours after check-in may be difficult to verify in terms of condition at arrival, and remedies or
            refunds may be limited as a result.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>8. Cleaning</h3>
          <p style={{ margin: '0 0 8px' }}>
            Professional cleaning is provided before arrival. Regular cleaning during the stay is not included as standard, but may be
            arranged as an additional service upon request.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>9. Liability</h3>
          <p style={{ margin: '0 0 8px' }}>
            The host is not responsible for accidents, loss, or theft caused by guest negligence. Guests are personally responsible for
            their own safety, health, and belongings during their stay.
          </p>

          <h4 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600 }}>9-1. Force Majeure</h4>
          <p style={{ margin: '0 0 8px' }}>
            The host shall not be held responsible for failure or delay in providing accommodation due to events beyond reasonable
            control, including but not limited to: natural disasters, government regulations, public utility failures, transportation
            disruptions, epidemics, war, civil disturbances, or strikes.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            In such circumstances, the host reserves the right to cancel the reservation or propose alternative dates, and will make
            reasonable efforts to assist the guest in finding an appropriate solution.
          </p>

          <h3 style={{ margin: '16px 0 4px', fontSize: 14, fontWeight: 600 }}>10. Governing Law &amp; Disputes</h3>
          <p style={{ margin: '0 0 8px' }}>
            Any disputes arising from these Terms &amp; Conditions shall be resolved under the laws of the host&apos;s country of residence.
            Both parties agree to seek resolution through mutual discussion as a first step.
          </p>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}

