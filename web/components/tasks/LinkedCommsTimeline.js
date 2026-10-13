'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { removeTaskLink } from '@/lib/slices/tasksSlice';
import { normalisePhone } from '@/lib/normalise';

export default function LinkedCommsTimeline({ taskId, links = [], sentEmails = [] }) {
  const dispatch = useDispatch();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'whatsapp' | 'email' | 'sent'
  const [deletingLinkId, setDeletingLinkId] = useState(null);

  // Combine links and sentEmails into unified timeline items
  const timelineItems = [
    ...links.map((link) => ({
      itemType: link.type === 'whatsapp' ? 'wa_link' : 'email_link',
      id: `link-${link.id}`,
      linkId: link.id,
      timestamp: new Date(link.createdAt).getTime(),
      dateStr: new Date(link.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      raw: link,
    })),
    ...sentEmails.map((email) => ({
      itemType: 'sent_email',
      id: `email-${email.id}`,
      emailId: email.id,
      timestamp: new Date(email.sentAt).getTime(),
      dateStr: new Date(email.sentAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      raw: email,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp); // Newest first

  const filteredItems = timelineItems.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'whatsapp') return item.itemType === 'wa_link';
    if (filterType === 'email') return item.itemType === 'email_link';
    if (filterType === 'sent') return item.itemType === 'sent_email';
    return true;
  });

  const handleRemoveLink = async (linkId) => {
    if (window.confirm('Remove this linked message from the task?')) {
      setDeletingLinkId(linkId);
      await dispatch(removeTaskLink({ taskId, linkId }));
      setDeletingLinkId(null);
    }
  };

  const totalCount = timelineItems.length;
  const waCount = links.filter((l) => l.type === 'whatsapp').length;
  const emailLinkCount = links.filter((l) => l.type === 'email').length;
  const sentCount = sentEmails.length;

  return (
    <div className="flex flex-col h-full bg-slate-50/70 overflow-hidden">
      {/* ── Header & Filter Tabs ──────────────────────────────────── */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Communication Timeline
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {totalCount}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Cross-channel activity
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-wa-header text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('whatsapp')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterType === 'whatsapp'
                ? 'bg-wa-accent text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            WhatsApp ({waCount})
          </button>
          <button
            onClick={() => setFilterType('email')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterType === 'email'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
            Gmail ({emailLinkCount})
          </button>
          <button
            onClick={() => setFilterType('sent')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterType === 'sent'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            Sent ({sentCount})
          </button>
        </div>
      </div>

      {/* ── Timeline List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">No linked communications yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Link WhatsApp chat messages or Gmail threads from their respective inboxes to track conversations here.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredItems.map((item) => {
              if (item.itemType === 'wa_link') {
                const link = item.raw;
                const formattedPhone = normalisePhone(link.chatId || '');

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-wa-accent text-white flex items-center justify-center shadow-xs ring-4 ring-slate-50">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
                      </svg>
                    </div>

                    {/* Card Content */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            WhatsApp Message
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            +{formattedPhone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{item.dateStr}</span>
                          <button
                            onClick={() => handleRemoveLink(item.linkId)}
                            disabled={deletingLinkId === item.linkId}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Remove link"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Snapshot quote bubble */}
                      <div className="p-3 bg-wa-chat-bg/30 border border-emerald-100 rounded-lg text-xs text-slate-800 font-sans leading-relaxed">
                        &ldquo;{link.snapshot}&rdquo;
                      </div>

                      {link.note && (
                        <p className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span>{link.note}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.itemType === 'email_link') {
                const link = item.raw;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs ring-4 ring-slate-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* Card Content */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            Gmail Thread
                          </span>
                          <span className="text-slate-600 font-medium truncate max-w-[180px]">
                            {link.sender}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{item.dateStr}</span>
                          <button
                            onClick={() => handleRemoveLink(item.linkId)}
                            disabled={deletingLinkId === item.linkId}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Remove link"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs">
                        <h4 className="font-semibold text-slate-900 leading-snug">
                          {link.subject}
                        </h4>
                      </div>

                      {link.note && (
                        <p className="text-[11px] text-slate-500 italic">
                          Note: {link.note}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <Link
                          href={`/email`}
                          className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>Open in Email Inbox</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.itemType === 'sent_email') {
                const email = item.raw;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs ring-4 ring-slate-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>

                    {/* Card Content */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                            Email Sent to Client
                          </span>
                          <span className="text-slate-600 font-medium">
                            To: {email.to}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{item.dateStr}</span>
                      </div>

                      <div className="text-xs space-y-1">
                        <h4 className="font-semibold text-slate-900 leading-snug">
                          {email.subject}
                        </h4>
                        <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-xs font-sans whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                          {email.bodyText}
                        </div>
                      </div>

                      {email.threadId && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <Link
                            href={`/email`}
                            className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>View Thread in Gmail</span>
                            <span>&rarr;</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
