'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { updateTask, deleteTask } from '@/lib/slices/tasksSlice';
import { taskCode } from '@/lib/normalise';
import TaskEmailModal from './TaskEmailModal';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'waiting', label: 'Waiting', color: 'bg-amber-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { value: 'closed', label: 'Closed', color: 'bg-zinc-400' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', badge: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium', badge: 'bg-amber-50 text-amber-700' },
  { value: 'high', label: 'High', badge: 'bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgent', badge: 'bg-rose-50 text-rose-700 font-semibold' },
];

export default function TaskInfo({ task }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const saving = useSelector((s) => s.tasks.saving);

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status || 'open');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
  );
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [reviewerId, setReviewerId] = useState(task.reviewerId || '');
  const [clientId, setClientId] = useState(task.clientId || '');

  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceTimerRef = useRef(null);

  // Load team and clients once
  useEffect(() => {
    fetch('/api/team')
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((d) => setTeamMembers(d.members || []))
      .catch(() => {});

    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((d) => setClients(d.clients || []))
      .catch(() => {});
  }, []);

  // Sync state if external task prop changes
  useEffect(() => {
    setTitle(task.title || '');
    setDescription(task.description || '');
    setStatus(task.status || 'open');
    setPriority(task.priority || 'medium');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setAssigneeId(task.assigneeId || '');
    setReviewerId(task.reviewerId || '');
    setClientId(task.clientId || '');
  }, [task]);

  const dispatchUpdate = (changes) => {
    dispatch(updateTask({ id: task.id, ...changes }));
  };

  const handleDebouncedChange = (field, value) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      dispatchUpdate({ [field]: value });
    }, 800);
  };

  const handleBlur = (field, value) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    dispatchUpdate({ [field]: value });
  };

  const handleImmediateChange = (field, value) => {
    dispatchUpdate({ [field]: value });
  };

  const handleDeleteTask = async () => {
    if (window.confirm(`Are you sure you want to delete task ${taskCode(task.id)}?`)) {
      setIsDeleting(true);
      await dispatch(deleteTask(task.id));
      router.push('/tasks');
    }
  };

  const isOverdue =
    dueDate &&
    new Date(dueDate) < new Date() &&
    status !== 'resolved' &&
    status !== 'closed';

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-y-auto">
      {/* ── Top Bar: Task Code, Save Status, Actions ─────────────────── */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-lg">
            {taskCode(task.id)}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {saving ? (
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <svg className="animate-spin w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {task.client?.email && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              title="Compose email to client"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Client</span>
            </button>
          )}

          <button
            onClick={handleDeleteTask}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Main Details ────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Title Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleDebouncedChange('title', e.target.value);
            }}
            onBlur={(e) => handleBlur('title', e.target.value)}
            className="w-full text-lg sm:text-xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors py-1 bg-transparent"
            placeholder="Untitled Task"
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Description & Notes
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              handleDebouncedChange('description', e.target.value);
            }}
            onBlur={(e) => handleBlur('description', e.target.value)}
            className="w-full p-3 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all leading-relaxed"
            placeholder="Add a detailed description or instructions..."
          />
        </div>

        {/* Properties Grid */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Properties & Assignment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Dropdown */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleImmediateChange('status', e.target.value);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleImmediateChange('priority', e.target.value);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Due Date</span>
                {isOverdue && (
                  <span className="text-[10px] text-rose-600 font-bold uppercase">Overdue</span>
                )}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleImmediateChange(
                    'dueDate',
                    e.target.value ? new Date(e.target.value).toISOString() : null
                  );
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  isOverdue ? 'border-rose-300 text-rose-700 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  handleImmediateChange('assigneeId', e.target.value || null);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Reviewer */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5">Reviewer</label>
              <select
                value={reviewerId}
                onChange={(e) => {
                  setReviewerId(e.target.value);
                  handleImmediateChange('reviewerId', e.target.value || null);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">No Reviewer Assigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Client Picker */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1.5">Client Relation</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  handleImmediateChange('clientId', e.target.value || null);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">No Client Linked</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Client Profile Card if linked */}
        {task.client && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                  {task.client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{task.client.name}</h4>
                  {task.client.company && (
                    <p className="text-[11px] text-slate-500">{task.client.company}</p>
                  )}
                </div>
              </div>

              {task.client.email && (
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Compose Email
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600">
              {task.client.phone && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-wa-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{task.client.phone}</span>
                </div>
              )}
              {task.client.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{task.client.email}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Email Modal */}
      {showEmailModal && (
        <TaskEmailModal
          task={task}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
