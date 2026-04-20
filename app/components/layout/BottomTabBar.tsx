'use client';

import Link from 'next/link';
import Image from 'next/image';

type BottomTabBarProps = {
  active: 'home' | 'calendar' | 'qa';
};

export function BottomTabBar({ active }: BottomTabBarProps) {
  const barHeight = 55;
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: barHeight,
        backgroundColor: 'rgba(219, 200, 190, 0.8)', // #DBC8BE at 80% (background only)
        boxShadow: '0px -0.5px 0px 0px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 390, // mobile-width based layout even on desktop
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'center',
          justifyItems: 'center',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* NOTE: tab-about.png is expected; if missing, this will not render. */}
        <TabLink href="/about" iconSrc="/tab-about.png" label="About" active={active === 'home'} iconWidth={42} />
        <TabLink href="/booking" iconSrc="/tab-calendar.png" label="Calendar" active={active === 'calendar'} iconWidth={38} />
        <TabLink href="/qa" iconSrc="/tab-qa.png" label="Q&A" active={active === 'qa'} iconWidth={40} />
      </div>
    </nav>
  );
}

type TabLinkProps = {
  href: string;
  iconSrc: string;
  label: string; // aria-label
  active: boolean;
  iconWidth: number;
};

function TabLink({ href, iconSrc, label, active, iconWidth }: TabLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        opacity: active ? 1 : 0.79,
      }}
    >
      <Image
        src={iconSrc}
        alt={label}
        width={iconWidth}
        height={iconWidth}
        style={{ width: iconWidth, height: 'auto', objectFit: 'contain', display: 'block' }}
      />
    </Link>
  );
}

