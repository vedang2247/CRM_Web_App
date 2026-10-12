'use client';

/**
 * /connections — Step 6 skeleton
 *
 * Shows placeholder cards for WhatsApp and Gmail.
 * Full implementations added in:
 *   Step 10  → WhatsAppCard (QR, connected state, disconnect)
 *   Step 17  → GmailCard (OAuth button, email, disconnect)
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams }       from 'next/navigation';
import { useDispatch }           from 'react-redux';
import { setGmail, fetchGmailProfile } from '@/lib/slices/connectionsSlice';
import WhatsAppCard from '@/components/connections/WhatsAppCard';
import GmailCard from '@/components/connections/GmailCard';

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const gmailStatus = searchParams.get('gmail');
    const errorParam = searchParams.get('error');

    if (gmailStatus === 'connected') {
      dispatch(fetchGmailProfile());
      setToast({
        type: 'success',
        message: 'Gmail account connected successfully! You can now view and send emails.',
      });
      window.history.replaceState({}, '', '/connections');
    } else if (errorParam) {
      setToast({
        type: 'error',
        message: `Connection failed: ${decodeURIComponent(errorParam)}`,
      });
      window.history.replaceState({}, '', '/connections');
    }
  }, [searchParams, dispatch]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-8 overflow-y-auto">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Connections</h1>
        <p className="text-slate-500 text-sm mb-6">
          Link your WhatsApp and Gmail accounts to start managing customer communications.
        </p>

        {/* Status Toast */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs font-bold hover:opacity-75 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* WhatsApp Card */}
          <WhatsAppCard />

          {/* Gmail Card */}
          <GmailCard />
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsContent />
    </Suspense>
  );
}
