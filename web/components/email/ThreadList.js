'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  loadThreads,
  loadThread,
  setActiveThread,
  setQuery,
  setComposeOpen,
} from '@/lib/slices/emailSlice';
import Avatar from '@/components/Avatar';

function formatSender(fromStr = '') {
  if (!fromStr) return 'Unknown';
  const match = fromStr.match(/^"?([^"<]+)"?\s*</);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fromStr.replace(/<[^>]+>/g, '').trim() || fromStr;
}

function formatEmailDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ThreadList({ onSelectThread }) {
  const dispatch = useDispatch();
  const threads = useSelector((s) => s.email.threads);
  const activeThreadId = useSelector((s) => s.email.activeThreadId);
  const loading = useSelector((s) => s.email.loading);
  const nextPageToken = useSelector((s) => s.email.nextPageToken);
  const query = useSelector((s) => s.email.query);

  const [searchTerm, setSearchTerm] = useState(query);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== query) {
        dispatch(setQuery(searchTerm));
        dispatch(loadThreads({ q: searchTerm }));
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm, query, dispatch]);

  const handleSelect = (threadId) => {
    dispatch(setActiveThread(threadId));
    dispatch(loadThread(threadId));
    if (onSelectThread) onSelectThread(threadId);
  };

  const handleLoadMore = () => {
    if (nextPageToken && !loading) {
      dispatch(loadThreads({ q: query, pageToken: nextPageToken }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Top Header & Search */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Inbox</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {threads.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(loadThreads({ q: query }))}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh threads"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin text-rose-500' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={() => dispatch(setComposeOpen(true))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Compose</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search email by sender, subject, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all shadow-sm"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading emails from Gmail...</span>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-400 select-none">
            <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xs font-medium text-slate-600">No emails found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {query ? 'Try a different search query' : 'Your inbox is empty'}
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            const senderName = formatSender(thread.from);
            const formattedTime = formatEmailDate(thread.date);

            return (
              <div
                key={thread.id}
                onClick={() => handleSelect(thread.id)}
                className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-rose-50/70 border-l-4 border-l-rose-500'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                } ${thread.unread ? 'bg-white' : 'bg-slate-50/30'}`}
              >
                <Avatar name={senderName} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        thread.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {senderName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formattedTime}
                      </span>
                      {thread.unread && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-100 shrink-0" />
                      )}
                    </div>
                  </div>

                  <h3
                    className={`text-xs truncate mb-1 ${
                      thread.unread ? 'font-semibold text-slate-800' : 'text-slate-600'
                    }`}
                  >
                    {thread.subject}
                    {thread.messageCount > 1 && (
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                        ({thread.messageCount})
                      </span>
                    )}
                  </h3>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {thread.snippet}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Load more button */}
        {nextPageToken && (
          <div className="p-3 text-center bg-slate-50/50">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
            >
              {loading ? 'Loading more...' : 'Load more messages'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
