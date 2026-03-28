import Image from 'next/image';
import Link from 'next/link';
import { BottomTabBar } from './components/layout/BottomTabBar';

/**
 * Production landing: branding + navigation only.
 * Standalone Stripe Checkout (manual test) lives under /dev/payment-link-test.
 */
export default function Page() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#CAB1A4',
        color: 'rgba(13, 8, 34, 0.8)',
        paddingBottom: '55px',
        position: 'relative',
      }}
    >
      <main
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 55px)',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              letterSpacing: '0.04em',
              fontFamily:
                'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            주르당 아파트
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(640px, calc(100vw - 24px))',
            maxWidth: '100%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              transform: 'translateY(calc(-50% - clamp(22px, 6vw, 30px)))',
            }}
          >
            <Image
              src="/logo.png"
              alt="L'appartement Jourdain"
              width={640}
              height={320}
              sizes="(max-width: 640px) calc(100vw - 24px), 640px"
              style={{
                width: '100%',
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
              }}
              priority
            />
          </div>
        </div>

        <Link
          href="/about"
          aria-label="집 소개 보러가기"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(44px, 15vw, 60px)',
            height: 'clamp(44px, 15vw, 60px)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src="/Home-About-button.png"
            alt="집 소개 보러가기"
            width={60}
            height={60}
            sizes="(max-width: 400px) 44px, 60px"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Link>

        <div style={{ position: 'fixed', left: '50%', bottom: 65, transform: 'translateX(-50%)' }}>
          <Link href="/booking" aria-label="예약달력 열기" style={{ display: 'block' }}>
            <Image
              src="/Home-Calender-button.png"
              alt="예약달력 열기"
              width={140}
              height={48}
              sizes="(max-width: 600px) 120px, 140px"
              style={{
                width: 'clamp(120px, 14vw, 160px)',
                maxWidth: 140,
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Link>
        </div>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}
