'use client';

import Link from 'next/link';

/** Active tab for the global bottom navigation. Used on HOME, Q&A, Terms, Booking requested, Booking Calendar; not on Checkout. */
export type BottomNavTab = 'home' | 'calendar' | 'qa';

export type BottomNavProps = {
  /** Which tab is currently active (for visual state only; links are fixed). */
  active: BottomNavTab;
};

const TABS: { tab: BottomNavTab; href: string; label: string }[] = [
  { tab: 'home', href: '/', label: 'Home' },
  { tab: 'calendar', href: '/booking', label: 'Calendar' },
  { tab: 'qa', href: '/qa', label: 'Q&A' },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '58px',
        background: 'rgba(219, 200, 190, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0px -0.5px 0px 0px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingBottom: 8,
        boxSizing: 'border-box',
        zIndex: 10,
      }}
      aria-label="하단 메뉴"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
        }}
      >
        {TABS.map(({ tab, href, label }) => (
          <Link
            key={tab}
            href={href}
            style={{
              fontSize: 12,
              fontWeight: active === tab ? 600 : 400,
              color: 'rgba(13, 8, 34, 0.8)',
              opacity: active === tab ? 1 : 0.79,
              textDecoration: 'none',
            }}
            aria-current={active === tab ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </div>
      {/* Home indicator pill (Figma) */}
      <div
        style={{
          width: '134px',
          height: '3px',
          borderRadius: 100,
          background: 'rgba(13, 8, 34, 0.8)',
        }}
        aria-hidden
      />
    </nav>
  );
}
