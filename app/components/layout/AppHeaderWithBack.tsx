'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';

type AppHeaderWithBackProps = {
  titleKorean: string;
  /** Always uppercased inside the component. */
  titleEnglish: string;
  /** Fallback if no history exists. */
  backHref?: string;
  rightSlot?: React.ReactNode;
};

/** EXACTLY three spaces between labels (preserved via whiteSpace: 'pre' on the title node). */
const TITLE_JOIN = '   ';

export function AppHeaderWithBack({
  titleKorean,
  titleEnglish,
  backHref = '/',
  rightSlot,
}: AppHeaderWithBackProps) {
  const router = useRouter();
  const english = titleEnglish.toUpperCase();
  const title = titleKorean ? `${titleKorean}${TITLE_JOIN}${english}` : english;

  return (
    <header
      style={{
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#DBC8BE',
        borderBottom: '0.5px solid rgba(202, 177, 164, 0.8)',
        flexShrink: 0,
        zIndex: 20,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-afacad), Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => {
          // Primary behavior: true back.
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
          }
          router.push(backHref);
        }}
        style={{
          position: 'absolute',
          left: 16,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          color: '#0D0822',
        }}
        aria-label="뒤로 가기"
      >
        <span
          style={{
            width: 'clamp(24px, 4vw, 28px)',
            height: 'clamp(24px, 4vw, 28px)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block', objectFit: 'contain' }}
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          color: '#0D0822',
          letterSpacing: -0.34,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.4,
          /* Without this, browsers collapse the three spaces around `/` to a single space. */
          whiteSpace: 'pre',
        }}
      >
        {title}
      </p>

      {rightSlot ? (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 21,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {rightSlot}
        </div>
      ) : null}
    </header>
  );
}

