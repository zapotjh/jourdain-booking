'use client';

import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeaderWithBack } from '../components/layout/AppHeaderWithBack';
import { BottomTabBar } from '../components/layout/BottomTabBar';
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

function SectionLabel({ en, kr }: { en: string; kr: string }) {
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
      <span style={{ opacity: 0.9 }}> / </span>
      <span>{kr}</span>
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
            // Booking CTA should stay in the same viewport position while scrolling.
            // We anchor it below the fixed header and align it to the same centered
            // content width (so it visually matches the original top-right placement).
            position: 'fixed',
            top: 45,
            left: '50%',
            transform: 'translateX(-50%) translate(2px, 0px)',
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
        aria-label="이전"
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
        aria-label="다음"
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

export default function AboutPage() {
  return (
    <div style={PAGE_STYLE}>
      <style>{`
        .aboutGalleryScroll {
          -webkit-overflow-scrolling: touch;
        }
        .aboutGalleryScroll::-webkit-scrollbar { display: none; height: 0; width: 0; }
      `}</style>
      <AppHeaderWithBack
        titleKorean="집 소개"
        titleEnglish="ABOUT"
        rightSlot={
          <Link href="/about/en" style={LANGUAGE_TOGGLE_STYLE}>
            EN
          </Link>
        }
      />

      {/* Main content container — "내용": single vertical scroll */}
      <main style={MAIN_STYLE}>
        {/* ABOUT */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto
            src="/About-about-photo.png"
            alt="ABOUT PHOTO"
            overlayTopRight={
              <CroppedPngButton href="/booking" src="/Home-Calender-button.png" alt="BOOK 예약하기" />
            }
          />

          <div style={{ height: 18 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="ABOUT" kr="이 공간은?" />
            <h2 style={fluidDescriptionHeader}>진짜파리살기</h2>
            <ParagraphBlock
              text={[
                '관광용 숙소에서는 느낄 수 없는 파리를',
                '살아보고 싶으신 분들을 위해',
                '지금 비워져 있는 제 집을',
                '조심스럽게 내어놓습니다',
                '',
                '현지인이 가장 사랑하는',
                '나만 알고 싶은 동네 JOURDAIN',
                '',
                '아티스트, 건축가, 디자이너 등',
                '크리에이티브들이 많이 모여 사는 동네로',
                '제가 10년 넘게 파리에 살며',
                '가장 사랑했던 곳입니다',
                '',
                '20–30대 파리지안들에게는',
                '지금 가장 살고 싶지만',
                '렌트를 구하기가 거의 불가능한 곳',
                '',
                '‘지금의 파리’를 가장 생생하게 느낄 수 있는',
                '동네 입니다',
              ].join('\n')}
            />
          </div>
        </section>

        {/* LOCATION */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-Location-photo.png" alt="LOCATION PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="LOCATION" kr="위치" />
          </div>
          <AboutIconStrip src="/About-LOCATION-ICON.png" alt="LOCATION ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '주르당/벨빌은 파리에서도 유난히',
                '창작자들의 생활감이 살아있는 지역입니다',
                '유명 랜드마크 대신, 진짜 파리는 이런 곳에서 시작되요',
                '',
                '아침엔 집 바로 밑 빵집에서 바게트와 크로와상을 사오고,',
                '저녁에는 도보3분거리의 시장에 나가',
                '치즈가게, 햄가게, 와인가게, 채소 가게를 둘러보며 장을 보고',
                '돌아오는 길엔 꽃을 사들고 오기도 하는 일상을 경험하세요',
                '',
                '저녁엔 사람들로 북적이는 동네 비스트로와 와인바',
                '혹은 포장해온 음식을 테이블에 올려두고',
                '하루를 게으르게 보내보세요',
                '',
                '이 곳은 파리를 “찍고 다니는 여행”이 아니라',
                '파리에 잠깐 속해보는 체류를 원하는 분들에게',
                '가장 잘 맞습니다',
                '',
                '*슈퍼마켓이 건물 바로 아래에 위치해 있어 편리합니다.',
              ].join('\n')}
            />
          </div>
        </section>

        {/* MAP */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-MAP-photo.png" alt="MAP PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <MapTitleLabel title="집 에서 주요 박물관, 명소 가는 길" />
          </div>
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '30분 내에 대부분의 뮤지엄, 관광 명소에 쉽게 가실 수 있는',
                '편리한 위치에 집이 있습니다.',
                '',
                '>>예약 후, 파리 살이 10년 차의 비밀 리스트를 보내드려요',
              ].join('\n')}
              boldLines={['>>예약 후, 파리 살이 10년 차의 비밀 리스트를 보내드려요']}
            />
          </div>
        </section>

        {/* SPACE — replace public/About-space-photo.png on disk when the asset updates */}
        <section style={{ marginBottom: SECTION_GAP }}>
          <AboutPhoto src="/About-space-photo.png" alt="SPACE PHOTO" />
          <div style={{ height: 14 }} />
          <div style={TEXT_COLUMN_STYLE}>
            <SectionLabel en="SPACE" kr="공간 상세" />
          </div>
          <AboutIconStrip src="/About-SPACE-ICON.png" alt="SPACE ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '고풍스러운 건물의 분위기를 유지하면서',
                '모던하게 리노베이션을 마친 아파트입니다.',
                '',
                '⭐️ 에어비앤비 슈퍼호스트 / 3년 연속 평점 4.98',
                '으로 불편함 없이 지낼 수 있도록 꾸며져 있습니다',
              ].join('\n')}
              boldLines={['⭐️ 에어비앤비 슈퍼호스트 / 3년 연속 평점 4.98']}
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
            <SectionLabel en="LIVING ROOM" kr="거실" />
          </div>
          <AboutIconStrip src="/About-LIVINGROOM-ICON.png" alt="LIVING ROOM ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '채광이 좋아 해가 늦은 오후까지 드는 거실에는',
                '무라노 글라스로 제작된',
                '70년대 베니니(Venini) 샹들리에가',
                '설치되어 있으며 조도 조절이 가능해',
                '시간대와 분위기에 따라 원하시는 무드로',
                '바꾸실 수 있습니다.',
                '',
                '구름처럼 생긴 리네 로제(Ligne Roset) 소파와',
                '커피테이블이 있어',
                '편안하게 쉴 수 있는 공간이 마련되어있습니다',
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
            <SectionLabel en="KITCHEN" kr="부엌" />
          </div>
          <AboutIconStrip src="/About-KITCHEN-ICON.png" alt="KITCHEN ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '전자레인지 겸용 오븐과 인덕션 세탁기',
                '다이닝 테이블 겸 아일랜드로 구성된 주방은',
                '집에서 요리를 하거나',
                '간단한 식사를 준비하기에 매우 편리합니다',
                '',
                '주방 전체가 독일 슐러(Schüller)사의',
                '대리석으로 마감되어있어',
                '아페로와 식사시간도',
                '아름다운 미감을 즐기며 보내실 수 있습니다.',
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
            <SectionLabel en="BEDROOM" kr="침실" />
          </div>
          <AboutIconStrip src="/About-BEDROOM-ICON.png" alt="BEDROOM ICONS" />
          <div style={TEXT_COLUMN_STYLE}>
            <ParagraphBlock
              text={[
                '침실에는 퀸사이즈 침대와,',
                '드레싱공간이 마련되어 있으며',
                '샤워룸이 갖춰진 화장실이 있습니다.',
                '',
                '거실과 침실에 총 4개의 히터가 설치되어 있어',
                '겨울에도 따뜻하고 쾌적하게 머무실 수 있습니다.',
              ].join('\n')}
            />
          </div>
        </section>
      </main>

      <BottomTabBar active="home" />
    </div>
  );
}
