/**
 * Minimalist line-art SVG illustrations for empty states.
 * Strokes use the brand palette via the `color` prop.
 */

const baseProps = (color) => ({
  width: 96,
  height: 96,
  viewBox: '0 0 96 96',
  fill: 'none',
  stroke: color,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: { opacity: 0.9 },
  'aria-hidden': true,
});

export function EmptyWorkouts({ color = '#6C5CE7' }) {
  return (
    <svg {...baseProps(color)}>
      <circle cx="48" cy="48" r="40" stroke={`${color}33`} />
      {/* dumbbell */}
      <rect x="20" y="42" width="8" height="12" rx="2" />
      <rect x="68" y="42" width="8" height="12" rx="2" />
      <rect x="14" y="38" width="6" height="20" rx="2" />
      <rect x="76" y="38" width="6" height="20" rx="2" />
      <line x1="28" y1="48" x2="68" y2="48" />
    </svg>
  );
}

export function EmptyFriends({ color = '#FD79A8' }) {
  return (
    <svg {...baseProps(color)}>
      <circle cx="48" cy="48" r="40" stroke={`${color}33`} />
      <circle cx="38" cy="40" r="9" />
      <path d="M24 68c0-9 6.5-15 14-15s14 6 14 15" />
      <circle cx="62" cy="36" r="7" />
      <path d="M58 52c8 0 13 5 13 13" />
    </svg>
  );
}

export function EmptyLeaderboard({ color = '#FDCB6E' }) {
  return (
    <svg {...baseProps(color)}>
      <circle cx="48" cy="48" r="40" stroke={`${color}33`} />
      <path d="M34 28h28v8a14 14 0 0 1-28 0z" />
      <path d="M34 30h-7v4a7 7 0 0 0 7 7M62 30h7v4a7 7 0 0 1-7 7" />
      <line x1="48" y1="50" x2="48" y2="60" />
      <path d="M38 68h20l-2-8H40z" />
    </svg>
  );
}

export function EmptySearch({ color = '#00CEC9' }) {
  return (
    <svg {...baseProps(color)}>
      <circle cx="48" cy="48" r="40" stroke={`${color}33`} />
      <circle cx="43" cy="43" r="14" />
      <line x1="54" y1="54" x2="66" y2="66" />
    </svg>
  );
}

/**
 * Wrapper that arranges an illustration with title / subtitle / action.
 */
export default function EmptyState({ illustration, title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        gap: 6,
      }}
    >
      <div style={{ marginBottom: 8 }}>{illustration}</div>
      {title && (
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{title}</p>
      )}
      {subtitle && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
