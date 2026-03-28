'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';
import type React from 'react';

export type HorizontalGalleryImage = {
  src?: string;
  alt?: string;
};

export type HorizontalGalleryProps = {
  /** Optional DOM id, e.g. Figma frame name like "거실사진" */
  id?: string;
  /** Images to render in the gallery. If src is omitted, a placeholder card is shown. */
  images: HorizontalGalleryImage[];
};

/** Reusable horizontal gallery with scroll-snap and floating chevrons. */
export function HorizontalGallery({ id, images }: HorizontalGalleryProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth || 280;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <div style={containerStyle}>
      <div
        ref={scrollRef}
        id={id}
        style={scrollAreaStyle}
      >
        {images.map((img, index) => (
          <div key={index} style={itemWrapperStyle}>
            {img.src ? (
              <Image
                src={img.src}
                alt={img.alt ?? ''}
                width={260}
                height={180}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 12,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div style={placeholderStyle} />
            )}
          </div>
        ))}
      </div>

      {/* SCROllChevron_left_Fix / SCROllChevron_right_Fix — fixed over gallery */}
      <button
        type="button"
        onClick={() => scroll('left')}
        aria-label="이전"
        style={chevronLeftStyle}
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        onClick={() => scroll('right')}
        aria-label="다음"
        style={chevronRightStyle}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'relative',
  marginBottom: 20,
};

const scrollAreaStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollSnapType: 'x mandatory',
  WebkitOverflowScrolling: 'touch',
  padding: '8px 0',
  margin: '0 -20px', // bleed to page edge similar to About page
};

const itemWrapperStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 272,
  height: 176,
  scrollSnapAlign: 'start',
};

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(13, 8, 34, 0.12)',
};

const chevronBaseStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
};

const chevronLeftStyle: React.CSSProperties = {
  ...chevronBaseStyle,
  left: 8,
};

const chevronRightStyle: React.CSSProperties = {
  ...chevronBaseStyle,
  right: 8,
};

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

