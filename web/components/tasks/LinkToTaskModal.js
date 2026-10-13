'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { addTaskLink } from '@/lib/slices/tasksSlice';
import { extractEmail, taskCode } from '@/lib/normalise';
import { useToast } from '@/components/Toast';

export default function LinkToTaskModal({ isOpen, thread, onClose }) {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const [taskQuery, setTaskQuery] = useState('');
  const [taskResults, setTaskResults] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTaskQuery('');
    setTaskResults([]);
    setSelectedTask(null);
    setNote('');
    setErrorMessage('');

    // Initial search: load recent open tasks
    setIsSearching(true);
    fetch('/api/tasks?limit=10&status=open')
      .then((res) => (res.ok ? res.json() : { tasks: [] }))
      .then((data) => setTaskResults(data.tasks || []))
      .catch(() => {})
      .finally(() => setIsSearching(false));
  }, [isOpen]);

  const handleQueryChange = (q) => {
    setTaskQuery(q);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const param = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '?limit=10';
        const res = await fetch(`/api/tasks${param}`);
        if (res.ok) {
          const data = await res.json();
          setTaskResults(data.tasks || []);
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) {
      setErrorMessage('Please select a task to link.');
      return;
    }
    if (!thread) {
      setErrorMessage('No email thread provided.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const sender = extractEmail(thread.from || '');
      const linkPayload = {
        taskId: selectedTask.id,
        type: 'email',
        threadId: thread.id,
        subject: (thread.subject || 'No Subject').slice(0, 500),
        sender: sender || 'unknown@client.com',
        note: note.trim() ? note.trim().slice(0, 1000) : null,
      };

      await dispatch(addTaskLink(linkPayload)).unwrap();

      showToast(`Thread linked to ${taskCode(selectedTask.id)}!`, 'success');
      setTimeout(() => { onClose(); }, 800);
    } catch (err) {
      const msg = err?.message || typeof err === 'string' ? err : 'Failed to link thread to task.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !thread) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Link Email Thread to Task</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-xs">
                {thread.subject || 'Untitled Thread'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              {errorMessage}
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {successToast}
            </div>
          )}

          {/* Selected Task Banner */}
          {selectedTask ? (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {taskCode(selectedTask.id)}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate max-w-[240px]">
                    {selectedTask.title}
                  </span>
                </div>
                {selectedTask.client && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Client: {selectedTask.client.name}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Search & Select Task <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks by title or code..."
                  value={taskQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isSearching && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</span>
                )}
              </div>

              {/* Task Options List */}
              <div className="mt-2 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {taskResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching tasks found.
                  </div>
                ) : (
                  taskResults.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="p-2.5 hover:bg-white cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            {taskCode(t.id)}
                          </span>
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {t.title}
                          </span>
                        </div>
                        {t.client && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {t.client.name}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                        Select
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Link Note (Optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Contains client clarification on quotation documents..."
              maxLength={1000}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Linking...</span>
              </>
            ) : (
              <span>Attach Thread to Task</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
