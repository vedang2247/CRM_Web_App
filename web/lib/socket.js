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
 * with the acknowledgement payload, or rejects after a timeout.
 *
 * Why a timeout? If the socket is disconnected or the server never calls
 * the ack callback, the Promise would hang forever — freezing loadChats /
 * loadMessages with loading:true and no recovery path.
 *
 * Usage: await emitAck('wa:getChats')
 *        await emitAck('wa:getMessages', { chatId, limit: 50 }, 20000)
 */
export function emitAck(event, payload, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const sock = getSocket();

    const timer = setTimeout(() => {
      reject(new Error(`Socket timeout: no ack for "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const done = (result) => {
      clearTimeout(timer);
      resolve(result);
    };

    if (payload !== undefined) {
      sock.emit(event, payload, done);
    } else {
      sock.emit(event, done);
    }
  });
}
