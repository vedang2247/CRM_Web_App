'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters, loadTasks } from '@/lib/slices/tasksSlice';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function TaskFilters({ onOpenCreateModal }) {
  const dispatch = useDispatch();
  const filters = useSelector((s) => s.tasks.filters);
  const total = useSelector((s) => s.tasks.total);

  const [teamMembers, setTeamMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.q || '');
  const debounceTimerRef = useRef(null);

  // Fetch team members once on mount
  useEffect(() => {
    fetch('/api/team')
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setTeamMembers(data.members || []))
      .catch(() => {});

    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data) => setClients(data.clients || []))
      .catch(() => {});
  }, []);

  // Sync internal search input if external filter changes
  useEffect(() => {
    setSearchInput(filters.q || '');
  }, [filters.q]);

  // Debounced search trigger
  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      dispatch(setFilters({ q: val }));
      dispatch(loadTasks({ q: val }));
    }, 300);
  };

  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value }));
    dispatch(loadTasks({ [key]: value }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    const resetObj = { status: '', clientId: '', assigneeId: '', q: '' };
    dispatch(setFilters(resetObj));
    dispatch(loadTasks(resetObj));
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.clientId || filters.assigneeId || filters.q
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Filter Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {total} {total === 1 ? 'task' : 'tasks'} found
            </p>
          </div>
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-wa-header text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Task</span>
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Status filter */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 uppercase text-[11px] tracking-wider">
            Status
          </label>
          <div className="space-y-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = filters.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange('status', opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignee dropdown */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 uppercase text-[11px] tracking-wider">
            Assignee
          </label>
          <select
            value={filters.assigneeId || ''}
            onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Team Members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client dropdown */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 uppercase text-[11px] tracking-wider">
            Client
          </label>
          <select
            value={filters.clientId || ''}
            onChange={(e) => handleFilterChange('clientId', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer / Reset action */}
      {hasActiveFilters && (
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <button
            onClick={handleResetFilters}
            className="w-full py-1.5 text-center text-xs text-rose-600 font-semibold hover:bg-rose-50 rounded-lg transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
