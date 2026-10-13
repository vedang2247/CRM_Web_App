'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createTask, addTaskLink } from '@/lib/slices/tasksSlice';
import { normalisePhone, taskCode } from '@/lib/normalise';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function ConvertToTaskModal({ isOpen, message, onClose }) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Client Selection / Creation state
  const [clientId, setClientId] = useState('');
  const [matchedClient, setMatchedClient] = useState(null);
  const [isMatchingClient, setIsMatchingClient] = useState(false);
  const [clientMode, setClientMode] = useState('matched'); // 'matched' | 'search' | 'create' | 'none'
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  const debounceTimerRef = useRef(null);

  // Initialize form when opened with message
  useEffect(() => {
    if (!isOpen || !message) return;

    // Prefill title & description
    const rawBody = message.body || '';
    const firstLine = rawBody.split('\n')[0].trim();
    const suggestedTitle = firstLine ? firstLine.slice(0, 100) : 'Task from WhatsApp';
    setTitle(suggestedTitle);
    setDescription(rawBody);
    setStatus('open');
    setPriority('medium');
    setDueDate('');
    setAssigneeId('');
    setErrorMessage('');
    setSuccessToast(null);

    // Extract normalised phone from chatId
    const rawPhone = normalisePhone(message.chatId || '');
    setNewClientPhone(rawPhone);
    setNewClientName(message.authorName || message.chatName || '');

    // 1. Fetch team members
    fetch('/api/team')
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setTeamMembers(data.members || []))
      .catch(() => {});

    // 2. Attempt client match by phone
    if (rawPhone) {
      setIsMatchingClient(true);
      fetch(`/api/clients/match?phone=${encodeURIComponent(rawPhone)}`)
        .then((res) => (res.ok ? res.json() : { client: null }))
        .then((data) => {
          setIsMatchingClient(false);
          if (data.client) {
            setMatchedClient(data.client);
            setClientId(data.client.id);
            setClientMode('matched');
          } else {
            setMatchedClient(null);
            setClientId('');
            setClientMode('create');
          }
        })
        .catch(() => {
          setIsMatchingClient(false);
          setClientMode('create');
        });
    } else {
      setClientMode('search');
    }
  }, [isOpen, message]);

  // Debounced client search
  const handleClientSearchChange = (query) => {
    setClientQuery(query);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!query.trim()) {
      setClientResults([]);
      return;
    }

    setIsSearchingClient(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setClientResults(data.clients || []);
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingClient(false);
      }
    }, 300);
  };

  const handleSelectSearchedClient = (client) => {
    setMatchedClient(client);
    setClientId(client.id);
    setClientMode('matched');
    setClientResults([]);
    setClientQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    setSubmitting(true);

    try {
      let finalClientId = clientId ? parseInt(clientId, 10) : null;

      // If user is in 'create' client mode, create client first
      if (clientMode === 'create' && newClientName.trim()) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName.trim(),
            phone: newClientPhone.trim() || null,
            email: newClientEmail.trim() || null,
            company: newClientCompany.trim() || null,
          }),
        });

        const clientData = await clientRes.json();
        if (!clientRes.ok) {
          setErrorMessage(clientData.error || 'Failed to create client record.');
          setSubmitting(false);
          return;
        }

        finalClientId = clientData.client.id;
      }

      // Create task via Redux thunk
      const taskPayload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        clientId: finalClientId,
        assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      };

      const createdTaskResult = await dispatch(createTask(taskPayload)).unwrap();
      const createdTask = createdTaskResult.task;

      // Link WhatsApp message to task
      const linkPayload = {
        taskId: createdTask.id,
        type: 'whatsapp',
        chatId: message.chatId,
        messageId: String(message.id),
        snapshot: message.body || '',
        note: `Created from WhatsApp chat (${message.chatId})`,
      };

      await dispatch(addTaskLink(linkPayload)).unwrap();

      setSuccessToast(`Task ${taskCode(createdTask.id)} created successfully!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(err?.message || typeof err === 'string' ? err : 'Failed to convert message to task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Convert WhatsApp Message to Task</h3>
              <p className="text-[11px] text-slate-500">
                Create a database-backed task linked directly to this conversation message.
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

        {/* Form Body */}
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

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up on payment receipt"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-accent focus:border-transparent text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Description / Message Snapshot Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Message Snapshot
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-accent focus:border-transparent text-slate-800 leading-relaxed font-normal"
            />
          </div>

          {/* Client Section (Auto-match or Inline Create) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Client Association</span>
              </label>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 text-[11px]">
                {matchedClient && (
                  <button
                    type="button"
                    onClick={() => setClientMode('matched')}
                    className={`px-2 py-0.5 rounded font-medium ${clientMode === 'matched' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500'}`}
                  >
                    Matched
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setClientMode('search')}
                  className={`px-2 py-0.5 rounded font-medium ${clientMode === 'search' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500'}`}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('create')}
                  className={`px-2 py-0.5 rounded font-medium ${clientMode === 'create' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500'}`}
                >
                  + New Client
                </button>
              </div>
            </div>

            {/* State: Matching in flight */}
            {isMatchingClient && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Matching client by phone number...
              </p>
            )}

            {/* Mode: Matched */}
            {clientMode === 'matched' && matchedClient && (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/80 border border-emerald-200/60 rounded-lg text-xs">
                <div>
                  <div className="font-semibold text-emerald-900">{matchedClient.name}</div>
                  <div className="text-[11px] text-emerald-700">
                    {matchedClient.phone && `📞 ${matchedClient.phone} `}
                    {matchedClient.email && `✉️ ${matchedClient.email}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMatchedClient(null);
                    setClientId('');
                    setClientMode('search');
                  }}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-medium"
                >
                  Change
                </button>
              </div>
            )}

            {/* Mode: Search */}
            {clientMode === 'search' && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search existing clients by name, phone or email..."
                  value={clientQuery}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-accent"
                />
                {isSearchingClient && (
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400">Searching...</span>
                )}
                {clientResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {clientResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectSearchedClient(c)}
                        className="p-2 text-xs hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-slate-400 text-[11px]">{c.phone || c.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mode: Create Inline */}
            {clientMode === 'create' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Name</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client Name"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Phone</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Details Row: Status, Priority, Due Date, Assignee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
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
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Creating Task...</span>
              </>
            ) : (
              <span>Create & Link Task</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
