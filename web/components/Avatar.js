'use client';

/**
 * Avatar — renders a circle with the user's initials.
 * The background color is deterministically derived from the name
 * so the same person always gets the same color across sessions.
 */

/** Generate a hue (0–359) from any string */
function hashToHue(str) {
  if (!str) return 200;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

/** Extract up to two initials from a display name */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
};

export default function Avatar({ name = '', size = 'md', className = '' }) {
  const hue = hashToHue(name);
  const bg  = `hsl(${hue}, 40%, 42%)`; // muted, professional tone

  return (
    <div
      className={`
        flex items-center justify-center rounded-full
        font-semibold text-white select-none shrink-0
        ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md}
        ${className}
      `}
      style={{ backgroundColor: bg }}
      aria-label={name || 'Unknown'}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
