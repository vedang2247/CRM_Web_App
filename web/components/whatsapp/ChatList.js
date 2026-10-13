'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Avatar from '@/components/Avatar';
import {
  setActiveChat,
  loadMessages,
  setSearch,
  setFilter,
} from '@/lib/slices/whatsappSlice';
import { emitAck } from '@/lib/socket';

/** Format timestamps nicely avoiding hydration mismatch */
function formatChatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
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

export default function ChatList({ onSelectChat }) {
  const dispatch = useDispatch();
  const chatsById = useSelector((s) => s.whatsapp.chatsById);
  const chatOrder = useSelector((s) => s.whatsapp.chatOrder);
  const activeChatId = useSelector((s) => s.whatsapp.activeChatId);
  const search = useSelector((s) => s.whatsapp.search);
  const filter = useSelector((s) => s.whatsapp.filter);
  const chatStatus = useSelector((s) => s.whatsapp.chatStatus);
  const loading = useSelector((s) => s.whatsapp.loading);
  const [linkedTasksByChat, setLinkedTasksByChat] = React.useState({});

  // Lazily fetch linked tasks for visible chats
  React.useEffect(() => {
    if (!chatOrder || chatOrder.length === 0) return;
    const fetchPromises = chatOrder.slice(0, 30).map(async (id) => {
      try {
        const res = await fetch(`/api/chats/linked-tasks?chatId=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.count > 0) {
            return { id, data };
          }
        }
      } catch {
        // ignore
      }
      return null;
    });

    Promise.all(fetchPromises).then((results) => {
      const map = {};
      results.filter(Boolean).forEach(({ id, data }) => {
        map[id] = data;
      });
      setLinkedTasksByChat(map);
    });
  }, [chatOrder]);

  const handleSelect = (chatId) => {
    dispatch(setActiveChat(chatId));
    dispatch(loadMessages(chatId));
    emitAck('wa:markRead', { chatId }).catch(() => {});
    if (onSelectChat) onSelectChat(chatId);
  };

  // Filter & Search logic
  const filteredChatIds = chatOrder.filter((id) => {
    const chat = chatsById[id];
    if (!chat) return false;

    // Filter by Open / Resolved
    const status = chatStatus[id] || 'open';
    if (filter === 'open' && status !== 'open') return false;
    if (filter === 'resolved' && status !== 'resolved') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = (chat.name || '').toLowerCase().includes(q);
      const msgMatch = (chat.lastMessage?.body || '').toLowerCase().includes(q);
      if (!nameMatch && !msgMatch) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Chats</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {chatOrder.length}
            </span>
          </h2>
          {loading && (
            <span className="text-xs text-wa-accent animate-pulse font-medium">
              Updating...
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search chats or messages..."
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wa-accent focus:border-transparent transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => dispatch(setSearch(''))}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {['all', 'open', 'resolved'].map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => dispatch(setFilter(tab))}
                className={`flex-1 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  active
                    ? 'bg-wa-accent text-white shadow-sm'
                    : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat List Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredChatIds.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <svg
              className="w-10 h-10 mb-2 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm font-medium text-slate-600">No chats found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try clearing your search term' : 'No chats matching this filter'}
            </p>
          </div>
        ) : (
          filteredChatIds.map((id) => {
            const chat = chatsById[id];
            if (!chat) return null;
            const isSelected = activeChatId === id;
            const status = chatStatus[id] || 'open';

            return (
              <div
                key={id}
                onClick={() => handleSelect(id)}
                className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors relative ${
                  isSelected
                    ? 'bg-teal-50/80 border-l-4 border-wa-accent'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative">
                  <Avatar name={chat.name} size="md" />
                  {chat.isGroup && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-700 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                      G
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-800 truncate pr-2">
                      {chat.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatChatTime(chat.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate pr-2 flex items-center gap-1">
                      {chat.lastMessage?.fromMe && (
                        <span className="text-wa-accent font-semibold text-[11px]">You:</span>
                      )}
                      <span>{chat.lastMessage?.body || 'No messages yet'}</span>
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {status === 'resolved' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          Resolved
                        </span>
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-wa-accent text-white text-[10px] font-bold flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked Tasks Badges */}
                  {linkedTasksByChat[id]?.taskCodes?.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {linkedTasksByChat[id].taskCodes.slice(0, 2).map((code) => (
                        <span
                          key={code}
                          className="font-mono text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded"
                        >
                          {code}
                        </span>
                      ))}
                      {linkedTasksByChat[id].taskCodes.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          +{linkedTasksByChat[id].taskCodes.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
