'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { taskCode } from '@/lib/normalise';

const STATUS_CONFIG = {
  open: { label: 'Open', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  waiting: { label: 'Waiting', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200', dot: 'bg-zinc-400' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  high: { label: 'High', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'Low', bg: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function TaskCard({ task }) {
  const router = useRouter();

  const code = taskCode(task.id);
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'resolved' &&
    task.status !== 'closed';

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const linkCount = task._count?.links ?? task.links?.length ?? 0;
  const emailCount = task._count?.sentEmails ?? task.sentEmails?.length ?? 0;

  return (
    <div
      onClick={() => router.push(`/tasks/${task.id}`)}
      className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative"
    >
      {/* Top row: Code + Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
            {code}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${priorityCfg.bg}`}
        >
          {priorityCfg.label}
        </span>
      </div>

      {/* Title & Description */}
      <div>
        <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Meta Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {/* Client & Assignee */}
        <div className="flex items-center gap-2 min-w-0">
          {task.client ? (
            <div className="flex items-center gap-1 text-slate-600 truncate max-w-[140px]" title={task.client.name}>
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate font-medium">{task.client.name}</span>
            </div>
          ) : (
            <span className="text-slate-400 italic">No client</span>
          )}

          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-wa-header text-white flex items-center justify-center text-[10px] font-semibold shrink-0"
              title={`Assignee: ${task.assignee.name}`}
            >
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Due Date & Activity counters */}
        <div className="flex items-center gap-2 shrink-0">
          {(linkCount > 0 || emailCount > 0) && (
            <div className="flex items-center gap-1.5 text-slate-400">
              {linkCount > 0 && (
                <span className="flex items-center gap-0.5 text-[11px]" title={`${linkCount} linked messages`}>
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {linkCount}
                </span>
              )}
              {emailCount > 0 && (
                <span className="flex items-center gap-0.5 text-[11px]" title={`${emailCount} sent emails`}>
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {emailCount}
                </span>
              )}
            </div>
          )}

          {formattedDueDate && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                isOverdue
                  ? 'bg-rose-50 text-rose-700 font-semibold'
                  : 'text-slate-500'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formattedDueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
