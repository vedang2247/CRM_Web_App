'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { loadTask } from '@/lib/slices/tasksSlice';
import { taskCode } from '@/lib/normalise';
import TaskInfo from '@/components/tasks/TaskInfo';
import LinkedCommsTimeline from '@/components/tasks/LinkedCommsTimeline';

export default function TaskDetailPage() {
  const params = useParams();
  const dispatch = useDispatch();
  const taskId = params.id;

  const { taskDetail, detailLoading, detailError } = useSelector((s) => s.tasks);
  const task = taskDetail[taskId];

  // Mobile tab toggle between "Details" and "Timeline"
  const [mobileTab, setMobileTab] = useState('details');

  useEffect(() => {
    if (taskId) {
      dispatch(loadTask(taskId));
    }
  }, [taskId, dispatch]);

  const code = taskId ? taskCode(taskId) : 'TSK';

  // ── Loading State ──────────────────────────────────────────────────
  if (detailLoading && !task) {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* Breadcrumb Header */}
        <div className="h-12 border-b border-slate-200 px-6 flex items-center bg-white shrink-0">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* 2-Column Skeletons */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 overflow-hidden">
          <div className="bg-white p-6 space-y-4 animate-pulse">
            <div className="h-6 w-1/3 bg-slate-200 rounded" />
            <div className="h-10 w-3/4 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-100 rounded" />
            <div className="h-40 w-full bg-slate-100 rounded" />
          </div>
          <div className="bg-slate-50 p-6 space-y-4 animate-pulse">
            <div className="h-6 w-1/4 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found State ─────────────────────────────────────────
  if (detailError || (!task && !detailLoading)) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Task Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {detailError || `The task with identifier "${code}" could not be located in the database.`}
        </p>
        <Link
          href="/tasks"
          className="mt-4 px-4 py-2 bg-wa-header text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
        >
          &larr; Back to Task Dashboard
        </Link>
      </div>
    );
  }

  // ── 2-Column Detail View ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Breadcrumb Header Bar */}
      <header className="h-12 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/tasks"
            className="text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Tasks</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {code}
          </span>
          <span className="text-slate-400 truncate max-w-[200px] sm:max-w-md hidden sm:inline">
            — {task.title}
          </span>
        </div>

        {/* Mobile Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg md:hidden text-xs">
          <button
            onClick={() => setMobileTab('details')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              mobileTab === 'details'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setMobileTab('timeline')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              mobileTab === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Timeline ({((task.links?.length || 0) + (task.sentEmails?.length || 0))})
          </button>
        </div>
      </header>

      {/* 2-Column Responsive Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column: Task Info Panel */}
        <div
          className={`w-full md:w-1/2 lg:w-[55%] h-full overflow-hidden ${
            mobileTab === 'details' ? 'block' : 'hidden md:block'
          }`}
        >
          <TaskInfo task={task} />
        </div>

        {/* Right column: Linked Comms Timeline */}
        <div
          className={`w-full md:w-1/2 lg:w-[45%] h-full overflow-hidden ${
            mobileTab === 'timeline' ? 'block' : 'hidden md:block'
          }`}
        >
          <LinkedCommsTimeline
            taskId={task.id}
            links={task.links || []}
            sentEmails={task.sentEmails || []}
          />
        </div>
      </div>
    </div>
  );
}
