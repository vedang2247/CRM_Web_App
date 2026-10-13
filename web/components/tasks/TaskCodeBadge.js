'use client';

import Link from 'next/link';

/**
 * TaskCodeBadge — Step 41 (M9)
 *
 * A small pill-shaped badge that links to a task detail page.
 * Used in ChatList, ChatThread, ThreadList, and ThreadView.
 *
 * Props:
 *  - taskId   : number   — task.id for building the href
 *  - taskCode : string   — formatted code e.g. "TSK0042"
 *  - count    : number?  — if provided, renders a "+N more" overflow indicator instead
 *  - className: string?  — optional extra classes
 *  - variant  : 'green' | 'blue' | 'indigo'   — colour theme (default 'indigo')
 */
export default function TaskCodeBadge({
  taskId,
  taskCode,
  count,
  className = '',
  variant = 'indigo',
}) {
  // Overflow indicator — no link, just "+ N more"
  if (count != null) {
    return (
      <span
        className={`inline-flex items-center text-[10px] font-semibold text-slate-500 ${className}`}
      >
        +{count} more
      </span>
    );
  }

  const variantClasses = {
    green:
      'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    blue:
      'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    indigo:
      'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  };

  return (
    <Link
      href={`/tasks/${taskId}`}
      className={`
        inline-flex items-center gap-1
        font-mono text-[10px] font-bold
        px-1.5 py-0.5 rounded
        border transition-colors
        ${variantClasses[variant] ?? variantClasses.indigo}
        ${className}
      `}
      title={`View task ${taskCode}`}
    >
      {/* Small task icon */}
      <svg
        className="w-2.5 h-2.5 shrink-0 opacity-70"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
      {taskCode}
    </Link>
  );
}
