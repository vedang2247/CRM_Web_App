'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { loadThreads, clearError } from '@/lib/slices/emailSlice';
import ThreadList from '@/components/email/ThreadList';
import ThreadView from '@/components/email/ThreadView';
import ComposeModal from '@/components/email/ComposeModal';

export default function EmailPage() {
  const dispatch = useDispatch();
  const gmailConnected = useSelector((s) => s.connections.gmail.connected);
  const activeThreadId = useSelector((s) => s.email.activeThreadId);
  const emailError = useSelector((s) => s.email.error);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Load threads whenever Gmail is connected
  useEffect(() => {
    if (gmailConnected) {
      dispatch(loadThreads({}));
    }
  }, [gmailConnected, dispatch]);

  // Keep mobile state aligned with active selection
  useEffect(() => {
    if (activeThreadId) {
      setMobileShowDetail(true);
    }
  }, [activeThreadId]);

  // ── Not connected empty state ────────────────────────────────────
  if (!gmailConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Gmail Not Connected</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            Connect your Gmail account using official Google OAuth to view your inbox threads, read customer messages, and send replies.
          </p>
        </div>
        <Link
          href="/connections"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
        >
          <span>Go to Connections</span>
          <span>&rarr;</span>
        </Link>
      </div>
    );
  }

  // ── Two-pane layout ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Gmail session expired error banner */}
      {emailError && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              {String(emailError).includes('401') || String(emailError).toLowerCase().includes('unauthorized')
                ? 'Gmail session expired. Please reconnect your account.'
                : `Gmail error: ${emailError}`}
            </span>
            {(String(emailError).includes('401') || String(emailError).toLowerCase().includes('unauthorized')) && (
              <Link href="/connections" className="ml-1 font-semibold underline hover:text-amber-900 transition-colors">
                Reconnect Gmail →
              </Link>
            )}
          </div>
          <button
            onClick={() => dispatch(clearError())}
            className="text-amber-600 hover:text-amber-800 p-1 rounded transition-colors"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Left pane — Thread list (hidden on mobile if detail is active) */}
        <aside
          className={`w-full md:w-[360px] lg:w-[400px] shrink-0 h-full border-r border-slate-200 flex flex-col ${
            mobileShowDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ThreadList onSelectThread={() => setMobileShowDetail(true)} />
        </aside>

        {/* Right pane — Thread detail view (hidden on mobile if no active thread) */}
        <section
          className={`flex-1 h-full overflow-hidden ${
            !mobileShowDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ThreadView onBack={() => setMobileShowDetail(false)} />
        </section>
      </div>

      {/* Compose modal — renders as a fixed overlay */}
      <ComposeModal />
    </div>
  );
}
