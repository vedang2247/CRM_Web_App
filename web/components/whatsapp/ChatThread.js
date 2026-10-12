'use client';

import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Avatar from '@/components/Avatar';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import { setChatStatus, setActiveChat, loadMessages } from '@/lib/slices/whatsappSlice';

/** Formats a timestamp into a friendly calendar date label */
function getDateLabel(timestamp) {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ChatThread({ onBack }) {
  const dispatch = useDispatch();
  const activeChatId = useSelector((s) => s.whatsapp.activeChatId);
  const chatsById = useSelector((s) => s.whatsapp.chatsById);
  const messagesByChat = useSelector((s) => s.whatsapp.messagesByChat);
  const chatStatus = useSelector((s) => s.whatsapp.chatStatus);

  const messagesEndRef = useRef(null);
  const activeChat = activeChatId ? chatsById[activeChatId] : null;
  const messages = activeChatId && messagesByChat[activeChatId] ? messagesByChat[activeChatId] : [];
  const currentStatus = activeChatId ? chatStatus[activeChatId] || 'open' : 'open';
  const messagesLoading = useSelector((s) => s.whatsapp.messagesLoading);
  const messagesError   = useSelector((s) => s.whatsapp.messagesError);
  // Has the chat ever had messages fetched? (key exists in messagesByChat)
  const hasFetched = activeChatId ? activeChatId in messagesByChat : false;

  // Scroll to bottom when messages change or chat is selected
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeChatId]);

  const toggleStatus = () => {
    if (!activeChatId) return;
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    dispatch(setChatStatus({ chatId: activeChatId, status: newStatus }));
  };

  if (!activeChatId || !activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-8 select-none">
        <div className="w-16 h-16 rounded-3xl bg-wa-accent/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-wa-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.39 5.08L2 22l5.08-1.34C8.54 21.52 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Chat Selected</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">
          Select a conversation from the sidebar to view chat history and reply in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
      {/* WhatsApp Wallpaper subtle pattern tint */}
      <div className="absolute inset-0 bg-[#efeae2] opacity-95 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={() => {
              dispatch(setActiveChat(null));
              if (onBack) onBack();
            }}
            className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Back to chat list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <Avatar name={activeChat.name} size="md" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {activeChat.name}
              </h2>
              {activeChat.isGroup && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  Group
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {activeChat.id}
            </p>
          </div>
        </div>

        {/* Ticket Status Toggle (Open / Resolved) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              currentStatus === 'resolved'
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Click to toggle ticket status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentStatus === 'resolved' ? 'bg-blue-500' : 'bg-emerald-500'
              }`}
            />
            <span className="capitalize">{currentStatus}</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="relative z-10 flex-1 overflow-y-auto py-3 space-y-1">
        {messagesLoading && messages.length === 0 ? (
          // ── Loading spinner ──────────────────────────────────────────────────
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-[3px] border-wa-accent/20 border-t-wa-accent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500 bg-white/80 px-3 py-1 rounded-full shadow-sm">
              Loading messages…
            </p>
          </div>
        ) : messages.length === 0 ? (
          // ── Empty / failed state ─────────────────────────────────────────────
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="p-3 rounded-full bg-white/70 shadow-sm mb-2">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            {hasFetched && messagesError ? (
              <>
                <p className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full shadow-sm">
                  Failed to load messages
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] break-words">
                  {messagesError}
                </p>
              </>
            ) : (
              <p className="text-xs font-medium text-slate-600 bg-white/80 px-3 py-1 rounded-full shadow-sm">
                {hasFetched ? 'No messages in this chat' : 'No messages loaded yet'}
              </p>
            )}
            {activeChatId && (
              <button
                onClick={() => dispatch(loadMessages(activeChatId))}
                className="mt-3 text-xs font-semibold text-wa-accent hover:underline"
              >
                {messagesError ? 'Retry' : 'Load messages'}
              </button>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const curDate = getDateLabel(msg.timestamp);
            const prevDate = prevMsg ? getDateLabel(prevMsg.timestamp) : null;
            const showDateHeader = curDate !== prevDate;

            return (
              <React.Fragment key={msg.id || index}>
                {showDateHeader && (
                  <div className="flex justify-center my-3">
                    <span className="bg-white/80 backdrop-blur-sm text-slate-600 text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-sm">
                      {curDate}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>


      {/* Composer */}
      <div className="relative z-10">
        <Composer chatId={activeChatId} />
      </div>
    </div>
  );
}
