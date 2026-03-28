import type { CSSProperties } from 'react';

/** Same cap as HOME / About media: grows with viewport, stops here. */
export const CONTENT_MAX_PX = 640;

/** Full-width content column (photos, text, calendar, Q&A) — identical resizing rule. */
export const contentShellStyle: CSSProperties = {
  width: `min(${CONTENT_MAX_PX}px, calc(100vw - 24px))`,
  maxWidth: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  boxSizing: 'border-box',
};

export const contentShellRelativeStyle: CSSProperties = {
  ...contentShellStyle,
  position: 'relative',
};

/** Text blocks: same outer width as images + fluid horizontal inset. */
export const contentTextColumnStyle: CSSProperties = {
  ...contentShellStyle,
  paddingLeft: 'clamp(12px, 4.2vw, 32px)',
  paddingRight: 'clamp(12px, 4.2vw, 32px)',
};

/** About page only: text & description moved 3px inward (extra side inset); resizing rule unchanged. */
export const aboutTextColumnStyle: CSSProperties = {
  ...contentShellStyle,
  paddingLeft: 'calc(3px + clamp(12px, 4.2vw, 32px))',
  paddingRight: 'calc(3px + clamp(12px, 4.2vw, 32px))',
};

/** Fluid type scales down on narrow viewports (paired with contentShell). */
export const fluidSectionLabel: CSSProperties = {
  fontSize: 'clamp(10px, 2.6vw, 12px)',
  fontWeight: 600,
  color: '#fbbc05',
  letterSpacing: '0.02em',
  margin: '0 0 clamp(4px, 1.2vw, 6px) 0',
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(4px, 1.2vw, 6px)',
};

export const fluidDescriptionHeader: CSSProperties = {
  fontSize: 'clamp(16px, 4.2vw, 18px)',
  fontWeight: 500,
  lineHeight: '140%',
  letterSpacing: '0.02em',
  color: '#0D0822',
  margin: '0 0 clamp(6px, 2vw, 10px) 0',
};

export const fluidBodyText: CSSProperties = {
  fontSize: 'clamp(13px, 3.2vw, 14.4px)',
  fontWeight: 500,
  lineHeight: '140%',
  letterSpacing: '0.02em',
  color: '#0D0822',
  margin: 0,
  whiteSpace: 'pre-line',
};

/** Q&A / dense text blocks */
export const fluidQaHeading1: CSSProperties = {
  fontSize: 'clamp(18px, 4.5vw, 20px)',
  fontWeight: 700,
  lineHeight: 1.4,
  margin: 0,
};

export const fluidQaHeading2: CSSProperties = {
  fontSize: 'clamp(18px, 4.5vw, 20px)',
  fontWeight: 700,
  lineHeight: 1.4,
  margin: 0,
};

export const fluidQaHeading3: CSSProperties = {
  fontSize: 'clamp(15px, 3.8vw, 17px)',
  fontWeight: 700,
  lineHeight: 1.4,
  margin: 0,
};

export const fluidQaBody: CSSProperties = {
  fontSize: 'clamp(13px, 3.2vw, 14px)',
  lineHeight: 1.4,
  margin: 0,
};

export const ABOUT_IMAGE_SIZES = `(max-width: ${CONTENT_MAX_PX}px) calc(100vw - 24px), ${CONTENT_MAX_PX}px`;
