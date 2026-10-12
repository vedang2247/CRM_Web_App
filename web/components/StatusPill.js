'use client';

/**
 * StatusPill — a small badge showing connected / disconnected state.
 * Used in TopNav for each integration.
 */
export default function StatusPill({ connected = false, label }) {
  const text = label ?? (connected ? 'Connected' : 'Disconnected');

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        rounded-full text-xs font-medium whitespace-nowrap
        transition-colors duration-300
        ${connected
          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-white/10 text-white/40 ring-1 ring-white/10'
        }
      `}
    >
      {/* Pulse dot */}
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            connected ? 'bg-emerald-400' : 'bg-white/30'
          }`}
        />
      </span>
      {text}
    </span>
  );
}
