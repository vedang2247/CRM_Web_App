'use client';

/**
 * providers.js — Redux Provider + App Bootstrap
 *
 * Why the AppBootstrap inner component?
 *   - useDispatch() and other Redux hooks require being inside <Provider>.
 *   - Socket event listeners need `dispatch` to push actions.
 *   - Putting them in a child component (AppBootstrap) solves the
 *     "hooks must be inside Provider" constraint without awkward workarounds.
 *
 * Why socket listeners live here instead of socket.js?
 *   - socket.js has NO Redux imports (keeps it circular-dep free).
 *   - Thunks in whatsappSlice.js will import getSocket() safely.
 *
 * Layout rendered here:
 *   <Provider>
 *     <AppBootstrap>
 *       <TopNav />           ← sticky global nav (inside Provider for hooks)
 *       <main>{children}</main>
 *     </AppBootstrap>
 *   </Provider>
 */

import { useEffect }        from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store }            from '@/lib/store';
import { getSocket }        from '@/lib/socket';
import { setWaStatus, fetchGmailProfile } from '@/lib/slices/connectionsSlice';
import { setChats, upsertMessage, setAck } from '@/lib/slices/whatsappSlice';
import TopNav               from '@/components/TopNav';

// ─── Inner bootstrap — runs inside the Provider so hooks work ───────────────

function AppBootstrap({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. Get (or create) the singleton socket and connect
    const socket = getSocket();
    socket.connect();

    // 2. Wire server → Redux
    const onStatus       = (data)             => dispatch(setWaStatus(data));
    const onChats        = (chats)            => dispatch(setChats(chats));
    const onMessage      = (msg)              => dispatch(upsertMessage(msg));
    const onAck          = ({ chatId, id, ack }) => dispatch(setAck({ chatId, id, ack }));
    const onConnectError = ()                 => dispatch(setWaStatus({
      state: 'disconnected',
      error: 'WhatsApp server not reachable (is server/ running?)',
    }));
    const onDisconnect   = (reason)           => {
      // If the server forced the disconnect, let socket.io reconnect automatically.
      // Either way, update Redux state.
      dispatch(setWaStatus({ state: 'disconnected', error: null }));
      if (reason === 'io server disconnect') socket.connect();
    };

    socket.on('wa:status',     onStatus);
    socket.on('wa:chats',      onChats);
    socket.on('wa:message',    onMessage);
    socket.on('wa:ack',        onAck);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect',    onDisconnect);

    // 3. Restore Gmail session from httpOnly cookie (silent — 401 → stays disconnected)
    dispatch(fetchGmailProfile());

    // Cleanup: remove this set of listeners if the component ever unmounts.
    // (In practice Providers never unmounts, but good practice for HMR.)
    return () => {
      socket.off('wa:status',     onStatus);
      socket.off('wa:chats',      onChats);
      socket.off('wa:message',    onMessage);
      socket.off('wa:ack',        onAck);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect',    onDisconnect);
    };
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-wa-panel">
      <TopNav />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// ─── Outer Provider ────────────────────────────────────────────────────────

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <AppBootstrap>{children}</AppBootstrap>
    </Provider>
  );
}
