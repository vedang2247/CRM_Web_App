'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * Toast notification system — Step 44 (M9)
 *
 * Usage:
 *   import { useToast } from '@/components/Toast';
 *   const { showToast } = useToast();
 *   showToast('Task TSK0005 created', 'success');
 *
 * Types: 'success' | 'error' | 'info' | 'warning'
 * Auto-dismisses after 3.5 seconds.
 * Max 3 toasts stacked at bottom-right.
 */

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Individual Toast ──────────────────────────────────────────────────────────

const ICONS = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: {
    bg:   'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600 bg-emerald-100',
    text: 'text-emerald-900',
    bar:  'bg-emerald-400',
  },
  error: {
    bg:   'bg-red-50 border-red-200',
    icon: 'text-red-600 bg-red-100',
    text: 'text-red-900',
    bar:  'bg-red-400',
  },
  warning: {
    bg:   'bg-amber-50 border-amber-200',
    icon: 'text-amber-600 bg-amber-100',
    text: 'text-amber-900',
    bar:  'bg-amber-400',
  },
  info: {
    bg:   'bg-blue-50 border-blue-200',
    icon: 'text-blue-600 bg-blue-100',
    text: 'text-blue-900',
    bar:  'bg-blue-400',
  },
};

const DURATION = 3500; // ms

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false); // for mount animation
  const [leaving, setLeaving] = useState(false);
  const timeoutRef = useRef(null);

  const s = STYLES[toast.type] ?? STYLES.info;

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    timeoutRef.current = setTimeout(() => dismiss(), DURATION);
    return () => clearTimeout(timeoutRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    clearTimeout(timeoutRef.current);
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 280);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
        px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        overflow-hidden cursor-pointer select-none
        transition-all duration-[280ms] ease-out
        ${s.bg}
        ${visible && !leaving
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
        }
      `}
      onClick={dismiss}
      title="Click to dismiss"
    >
      {/* Icon */}
      <span className={`flex items-center justify-center w-6 h-6 rounded-full mt-0.5 ${s.icon}`}>
        {ICONS[toast.type] ?? ICONS.info}
      </span>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium leading-snug ${s.text}`}>
        {toast.message}
      </p>

      {/* Close × */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className={`text-sm opacity-50 hover:opacity-100 transition-opacity ${s.text}`}
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Progress bar */}
      <span
        className={`absolute bottom-0 left-0 h-0.5 ${s.bar}`}
        style={{
          animation: `toast-shrink ${DURATION}ms linear forwards`,
        }}
      />
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      // Keep at most 3
      const next = [...prev, { id, message, type }];
      return next.slice(-3);
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Portal-style fixed container — bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* CSS animation keyframe injected inline */}
      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
