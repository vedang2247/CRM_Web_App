'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendTaskEmail, loadTask } from '@/lib/slices/tasksSlice';
import { loadTemplates } from '@/lib/slices/templatesSlice';
import { renderTemplate } from '@/lib/normalise';
import { useToast } from '@/components/Toast';

export default function TaskEmailModal({ task, onClose }) {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const templates = useSelector((s) => s.templates.templates);
  const [to, setTo] = useState(task.client?.email || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Ensure templates are loaded
  useEffect(() => {
    dispatch(loadTemplates());
  }, [dispatch]);

  // Sync recipient if client changes
  useEffect(() => {
    if (task.client?.email) {
      setTo(task.client.email);
    }
  }, [task.client]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => String(t.id) === String(templateId));
    if (tpl) {
      const renderedSubject = renderTemplate(tpl.subject, {
        client: task.client,
        task,
      });
      const renderedBody = renderTemplate(tpl.body, {
        client: task.client,
        task,
      });
      setSubject(renderedSubject);
      setBodyText(renderedBody);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!to.trim()) {
      setError('Recipient email (To) is required');
      return;
    }
    if (!bodyText.trim()) {
      setError('Email message body cannot be empty');
      return;
    }

    setError('');
    setSending(true);

    try {
      const result = await dispatch(
        sendTaskEmail({
          taskId: task.id,
          to: to.trim(),
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          templateId: selectedTemplateId ? parseInt(selectedTemplateId, 10) : undefined,
        })
      );

      if (sendTaskEmail.fulfilled.match(result)) {
        showToast(`Email sent to ${to.trim()}`, 'success');
        dispatch(loadTask(task.id)); // refresh detail timeline
        onClose();
      } else {
        const msg = result.payload || 'Failed to send email. Ensure Gmail is connected.';
        setError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      setError(err?.message || 'Error sending email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Email Client</h2>
              <p className="text-[11px] text-slate-500">Send an update directly linked to this task</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Apply Email Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">-- Choose a template to auto-fill --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* To field */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              To <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="client@company.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject field */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              placeholder="Subject (task code will be auto-prefixed)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body field */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              required
              placeholder="Type your message to the client..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Emails are sent through your connected Gmail account
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Email</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
