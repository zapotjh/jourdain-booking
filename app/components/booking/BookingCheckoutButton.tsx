'use client';

type BookingCheckoutButtonProps = {
  enabled: boolean;
  onClick: () => void;
};

export function BookingCheckoutButton({ enabled, onClick }: BookingCheckoutButtonProps) {
  const bg = enabled ? 'rgba(189, 158, 141, 1.0)' : 'rgba(189, 158, 141, 0.7)';
  const color = enabled ? 'rgba(13, 8, 34, 0.9)' : 'rgba(13, 8, 34, 0.35)';

  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      aria-disabled={!enabled}
      style={{
        marginTop: 'clamp(10px, 2.5vw, 16px)',
        padding: 'clamp(10px, 2.5vw, 12px) clamp(18px, 5vw, 24px)',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 999,
        border: 'none',
        cursor: enabled ? 'pointer' : 'default',
        background: bg,
        color,
        fontSize: 'clamp(13px, 3.2vw, 14px)',
        fontWeight: 600,
        fontFamily: 'Afacad, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        boxShadow: enabled ? '0 4px 14px rgba(13, 8, 34, 0.15)' : 'none',
        transition: 'background 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      CHECK OUT
    </button>
  );
}

