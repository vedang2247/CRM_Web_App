'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  clearError,
} from '@/lib/slices/templatesSlice';

const PLACEHOLDERS = [
  { key: '{{client.name}}', label: 'Client Name', desc: "Customer's full name" },
  { key: '{{task.code}}', label: 'Task Code', desc: 'e.g. TSK0042' },
  { key: '{{task.title}}', label: 'Task Title', desc: 'Short title of the task' },
  { key: '{{task.dueDate}}', label: 'Due Date', desc: 'Formatted target resolution date' },
];

export default function TemplatesPage() {
  const dispatch = useDispatch();
  const { templates, loading, saving, error } = useSelector((s) => s.templates);

  const [selectedId, setSelectedId] = useState(null); // null means creating a new template
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Mobile column view
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'editor'

  useEffect(() => {
    dispatch(loadTemplates());
  }, [dispatch]);

  // When templates load or selectedId changes, populate form
  useEffect(() => {
    if (selectedId) {
      const existing = templates.find((t) => t.id === selectedId);
      if (existing) {
        setName(existing.name);
        setSubject(existing.subject);
        setBody(existing.body);
      }
    } else if (templates.length > 0 && selectedId === undefined) {
      // Pick first template by default on initial load
      const first = templates[0];
      setSelectedId(first.id);
      setName(first.name);
      setSubject(first.subject);
      setBody(first.body);
    }
  }, [selectedId, templates]);

  const handleSelectTemplate = (tpl) => {
    setSelectedId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setFeedbackMsg('');
    setMobileView('editor');
  };

  const handleNewTemplate = () => {
    setSelectedId(null);
    setName('');
    setSubject('');
    setBody('');
    setFeedbackMsg('');
    setActiveTab('edit');
    setMobileView('editor');
  };

  const insertPlaceholder = (phKey, targetField = 'body') => {
    if (targetField === 'subject') {
      setSubject((prev) => `${prev} ${phKey}`.trim());
    } else {
      setBody((prev) => `${prev} ${phKey}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setFeedbackMsg('All fields (Name, Subject, Body) are required.');
      return;
    }

    try {
      if (selectedId) {
        // Update existing template
        await dispatch(
          updateTemplate({
            id: selectedId,
            name: name.trim(),
            subject: subject.trim(),
            body: body.trim(),
          })
        ).unwrap();
        setFeedbackMsg('Template updated successfully!');
      } else {
        // Create new template
        const newTpl = await dispatch(
          createTemplate({
            name: name.trim(),
            subject: subject.trim(),
            body: body.trim(),
          })
        ).unwrap();
        setSelectedId(newTpl.id);
        setFeedbackMsg('Template created successfully!');
      }
      setTimeout(() => setFeedbackMsg(''), 2500);
    } catch (err) {
      setFeedbackMsg(err?.message || 'Failed to save template.');
    }
  };

  const handleDelete = async (id, tplName) => {
    if (window.confirm(`Are you sure you want to delete template "${tplName}"?`)) {
      try {
        await dispatch(deleteTemplate(id)).unwrap();
        if (selectedId === id) {
          handleNewTemplate();
        }
      } catch (err) {
        alert(err?.message || 'Failed to delete template');
      }
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q)
    );
  });

  // Mock preview rendering
  const sampleClient = { name: 'Ananya Iyer', email: 'ananya@client.com' };
  const sampleTask = { code: 'TSK0042', title: 'Tax Consultation & Review', dueDate: 'Nov 20, 2026' };
  const previewSubject = subject
    .replace(/\{\{client\.name\}\}/g, sampleClient.name)
    .replace(/\{\{task\.code\}\}/g, sampleTask.code)
    .replace(/\{\{task\.title\}\}/g, sampleTask.title)
    .replace(/\{\{task\.dueDate\}\}/g, sampleTask.dueDate);
  const previewBody = body
    .replace(/\{\{client\.name\}\}/g, sampleClient.name)
    .replace(/\{\{task\.code\}\}/g, sampleTask.code)
    .replace(/\{\{task\.title\}\}/g, sampleTask.title)
    .replace(/\{\{task\.dueDate\}\}/g, sampleTask.dueDate);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      {/* ── Left Sidebar: Template Directory ─────────────────────────── */}
      <aside
        className={`w-full md:w-[340px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 ${
          mobileView === 'list' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/60 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-slate-900 text-base">Templates</h1>
              <p className="text-xs text-slate-500">
                {templates.length} saved email {templates.length === 1 ? 'template' : 'templates'}
              </p>
            </div>
            <button
              onClick={handleNewTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-wa-header hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>New</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading && templates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No templates found. Click &quot;New&quot; to create one.
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isSelected = selectedId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-4 cursor-pointer transition-colors group relative ${
                    isSelected
                      ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-blue-900 font-bold' : 'text-slate-900'
                      }`}
                    >
                      {tpl.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tpl.id, tpl.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all"
                      title="Delete template"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                    {tpl.subject}
                  </p>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {tpl.body}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right Content: Template Editor / Preview ─────────────────── */}
      <main
        className={`flex-1 flex flex-col h-full bg-white overflow-hidden ${
          mobileView === 'editor' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Editor Top Bar */}
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 -ml-2 text-slate-500 hover:bg-slate-200 rounded-lg"
              title="Back to list"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {selectedId ? `Edit: ${name || 'Template'}` : 'New Email Template'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {selectedId ? `Template ID: ${selectedId}` : 'Compose standardized template'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between Editor and Live Preview */}
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edit Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Preview
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Template</span>
              )}
            </button>
          </div>
        </header>

        {/* Feedback / Error banner */}
        {(feedbackMsg || error) && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b shrink-0 ${
              error || feedbackMsg.includes('required') || feedbackMsg.includes('Failed')
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{error || feedbackMsg}</span>
            <button
              onClick={() => {
                setFeedbackMsg('');
                dispatch(clearError());
              }}
              className="font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'edit' ? (
            <form onSubmit={handleSave} className="max-w-2xl space-y-5">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request Documents"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{{task.code}}', 'subject')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Task Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. [{{task.code}}] Documents Required — {{task.title}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono text-[11px]"
                />
              </div>

              {/* Placeholder Helper Chips */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Click to insert dynamic placeholder into Body:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => insertPlaceholder(ph.key, 'body')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-lg text-[11px] font-mono transition-colors shadow-2xs"
                      title={ph.desc}
                    >
                      <span className="font-bold text-blue-600">+</span>
                      <span>{ph.key}</span>
                      <span className="text-slate-400 font-sans text-[10px]">({ph.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Body Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="Dear {{client.name}},\n\nHere is an update on {{task.title}}..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-sans leading-relaxed"
                />
              </div>
            </form>
          ) : (
            /* Live Preview Container */
            <div className="max-w-2xl space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Previewing template populated with sample client (Ananya Iyer) and task (TSK0042).
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 bg-white border-b border-slate-200 space-y-2">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Subject:</span>
                    <span className="font-mono text-slate-900 font-medium">{previewSubject || '(Empty Subject)'}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">To:</span>
                    <span>Ananya Iyer &lt;ananya@client.com&gt;</span>
                  </div>
                </div>
                <div className="p-6 bg-white whitespace-pre-line text-xs text-slate-800 leading-relaxed min-h-[200px]">
                  {previewBody || '(Empty Body Content)'}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
