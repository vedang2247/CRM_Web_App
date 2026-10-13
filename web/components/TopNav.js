'use client';

import Link          from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector }  from 'react-redux';
import StatusPill       from './StatusPill';

const TABS = [
  { label: 'Connections', href: '/connections', id: 'nav-connections' },
  { label: 'WhatsApp',    href: '/whatsapp',    id: 'nav-whatsapp'    },
  { label: 'Email',       href: '/email',       id: 'nav-email'       },
  { label: 'Tasks',       href: '/tasks',       id: 'nav-tasks'       },
  { label: 'Templates',   href: '/templates',   id: 'nav-templates'   },
];

export default function TopNav() {
  const pathname     = usePathname();
  const waState      = useSelector((s) => s.connections.wa.state);
  const gmailConnected = useSelector((s) => s.connections.gmail.connected);

  const waConnected  = waState === 'ready';

  return (
    <header className="sticky top-0 z-50 flex items-center h-14 px-4 bg-wa-header shadow-md">
      {/* ── Brand ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mr-8 shrink-0">
        {/* Icon */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-wa-accent shadow-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-sm tracking-wide leading-none">
          CRM
        </span>
      </div>

      {/* ── Navigation tabs ─────────────────────────────────────── */}
      <nav className="flex items-center gap-0.5 flex-1" aria-label="Main navigation">
        {TABS.map(({ label, href, id }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              id={id}
              href={href}
              className={`
                px-4 py-1.5 rounded-md text-sm font-medium
                transition-all duration-150
                ${active
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
                }
              `}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Status pills ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusPill
          connected={waConnected}
          label={waConnected ? 'WhatsApp' : 'WA Off'}
        />
        <StatusPill
          connected={gmailConnected}
          label={gmailConnected ? 'Gmail' : 'Gmail Off'}
        />
      </div>
    </header>
  );
}
