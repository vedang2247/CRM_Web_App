'use client';

/**
 * ComposeModal.js — New email compose modal (Milestone 7 / Step 22)
 *
 * Reads composeOpen from emailSlice.
 * Dispatches sendEmail thunk on submit.
 * Shows success toast + auto-closes on success.
 * Shows error message on failure.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendEmail, setComposeOpen } from '@/lib/slices/emailSlice';

export default function ComposeModal() {
  const dispatch = useDispatch();
  const composeOpen = useSelector((s) => s.email.composeOpen);
  const sending = useSelector((s) => s.email.sending);
  const gmailEmail = useSelector((s) => s.connections.gmail.email);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toRef = useRef(null);

  // Focus the "To" field when modal opens
  useEffect(() => {
    if (composeOpen && toRef.current) {
      setTimeout(() => toRef.current?.focus(), 100);
    }
    if (!composeOpen) {
      // Reset form when modal closes
      setTo('');
      setSubject('');
      setBody('');
      setError('');
      setSuccess(false);
    }
  }, [composeOpen]);

  const handleClose = () => {
    if (sending) return;
    dispatch(setComposeOpen(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const cleanTo = to.trim();
    const cleanBody = body.trim();

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanTo)) {
      setError('Please enter a valid recipient email address.');
      return;
    }
    if (!cleanBody) {
      setError('Email body cannot be empty.');
      return;
    }

    setError('');
    try {
      await dispatch(
        sendEmail({
          to: cleanTo,
          subject: subject.trim() || '(No Subject)',
          body: cleanBody,
        })
      ).unwrap();

      setSuccess(true);
      // Auto-close after 1.5s
      setTimeout(() => {
        dispatch(setComposeOpen(false));
      }, 1500);
    } catch (err) {
      setError(err || 'Failed to send email. Please try again.');
    }
  };

  // Backdrop click to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && composeOpen && !sending) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  });

  if (!composeOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">New Email</h2>
              {gmailEmail && (
                <p className="text-[11px] text-slate-500">From: {gmailEmail}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={sending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Success State ── */}
        {success ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">Email Sent!</h3>
            <p className="text-xs text-slate-500">Your message has been delivered successfully.</p>
          </div>
        ) : (
          /* ── Compose Form ── */
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Error banner */}
            {error && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="p-5 space-y-3">
              {/* To */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1" htmlFor="compose-to">
                  To
                </label>
                <input
                  id="compose-to"
                  ref={toRef}
                  type="email"
                  placeholder="recipient@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  disabled={sending}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1" htmlFor="compose-subject">
                  Subject
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  placeholder="(No Subject)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1" htmlFor="compose-body">
                  Message
                </label>
                <textarea
                  id="compose-body"
                  rows="8"
                  placeholder="Write your message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  disabled={sending}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none leading-relaxed disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-5 pb-5 gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
              >
                Discard
              </button>

              <button
                type="submit"
                disabled={sending || !to.trim() || !body.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
