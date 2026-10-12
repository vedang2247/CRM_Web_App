/**
 * Socket singleton — pure connection management only.
 *
 * Why no Redux imports here?
 *   If socket.js imported Redux slices AND the slices' thunks imported
 *   getSocket() (which they will in Step 11), we'd have a circular
 *   dependency. Keeping this file Redux-free breaks that cycle.
 *
 * Event listeners that dispatch Redux actions are wired in providers.js
 * via the AppBootstrap inner component, which has access to useDispatch().
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * Returns the singleton socket instance, creating it on first call.
 * The socket is created with autoConnect:false — call socket.connect()
 * explicitly (done inside providers.js useEffect).
 */
export function getSocket() {
  if (socket) return socket;

  const url =
    process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:4000';

  socket = io(url, {
    autoConnect:         false,
    reconnection:        true,
    reconnectionDelay:   2000,
    reconnectionAttempts: Infinity,
    transports:          ['websocket', 'polling'],
  });

  return socket;
}

/**
 * Convenience helper: emit an event and return a Promise that resolves
 * with the acknowledgement payload.
 * Usage: await emitAck('wa:getChats')
 */
export function emitAck(event, payload) {
  return new Promise((resolve) => {
    const sock = getSocket();
    if (payload !== undefined) {
      sock.emit(event, payload, resolve);
    } else {
      sock.emit(event, resolve);
    }
  });
}
