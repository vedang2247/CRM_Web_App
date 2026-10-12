'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { loadChats } from '@/lib/slices/whatsappSlice';
import ChatList from '@/components/whatsapp/ChatList';
import ChatThread from '@/components/whatsapp/ChatThread';
import TaskDrawer from '@/components/whatsapp/TaskDrawer';

export default function WhatsAppPage() {
  const dispatch = useDispatch();
  const waState = useSelector((s) => s.connections.wa.state);
  const activeChatId = useSelector((s) => s.whatsapp.activeChatId);
  const tasks = useSelector((s) => s.whatsapp.tasks);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);

  // Load chats on mount or whenever WhatsApp transitions to ready
  useEffect(() => {
    if (waState === 'ready') {
      dispatch(loadChats());
    }
  }, [waState, dispatch]);

  // Keep mobile view in sync when a chat is selected
  useEffect(() => {
    if (activeChatId) {
      setMobileShowThread(true);
    }
  }, [activeChatId]);

  // ── Not connected empty state ────────────────────────────────────
  if (waState !== 'ready') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-wa-accent/10 flex items-center justify-center shadow-sm">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">WhatsApp not connected</h2>
          <p className="text-sm text-slate-500 mt-1">
            Link your WhatsApp account in Connections to view and reply to chats.
          </p>
        </div>
        <Link
          href="/connections"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-wa-accent text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
        >
          Go to Connections →
        </Link>
      </div>
    );
  }

  // ── Two-pane layout ──────────────────────────────────────────────
  return (
    <>
      <div className="relative flex h-full w-full overflow-hidden bg-white">
        {/* Left pane — Chat list (hidden on mobile if thread is active) */}
        <aside
          className={`w-full md:w-[350px] lg:w-[380px] shrink-0 h-full border-r border-slate-200 flex flex-col ${
            mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatList onSelectChat={() => setMobileShowThread(true)} />
        </aside>

        {/* Right pane — Chat thread (hidden on mobile if no active chat) */}
        <section
          className={`flex-1 h-full overflow-hidden ${
            !mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Task Drawer toggle button in thread header area */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Task toggle button — floats over the chat */}
            <button
              onClick={() => setTaskDrawerOpen(!taskDrawerOpen)}
              className={`absolute top-2.5 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all border ${
                taskDrawerOpen
                  ? 'bg-wa-accent text-white border-wa-accent'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle task drawer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="hidden sm:inline">Tasks</span>
              {tasks.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  taskDrawerOpen ? 'bg-white/30 text-white' : 'bg-wa-accent text-white'
                }`}>
                  {tasks.length}
                </span>
              )}
            </button>

            <ChatThread onBack={() => setMobileShowThread(false)} />
          </div>
        </section>
      </div>

      {/* Task Drawer — slide-in panel from right */}
      <TaskDrawer
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
      />
    </>
  );
}
