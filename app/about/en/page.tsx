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

const LANGUAGE_TOGGLE_STYLE: React.CSSProperties = {
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
};

function SectionLabel({ en }: { en: string }) {
  return (
    <p style={fluidSectionLabel}>
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
        ...fluidSectionLabel,
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
              ...fluidBodyText,
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
function AboutPhoto({ src, alt }: { src: string; alt: string }) {
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
      <AppHeaderWithBack titleKorean="" titleEnglish="ABOUT" />

      <Link href="/about" style={LANGUAGE_TOGGLE_STYLE}>
        KR
      </Link>

      <main style={MAIN_STYLE}>
        {/* ABOUT */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-about-photo.png" alt="ABOUT PHOTO" />
          <div style={{ height: 18 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="ABOUT" />
            <h2 style={fluidDescriptionHeader}>Real Paris Living</h2>
            <ParagraphBlock
              text={[
                "For those who want to experience Paris beyond the tourist trail —",
                "I'm carefully opening up my home while it sits empty.",
                '',
                "JOURDAIN — a neighbourhood I'd keep to myself.",
                'The kind of place locals fiercely love but rarely talk about.',
                '',
                'A creative enclave where artists, architects and designers have quietly settled.',
                'The neighbourhood I loved most across more than a decade living in Paris.',
                '',
                'For young Parisians in their 20s and 30s,',
                "it's exactly where they'd want to live — yet nearly impossible to find a rental.",
                '',
                "This is where you feel 'Paris right now' most vividly.",
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
                'Jourdain / Belleville is one of the few corners of Paris',
                'where the creative everyday still feels genuinely alive.',
                "Real Paris doesn't begin at the landmarks — it begins here.",
                '',
                'Morning: pick up a baguette and croissant from the bakery right downstairs.',
                'Evening: wander through the street market three minutes away —',
                'the cheese stall, the charcuterie, the wine shop, the vegetable stand —',
                'and come home with flowers.',
                '',
                'At night, join the locals spilling out of neighbourhood bistros and wine bars,',
                'or bring something back, spread it across the table, and let the day end slowly.',
                '',
                "This place is for those who don't want to rush through Paris ticking off sights —",
                'but to briefly belong to it.',
                '',
                '*A supermarket is located directly below the building.',
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
                'Most museums and attractions in Paris',
                'are easily reachable within 30 minutes.',
                '',
                ">>After booking, I'll send you my personal list —",
                'ten years of Paris, distilled.',
              ].join('\n')}
              boldLines={[">>After booking, I'll send you my personal list —"]}
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
                'A thoughtfully renovated apartment that preserves the character',
                'of the original building while feeling quietly modern.',
                '',
                '⭐️ Airbnb Superhost / 4.98 rating for 3 consecutive years —',
                'designed so your stay is entirely comfortable.',
              ].join('\n')}
              boldLines={['⭐️ Airbnb Superhost / 4.98 rating for 3 consecutive years —']}
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
                'The living room catches generous afternoon light.',
                'At its centre hangs a 1970s Venini chandelier in hand-blown Murano glass —',
                'dimmable, so you can set exactly the mood you want.',
                '',
                'A cloud-shaped Ligne Roset sofa and coffee table complete the space —',
                'somewhere to properly rest.',
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
                'A microwave-oven, induction hob, washing machine and a dining island',
                'make the kitchen genuinely practical for cooking or a quiet meal at home.',
                '',
                'The entire kitchen is finished in marble by German manufacturer Schüller —',
                'even aperitivo hour has a certain beauty here.',
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
                'The bedroom has a queen-size bed, a dressing area, and an en-suite shower room.',
                '',
                'Four heaters across the living room and bedroom',
                'mean the apartment stays warm and comfortable even in winter.',
              ].join('\n')}
            />
          </div>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}

