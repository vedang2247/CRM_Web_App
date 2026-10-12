'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Avatar from '@/components/Avatar';
import { sendEmail, loadThread } from '@/lib/slices/emailSlice';

function formatSender(fromStr = '') {
  if (!fromStr) return 'Unknown';
  const match = fromStr.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: fromStr.replace(/<[^>]+>/g, '').trim(), email: fromStr };
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ThreadView({ onBack }) {
  const dispatch = useDispatch();
  const activeThreadId = useSelector((s) => s.email.activeThreadId);
  const threads = useSelector((s) => s.email.threads);
  const threadDetail = useSelector((s) => s.email.threadDetail);
  const loading = useSelector((s) => s.email.loading);
  const sending = useSelector((s) => s.email.sending);

  const [replyBody, setReplyBody] = useState('');
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'html'
  const replyRef = useRef(null);

  const activeThreadSummary = threads.find((t) => t.id === activeThreadId);
  const messages = activeThreadId ? threadDetail[activeThreadId] || [] : [];
  const latestMessage = messages[messages.length - 1] || null;

  // Pre-fill quote when clicking Reply
  const handleOpenReply = () => {
    if (!latestMessage) return;
    const sender = formatSender(latestMessage.from);
    const dateFormatted = formatFullDate(latestMessage.date);
    const quote = `\n\nOn ${dateFormatted}, ${sender.name || sender.email} wrote:\n> ${
      (latestMessage.bodyText || '').split('\n').join('\n> ')
    }`;
    setReplyBody(quote);
    setShowReplyBox(true);
    setTimeout(() => {
      if (replyRef.current) {
        replyRef.current.focus();
        replyRef.current.setSelectionRange(0, 0);
      }
    }, 100);
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyBody.trim() || !latestMessage || sending) return;

    const sender = formatSender(latestMessage.from);
    const to = sender.email || latestMessage.from;
    const cleanSubject = latestMessage.subject.startsWith('Re:')
      ? latestMessage.subject
      : `Re: ${latestMessage.subject}`;

    try {
      await dispatch(
        sendEmail({
          to,
          subject: cleanSubject,
          body: replyBody,
          threadId: activeThreadId,
          inReplyTo: latestMessage.messageIdHeader || undefined,
          references: latestMessage.references
            ? `${latestMessage.references} ${latestMessage.messageIdHeader}`
            : latestMessage.messageIdHeader || undefined,
        })
      ).unwrap();

      setReplyBody('');
      setShowReplyBox(false);
      // Refresh thread
      dispatch(loadThread(activeThreadId));
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  if (!activeThreadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-8 select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center mb-4 border border-rose-100">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">No Email Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          Select an email thread from your inbox to read conversation details, inspect attachments, and send replies.
        </p>
      </div>
    );
  }

  const subjectTitle =
    messages[0]?.subject || activeThreadSummary?.subject || '(No Subject)';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Thread Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              title="Back to inbox"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {subjectTitle}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
              <span>&bull;</span>
              <span>Thread ID: {activeThreadId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenReply}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Reply</span>
          </button>
        </div>
      </div>

      {/* Messages Timeline Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading message conversation...</span>
          </div>
        ) : (
          messages.map((msg, index) => {
            const sender = formatSender(msg.from);
            const isLatest = index === messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm ${
                  isLatest
                    ? 'border-slate-300 ring-1 ring-slate-200'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Message Header */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar name={sender.name} size="md" />

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {sender.name}
                        </span>
                        {sender.email && (
                          <span className="text-[11px] text-slate-400 truncate">
                            &lt;{sender.email}&gt;
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        to <span className="font-medium text-slate-600">{msg.to || 'me'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatFullDate(msg.date)}
                    </span>
                    {msg.bodyHtml && (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => setActiveTab(activeTab === 'text' ? 'html' : 'text')}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          {activeTab === 'text' ? 'View HTML' : 'View Plain Text'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-5 overflow-x-auto">
                  {activeTab === 'html' && msg.bodyHtml ? (
                    <div
                      className="text-xs text-slate-800 leading-relaxed font-sans max-w-none prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                    />
                  ) : (
                    <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed select-text">
                      {msg.bodyText || msg.snippet || '(No content)'}
                    </pre>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Reply Section */}
        {showReplyBox ? (
          <form
            onSubmit={handleSendReply}
            className="bg-white rounded-2xl border border-rose-200 shadow-md p-5 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Replying to</span>
                <span className="text-xs font-medium text-rose-600">
                  {latestMessage ? formatSender(latestMessage.from).name : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReplyBox(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <textarea
              ref={replyRef}
              rows="6"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write your reply here..."
              disabled={sending}
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReplyBox(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || sending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Reply</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          latestMessage && (
            <div className="pt-2">
              <button
                onClick={handleOpenReply}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm transition-all"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Click here to reply to this thread...</span>
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
