'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setGmail } from '@/lib/slices/connectionsSlice';

export default function GmailCard() {
  const dispatch = useDispatch();
  const { connected, email, loading } = useSelector((s) => s.connections.gmail);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        dispatch(setGmail({ connected: false, email: null }));
      }
    } catch (err) {
      console.error('Failed to disconnect Gmail:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-chat p-6 border border-slate-200 transition-all hover:shadow-md">
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100 shadow-sm">
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-800">Gmail</h2>
          <p className="text-xs text-slate-500 truncate">
            {connected
              ? email
              : 'Connect via official Google OAuth 2.0'}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            connected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Card Body */}
      {loading ? (
        <div className="h-44 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">
            Checking Gmail connection...
          </span>
        </div>
      ) : connected ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                {email ? email.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">Connected Account</div>
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {email}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="/email"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <span>Go to Email Inbox</span>
              <span>&rarr;</span>
            </a>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800">Permissions requested:</div>
            <ul className="space-y-1 list-disc list-inside text-slate-500">
              <li>Read Gmail inbox threads & messages</li>
              <li>Send emails and reply directly from Unified Inbox</li>
              <li>Secure token storage using AES-GCM encrypted cookies</li>
            </ul>
          </div>

          <a
            href="/api/auth/google"
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-[0.99]"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            <span>Connect with Google</span>
          </a>
        </div>
      )}
    </div>
  );
}
