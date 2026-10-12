'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { sendWaMessage } from '@/lib/slices/whatsappSlice';

export default function Composer({ chatId }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const dispatch = useDispatch();

  // Focus input when active chat changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [chatId]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending || !chatId) return;

    setIsSending(true);
    setText('');
    try {
      await dispatch(sendWaMessage({ chatId, text: trimmed })).unwrap();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="p-3 bg-slate-50 border-t border-slate-200 flex items-end gap-2.5"
    >
      <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-wa-accent focus-within:border-transparent transition-all shadow-sm">
        <textarea
          ref={textareaRef}
          rows="1"
          placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!chatId || isSending}
          className="w-full text-sm text-slate-800 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none max-h-32 leading-relaxed"
          style={{ height: 'auto' }}
        />
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isSending || !chatId}
        className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center ${
          text.trim() && !isSending && chatId
            ? 'bg-wa-accent text-white hover:bg-emerald-600 active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
        title="Send message"
      >
        <svg
          className="w-5 h-5 translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </form>
  );
}
