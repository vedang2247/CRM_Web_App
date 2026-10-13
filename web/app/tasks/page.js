'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadTasks, clearError } from '@/lib/slices/tasksSlice';
import { loadTemplates } from '@/lib/slices/templatesSlice';
import TaskFilters from '@/components/tasks/TaskFilters';
import TaskCard from '@/components/tasks/TaskCard';
import TaskPagination from '@/components/tasks/TaskPagination';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';

export default function TasksPage() {
  const dispatch = useDispatch();
  const { tasks, total, loading, error, filters } = useSelector((s) => s.tasks);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Load initial tasks & email templates on mount
  useEffect(() => {
    dispatch(loadTasks());
    dispatch(loadTemplates());
  }, [dispatch]);

  // Metric calculation for top statistics bar
  const openCount = tasks.filter((t) => t.status === 'open').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent').length;

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      {/* ── Left Sidebar: Filters ────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] sm:w-[320px] bg-white transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 shrink-0 ${
          mobileFilterOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <TaskFilters onOpenCreateModal={() => setCreateModalOpen(true)} />
      </aside>

      {/* Mobile backdrop */}
      {mobileFilterOpen && (
        <div
          onClick={() => setMobileFilterOpen(false)}
          className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ── Right Main Area: Dashboard ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Error notification banner */}
        {error && (
          <div className="flex items-center justify-between px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 shrink-0">
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-rose-500 hover:text-rose-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Header & Metrics */}
        <header className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Toggle Filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Task Dashboard</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track client inquiries, manage resolutions, and cross-reference inbox messages.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-wa-header hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Create Task</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tasks</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{total}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Open Tasks</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{openCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">In Progress</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{inProgressCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Urgent Priority</div>
              <div className="text-xl font-bold text-rose-600 mt-0.5">{urgentCount}</div>
            </div>
          </div>
        </header>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && tasks.length === 0 ? (
            /* Loading skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            /* Empty state */
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">No tasks found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {filters.status || filters.q || filters.clientId || filters.assigneeId
                  ? 'No tasks matched your current filter criteria. Try clearing some filters.'
                  : 'Get started by creating your first CRM task.'}
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-wa-header text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                Create Task
              </button>
            </div>
          ) : (
            /* Tasks Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination at bottom */}
        <TaskPagination />
      </main>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
