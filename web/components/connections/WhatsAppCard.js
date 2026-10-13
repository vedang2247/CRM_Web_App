'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import { emitAck, forceReconnect } from '@/lib/socket';
import { setWaStatus } from '@/lib/slices/connectionsSlice';

export default function WhatsAppCard() {
  const dispatch = useDispatch();
  const wa = useSelector((s) => s.connections.wa);
  const [loggingOut, setLoggingOut] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const { state: waState, qr, me, error } = wa;

  const handleReconnect = () => {
    setReconnecting(true);
    forceReconnect();
    // Reset reconnecting state after 8 seconds (enough time to get QR or connect)
    setTimeout(() => setReconnecting(false), 8000);
  };

  const handleDisconnect = async () => {
    try {
      setLoggingOut(true);
      const res = await emitAck('wa:logout');
      if (res?.ok) {
        dispatch(setWaStatus({ state: 'disconnected', qr: null, me: null }));
      }
    } catch (err) {
      console.error('Failed to disconnect WhatsApp:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-chat p-6 border border-wa-divider flex flex-col justify-between transition-all duration-200">
      {/* ── Card Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-wa-divider/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wa-accent flex items-center justify-center shrink-0 shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-wa-text text-base">WhatsApp</h2>
            <p className="text-xs text-wa-muted">Realtime QR link via Chromium</p>
          </div>
        </div>

        {/* State Pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            waState === 'ready'
              ? 'bg-emerald-100 text-emerald-700'
              : waState === 'authenticating'
              ? 'bg-blue-100 text-blue-700'
              : waState === 'qr'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              waState === 'ready'
                ? 'bg-emerald-500 animate-pulse'
                : waState === 'authenticating'
                ? 'bg-blue-500 animate-ping'
                : waState === 'qr'
                ? 'bg-amber-500'
                : 'bg-gray-400'
            }`}
          />
          {waState === 'ready'
            ? 'Connected'
            : waState === 'authenticating'
            ? 'Linking...'
            : waState === 'qr'
            ? 'Scan QR'
            : 'Disconnected'}
        </span>
      </div>

      {/* ── Card Body ──────────────────────────────────────────────── */}
      <div className="py-6 flex flex-col items-center justify-center min-h-[300px]">
        {/* Error alert banner */}
        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* State: READY */}
        {waState === 'ready' && (
          <div className="w-full flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Active Session</p>
              <h3 className="text-lg font-bold text-wa-text mt-0.5">
                {me?.name || 'WhatsApp User'}
              </h3>
              <p className="text-sm text-wa-muted font-mono mt-0.5">
                {me?.number ? `+${me.number}` : 'Connected'}
              </p>
            </div>

            <div className="w-full pt-4 flex gap-3">
              <Link
                href="/whatsapp"
                className="flex-1 py-2.5 px-4 bg-wa-accent hover:bg-wa-accent-dark text-white text-sm font-medium rounded-xl transition-colors shadow-sm text-center"
              >
                Open Inbox →
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loggingOut}
                className="py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {loggingOut ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        )}

        {/* State: AUTHENTICATING */}
        {waState === 'authenticating' && (
          <div className="flex flex-col items-center text-center space-y-3 py-6">
            <div className="w-12 h-12 border-4 border-wa-accent/20 border-t-wa-accent rounded-full animate-spin" />
            <h3 className="text-sm font-semibold text-wa-text">Linking your device...</h3>
            <p className="text-xs text-wa-muted max-w-xs">
              Authenticated successfully! Setting up chat sessions and synchronizing recent conversations.
            </p>
          </div>
        )}

        {/* State: QR */}
        {waState === 'qr' && qr && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-white border border-wa-divider rounded-2xl shadow-sm inline-block">
              <QRCodeSVG value={qr} size={220} level="M" />
            </div>

            <div className="text-left space-y-1.5 max-w-xs text-xs text-wa-muted bg-wa-panel/60 p-3 rounded-xl border border-wa-divider/40">
              <p className="font-semibold text-wa-text text-[13px] mb-1">To link your WhatsApp:</p>
              <p>1. Open WhatsApp on your phone</p>
              <p>2. Tap <strong>Menu (⋮)</strong> or <strong>Settings → Linked Devices</strong></p>
              <p>3. Tap <strong>Link a Device</strong> and point your camera here</p>
            </div>
            <p className="text-[11px] text-wa-muted italic">Code refreshes automatically</p>
          </div>
        )}

        {/* State: DISCONNECTED (waiting for QR from server) */}
        {waState === 'disconnected' && (
          <div className="flex flex-col items-center text-center space-y-3 py-6">
            <div className="w-12 h-12 rounded-full bg-wa-panel flex items-center justify-center text-wa-muted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-wa-text">WhatsApp Client Offline</h3>
            <p className="text-xs text-wa-muted max-w-xs">
              {reconnecting
                ? 'Connecting to WhatsApp service…'
                : 'Waiting for connection to WhatsApp backend service. A QR code will appear here once ready.'}
            </p>
            {/* Manual reconnect button */}
            <button
              id="wa-reconnect-btn"
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mt-2 px-4 py-2 bg-wa-accent hover:bg-wa-accent-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {reconnecting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reconnect
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Card Footer ────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-wa-divider/60 flex items-center justify-between text-[11px] text-wa-muted">
        <span>Session: In-memory + LocalAuth</span>
        <span>Port :4000</span>
      </div>
    </div>
  );
}
