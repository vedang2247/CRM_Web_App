'use client';

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import ConvertToTaskModal from '@/components/tasks/ConvertToTaskModal';

/** Format message time HH:mm */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
  // ── All hooks MUST come before any conditional return ──────────────────────
  const chatsById = useSelector((s) => s.whatsapp.chatsById);
  const [contextMenu, setContextMenu] = useState(null); // { x, y } | null
  const [showConvertModal, setShowConvertModal] = useState(false);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  const { body, fromMe, timestamp, ack, hasMedia, authorName, chatId } = message;

  const handleConvertToTask = useCallback(() => {
    setContextMenu(null);
    setShowConvertModal(true);
  }, []);

  // ── Guard: filter out empty messages, raw JIDs ─────────────────────────────
  if (!body || !body.trim() || body.endsWith('@lid') || body.endsWith('@c.us') || body.endsWith('@g.us')) {
    if (!hasMedia) return null;
  }

  // Render ack indicator ticks for outgoing messages
  const renderAck = () => {
    if (!fromMe) return null;

    if (ack >= 3) {
      return (
        <span className="text-[#53bdeb] font-bold text-[12px] inline-flex items-center tracking-tighter" title="Read">
          ✓✓
        </span>
      );
    }
    if (ack === 2) {
      return (
        <span className="text-slate-400 font-bold text-[12px] inline-flex items-center tracking-tighter" title="Delivered">
          ✓✓
        </span>
      );
    }
    if (ack === 1) {
      return (
        <span className="text-slate-400 font-bold text-[12px] inline-flex items-center" title="Sent">
          ✓
        </span>
      );
    }
    return (
      <span className="text-slate-400 text-[10px] inline-flex items-center" title="Sending">
        🕒
      </span>
    );
  };

  return (
    <>
      <div
        className={`flex w-full my-1 px-4 ${fromMe ? 'justify-end' : 'justify-start'}`}
        onContextMenu={handleContextMenu}
      >
        <div
          className={`max-w-[78%] md:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm text-sm relative break-words transition-all ${
            fromMe
              ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none'
              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
          } ${taskAdded ? 'ring-2 ring-wa-accent ring-offset-1' : ''}`}
        >
          {/* Sender name for group chats */}
          {!fromMe && authorName && (
            <p className="text-[11px] font-semibold text-teal-700 mb-0.5 select-none">
              {authorName}
            </p>
          )}

          {/* Task added indicator */}
          {taskAdded && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-wa-accent text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
              ✓ Added to Tasks
            </div>
          )}

          {/* Media indicator */}
          {hasMedia && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 italic mb-1">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Media Attachment</span>
            </div>
          )}

          {/* Text Body */}
          <p className="whitespace-pre-wrap leading-relaxed select-text">{body}</p>

          {/* Timestamp & Ack Ticks */}
          <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-2 select-none">
            <span className="text-[10px] text-slate-400">
              {formatTime(timestamp)}
            </span>
            {renderAck()}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Invisible backdrop to capture outside clicks */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => { e.preventDefault(); handleCloseContextMenu(); }}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 100),
              left: Math.min(contextMenu.x, window.innerWidth - 180),
            }}
          >
            <button
              onClick={handleConvertToTask}
              className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4 text-wa-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Convert to Task</span>
            </button>
            <div className="border-t border-slate-100 mx-2 my-1" />
            <button
              onClick={handleCloseContextMenu}
              className="w-full text-left px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Convert to Task Modal */}
      <ConvertToTaskModal
        isOpen={showConvertModal}
        message={message}
        onClose={() => setShowConvertModal(false)}
      />
    </>
  );
}
