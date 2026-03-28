'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** Figma: "Header" — left Icon/Chevron_Left (go back), center title, optional right slot */
export type HeaderBarProps = {
  /** Korean part — combined with titleEnglish only inside the component (same rules as AppHeaderWithBack). */
  titleKorean?: string;
  /** English part — uppercased inside the component. */
  titleEnglish?: string;
  /** Optional right-side content (e.g. "예약하기" CTA). */
  rightSlot?: ReactNode;
  /** If set, back button navigates to this href. If unset, uses router.back(). */
  backHref?: string;
  /** Accessible label for the back button */
  backLabel?: string;
};

const CHEVRON_LEFT = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TITLE_JOIN = '   /   ';

export function HeaderBar({
  titleKorean,
  titleEnglish,
  rightSlot,
  backHref,
  backLabel = '뒤로 가기',
}: HeaderBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const displayTitle =
    titleKorean && titleEnglish
      ? `${titleKorean}${TITLE_JOIN}${titleEnglish.toUpperCase()}`
      : (titleKorean ?? titleEnglish ?? '');

  return (
    <header
      style={{
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: 'rgba(219, 200, 190, 0.8)',
        borderBottom: '0.5px solid rgba(202, 177, 164, 0.8)',
        flexShrink: 0,
        boxSizing: 'border-box',
        padding: '0 16px',
        fontFamily: 'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Left: back button — Icon/Chevron_Left, behavior: go back */}
      {backHref ? (
        <Link
          href={backHref}
          style={backButtonStyle}
          aria-label={backLabel}
        >
          {CHEVRON_LEFT}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleBack}
          style={backButtonStyle}
          aria-label={backLabel}
        >
          {CHEVRON_LEFT}
        </button>
      )}

      {/* Center: title — 17px/19px semibold per Figma */}
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          color: '#0D0822',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: -0.2,
          whiteSpace: 'pre',
        }}
      >
        {displayTitle}
      </p>

      {/* Right: optional slot (e.g. 예약하기) */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {rightSlot ?? null}
      </div>
    </header>
  );
}

const backButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#0D0822',
};
