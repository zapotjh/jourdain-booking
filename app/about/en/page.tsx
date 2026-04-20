'use client';

import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeaderWithBack } from '../../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { useCallback, useRef } from 'react';
import {
  CONTENT_MAX_PX,
  ABOUT_IMAGE_SIZES,
  contentShellRelativeStyle,
  aboutTextColumnStyle,
  fluidSectionLabel,
  fluidDescriptionHeader,
  fluidBodyText,
} from '@/lib/content-layout';

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#CAB1A4',
  color: 'rgba(13, 8, 34, 0.8)',
  paddingBottom: '55px',
  paddingTop: 42,
  position: 'relative',
};

/** Main column — same horizontal rule as photos/text. */
const MAIN_STYLE: React.CSSProperties = {
  width: '100%',
  padding: 'clamp(16px, 4vw, 24px) 0 clamp(28px, 6vw, 40px)',
  boxSizing: 'border-box',
};

/** Same shell width as photos; copy/labels +3px inward vs generic content column. */
const TEXT_COLUMN_STYLE = aboutTextColumnStyle;

const SECTION_GAP = 'clamp(20px, 5vw, 32px)';

const LANGUAGE_BUTTON_STYLE: React.CSSProperties = {
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
};

// About EN page: scale English copy up for readability.
// Target: body max ≈ 15px. Section label matches body size.
const fluidSectionLabelEn: React.CSSProperties = { ...fluidSectionLabel, fontSize: 'clamp(13.5px, 3.38vw, 15px)' };
const fluidDescriptionHeaderEn: React.CSSProperties = {
  ...fluidDescriptionHeader,
  fontSize: 'clamp(16.6px, 4.43vw, 18.75px)',
};
const fluidBodyTextEn: React.CSSProperties = { ...fluidBodyText, fontSize: 'clamp(13.5px, 3.38vw, 15px)' };

function SectionLabel({ en }: { en: string }) {
  return (
    <p style={fluidSectionLabelEn}>
      <span
        style={{
          width: 'clamp(5px, 1.2vw, 6px)',
          height: 'clamp(5px, 1.2vw, 6px)',
          borderRadius: 999,
          background: '#fbbc05',
          flexShrink: 0,
        }}
      />
      <span>{en}</span>
    </p>
  );
}

function MapTitleLabel({ title }: { title: string }) {
  return (
    <p
      style={{
        ...fluidSectionLabelEn,
        fontWeight: 600,
        letterSpacing: 0,
        marginBottom: 'clamp(8px, 2vw, 12px)',
      }}
    >
      <span
        style={{
          width: 'clamp(5px, 1.2vw, 6px)',
          height: 'clamp(5px, 1.2vw, 6px)',
          borderRadius: 999,
          background: '#fbbc05',
          flexShrink: 0,
        }}
      />
      <span>{title}</span>
    </p>
  );
}

function ParagraphBlock({ text, boldLines }: { text: string; boldLines?: string[] }) {
  const parts = text.split('\n\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.5vw, 14px)' }}>
      {parts.map((p, idx) => {
        const isBold = boldLines?.some((b) => p.includes(b));
        return (
          <p
            key={idx}
            style={{
              ...fluidBodyTextEn,
              fontWeight: isBold ? 700 : 500,
            }}
          >
            {p}
          </p>
        );
      })}
    </div>
  );
}

/** Hero / section photos — identical width to icons & gallery slides. */
function AboutPhoto({
  src,
  alt,
  overlayTopRight,
}: {
  src: string;
  alt: string;
  overlayTopRight?: React.ReactNode;
}) {
  return (
    <div style={contentShellRelativeStyle}>
      <Image
        src={src}
        alt={alt}
        width={CONTENT_MAX_PX * 2}
        height={CONTENT_MAX_PX}
        sizes={ABOUT_IMAGE_SIZES}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
        priority={false}
      />
      {overlayTopRight ? (
        <div
          style={{
            position: 'fixed',
            top: 45,
            left: '50%',
            transform: 'translateX(-50%)',
            width: contentShellRelativeStyle.width as string,
            zIndex: 15,
            lineHeight: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
          }}
        >
          {overlayTopRight}
        </div>
      ) : null}
    </div>
  );
}

/** Icon strips (*-ICON.png) — same outer width as photos. */
function AboutIconStrip({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ ...contentShellRelativeStyle, marginBottom: 12 }}>
      <Image
        src={src}
        alt={alt}
        width={800}
        height={120}
        sizes={ABOUT_IMAGE_SIZES}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

function CroppedPngButton({ href, src, alt }: { href: string; src: string; alt: string }) {
  return (
    <Link
      href={href}
      aria-label={alt}
      style={{
        display: 'block',
        position: 'relative',
        width: 'clamp(96px, 28vw, 120px)',
        height: 'clamp(32px, 9.5vw, 40px)',
        overflow: 'hidden',
        textDecoration: 'none',
        flexShrink: 0,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="120px"
        style={{ objectFit: 'cover', objectPosition: 'center', display: 'block' }}
      />
    </Link>
  );
}

/**
 * One slide = full width of the scrollport (same shell width as AboutPhoto).
 * Using 100vw-based slide width while the scroller was full-bleed made slides narrower
 * than the viewport on mobile → first slides looked left-heavy, last slide right-heavy.
 */
const GALLERY_SLIDE_STYLE: React.CSSProperties = {
  flex: '0 0 100%',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  scrollSnapAlign: 'start',
  scrollSnapStop: 'always',
  boxSizing: 'border-box',
};

function Gallery({ images, altPrefix }: { images: string[]; altPrefix: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth || 320;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <div style={{ ...contentShellRelativeStyle, marginBottom: 14 }}>
      <div
        ref={scrollRef}
        className="aboutGalleryScroll"
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'scroll',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: '8px 0',
          width: '100%',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x pinch-zoom',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'auto',
          isolation: 'isolate',
        }}
      >
        {images.map((src, index) => (
          <div key={src} data-about-gallery-slide style={GALLERY_SLIDE_STYLE}>
            <Image
              src={src}
              alt={`${altPrefix} ${index + 1}`}
              width={CONTENT_MAX_PX * 2}
              height={CONTENT_MAX_PX}
              sizes={ABOUT_IMAGE_SIZES}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll('left')}
        aria-label="Previous"
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <Image src="/scrollchchevron_left_fix.png" alt="" width={28} height={28} />
      </button>
      <button
        type="button"
        onClick={() => scroll('right')}
        aria-label="Next"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <Image src="/scrollchchevron_right_fix.png" alt="" width={28} height={28} />
      </button>
    </div>
  );
}

export default function AboutEnPage() {
  return (
    <div style={PAGE_STYLE}>
      <style>{`
        .aboutGalleryScroll {
          -webkit-overflow-scrolling: touch;
        }
        .aboutGalleryScroll::-webkit-scrollbar { display: none; height: 0; width: 0; }
      `}</style>
      <AppHeaderWithBack
        titleKorean=""
        titleEnglish="ABOUT"
        rightSlot={
          <Link href="/about" style={LANGUAGE_BUTTON_STYLE}>
            KR
          </Link>
        }
      />

      <main style={MAIN_STYLE}>
        {/* ABOUT */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto
            src="/About-about-photo.png"
            alt="ABOUT PHOTO"
            overlayTopRight={<CroppedPngButton href="/booking" src="/Home-Calender-button.png" alt="BOOK 예약하기" />}
          />
          <div style={{ height: 18 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="ABOUT" />
            <h2 style={fluidDescriptionHeaderEn}>Real Paris Living</h2>
            <ParagraphBlock
              text={[
                '"A Home for Living Paris, Not Visiting It"',
                "I'm carefully opening up my home",
                'while it sits empty.',
                '',
                'JOURDAIN. ',
                'Where artists, architects and designers have quietly made their lives.',
                'The part of Paris I loved most',
                'across more than a decade of living here.',
                '',
                'Come and feel what Paris actually is right now."',
              ].join('\n')}
            />
          </div>
        </section>

        {/* LOCATION */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-Location-photo.png" alt="LOCATION PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="LOCATION" />
          </div>
          <AboutIconStrip src="/About-LOCATION-ICON.png" alt="LOCATION ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                'Jourdain and Belleville are ',
                'where the real texture of Parisian life is still intact. ',
                'Not the landmarks. The everyday.',
                '',
                'The boulangerie is just a minute downstairs — ',
                'Croissant and baguette for your morning. ',
                'The fresh market, a 5-minute walk from home: ',
                'cheese counter, boucherie, poissonnerie, ',
                'a fine Italian épicerie, wine merchant, vegetable stall and flowershops.',
                '',
                'At night, the neighbourhood bistros and wine bars fill up with locals.',
                '',
                "This isn't a place for ticking things off a list. It's a place for briefly belonging somewhere.",
                '',
                "*There's a supermarket directly below the building.",
              ].join('\n')}
            />
          </div>
        </section>

        {/* MAP */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-MAP-photo.png" alt="MAP PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <MapTitleLabel title="From the apartment to key museums and landmarks" />
          </div>
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                "Most of Paris's museums and major landmarks",
                'are within 30min from the apartment.',
                '',
                'After booking, ',
                'my personal neighbourhood guide',
                'will be sent.',
              ].join('\n')}
              boldLines={['30min']}
            />
          </div>
        </section>

        {/* SPACE */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-space-photo.png" alt="SPACE PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="SPACE" />
          </div>
          <AboutIconStrip src="/About-SPACE-ICON.png" alt="SPACE ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                'A renovated apartment that kept',
                'what was worth keeping about the original building,',
                'and quietly updated the rest.',
                '',
                '⭐️ Airbnb Superhost — 4.98 across three consecutive years.',
              ].join('\n')}
              boldLines={['⭐️ Airbnb Superhost — 4.98 across three consecutive years.']}
            />
          </div>
        </section>

        {/* LIVING ROOM */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <Gallery
            altPrefix="LIVING ROOM"
            images={[
              '/LIVINGROOM PHOTO_Horizontal gallery1.png',
              '/LIVINGROOM PHOTO_Horizontal gallery2.png',
              '/LIVINGROOM PHOTO_Horizontal gallery3.png',
              '/LIVINGROOM PHOTO_Horizontal gallery4.png',
            ]}
          />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="LIVING ROOM" />
          </div>
          <AboutIconStrip src="/About-LIVINGROOM-ICON.png" alt="LIVING ROOM ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                'The living room gets natural light well into the late afternoon.',
                'Above the sofa, a 1970s Venini chandelier',
                'in hand-blown Murano glass —',
                'dimmable, so the atmosphere is always yours to set.',
                '',
                'A Ligne Roset sofa,',
                'a coffee table, and enough space',
                'to stay in.',
              ].join('\n')}
            />
          </div>
        </section>

        {/* KITCHEN */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <Gallery
            altPrefix="KITCHEN"
            images={[
              '/KITCHEN PHOTO_Horizontal gallery1.png',
              '/KITCHEN PHOTO_Horizontal gallery2.png',
              '/KITCHEN PHOTO_Horizontal gallery3.png',
              '/KITCHEN PHOTO_Horizontal gallery4.png',
            ]}
          />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="KITCHEN" />
          </div>
          <AboutIconStrip src="/About-KITCHEN-ICON.png" alt="KITCHEN ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                'Well equipped kitchen:',
                'A combi microwave-oven,',
                '3 induction hob,',
                'Washing machine,',
                'kitchen island that doubles as a dining table.',
                '',
                'The whole kitchen is finished in marble',
                'by German manufacturer Schüller —',
                'a good place to cook, or simply to be.',
              ].join('\n')}
            />
          </div>
        </section>

        {/* BEDROOM */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <Gallery
            altPrefix="BEDROOM"
            images={[
              '/BEDROOM PHOTO_Horizontal gallery1.png',
              '/BEDROOM PHOTO_Horizontal gallery2.png',
              '/BEDROOM PHOTO_Horizontal gallery3.png',
              '/BEDROOM PHOTO_Horizontal gallery4.png',
              '/BEDROOM PHOTO_Horizontal gallery5.png',
            ]}
          />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="BEDROOM" />
          </div>
          <AboutIconStrip src="/About-BEDROOM-ICON.png" alt="BEDROOM ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                'A queen-size bed, a dressing area,',
                'and a private shower room.',
                '',
                '4 heaters across the bedroom and living room —',
                'the apartment is warm, properly, even in winter.',
              ].join('\n')}
            />
          </div>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}

