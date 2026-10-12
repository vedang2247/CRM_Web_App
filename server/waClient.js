import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

/**
 * State object tracking WhatsApp client status:
 * state: 'disconnected' | 'qr' | 'authenticating' | 'ready'
 * qr: raw QR string (for qrcode.react)
 * me: { number, name }
 * error: string | null
 */
const state = {
  state: 'disconnected',
  qr: null,
  me: null,
  error: null,
};

let client = null;

/**
 * Format a whatsapp-web.js Message into the spec Message shape:
 * { id, chatId, body, fromMe, timestamp (ms), ack, hasMedia, type }
 */
export function formatMessage(msg) {
  const chatId = msg.id?.remote?._serialized || msg.id?.remote || (msg.fromMe ? msg.to : msg.from);
  const myUser = client?.info?.wid?.user || '';
  const author = msg.author?._serialized || msg.author || msg.id?.participant?._serialized || msg.id?.participant || '';
  const authorUser = typeof author === 'string' && author ? author.split('@')[0] : (msg.author?.user || '');
  const fromMeFlag = Boolean(msg.fromMe || msg.id?.fromMe);
  const isFromMe = fromMeFlag && (!authorUser || !myUser || authorUser === myUser);
  const authorName = !isFromMe ? (msg._data?.notifyName || msg.notifyName || authorUser || '') : '';

  let bodyText = msg.body || '';
  if (msg.hasMedia && !bodyText) {
    if (msg.type === 'image') bodyText = '[Image]';
    else if (msg.type === 'video') bodyText = '[Video]';
    else if (msg.type === 'audio' || msg.type === 'ptt') bodyText = '[Voice message]';
    else if (msg.type === 'document') bodyText = '[Document]';
    else if (msg.type === 'sticker') bodyText = '[Sticker]';
    else bodyText = '[Media message]';
  } else if (msg.type === 'vcard' || msg.type === 'multi_vcard') {
    bodyText = '[Contact Card]';
  } else if (msg.type === 'location') {
    bodyText = '[Location]';
  } else if (msg.type === 'poll_creation') {
    bodyText = '[Poll]';
  } else if (msg.type === 'revoked') {
    bodyText = '[This message was deleted]';
  }

  return {
    id: msg.id?._serialized || String(Date.now()),
    chatId: typeof chatId === 'string' ? chatId : (chatId?._serialized || ''),
    body: bodyText,
    fromMe: isFromMe,
    authorName,
    timestamp: (msg.timestamp ? msg.timestamp * 1000 : Date.now()),
    ack: typeof msg.ack === 'number' ? msg.ack : 0,
    hasMedia: Boolean(msg.hasMedia),
    type: msg.type || 'chat',
  };
}

/**
 * Push top 40 chats to the browser over Socket.io:
 * Chat = { id, name, isGroup, unreadCount, timestamp, lastMessage }
 */
export async function pushChatList(target, retries = 5) {
  if (!client || state.state !== 'ready') return [];

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let rawChats;
      try {
        rawChats = await client.getChats();
      } catch (nativeErr) {
        console.warn(`[WhatsApp] Native client.getChats() error: ${nativeErr?.message || nativeErr}. Trying direct page evaluation fallback...`);
        if (client.pupPage) {
          rawChats = await client.pupPage.evaluate(() => {
            try {
              const ChatColl = window.require('WAWebCollections')?.Chat;
              if (!ChatColl) return [];
              const models = typeof ChatColl.getModelsArray === 'function'
                ? ChatColl.getModelsArray()
                : (ChatColl.models || []);

              return models.map((c) => {
                try {
                  const idSerialized = c.id?._serialized || (typeof c.id === 'string' ? c.id : (c.id?.user ? `${c.id.user}@${c.id.server}` : ''));
                  if (!idSerialized || idSerialized === 'status@broadcast') return null;

                  const name = c.formattedTitle || c.name || c.contact?.name || c.contact?.pushname || (c.id && c.id.user) || 'Unknown';
                  const isGroup = Boolean(c.isGroup || idSerialized.endsWith('@g.us'));
                  const unreadCount = typeof c.unreadCount === 'number' ? c.unreadCount : 0;
                  const timestamp = c.t || c.timestamp || Math.floor(Date.now() / 1000);

                  let lastMessage = null;
                  if (c.lastReceivedKey || c.msgs) {
                    let last = null;
                    if (c.msgs && typeof c.msgs.last === 'function') {
                      last = c.msgs.last();
                    } else if (c.msgs && Array.isArray(c.msgs.models) && c.msgs.models.length > 0) {
                      last = c.msgs.models[c.msgs.models.length - 1];
                    }
                    if (last) {
                      let myUser = '';
                      try {
                        const myWid = window.require('WAWebConn')?.Conn?.wid?._serialized || '';
                        myUser = myWid ? myWid.split('@')[0] : '';
                      } catch {}
                      const fromMeFlag = Boolean(last.fromMe ?? last.id?.fromMe);
                      const author = last.author?._serialized || last.author || (last.id?.participant?._serialized || last.id?.participant) || '';
                      const authorUser = typeof author === 'string' && author ? author.split('@')[0] : '';
                      const isFromMe = fromMeFlag && (!authorUser || !myUser || authorUser === myUser);

                      let bodyText = last.body || '';
                      if (last.hasMedia || ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(last.type)) {
                        bodyText = '[Media message]';
                      } else if (['protocol', 'gp2', 'e2e_notification', 'notification_template'].includes(last.type) || /^\d{9,13}$/.test(bodyText.trim())) {
                        bodyText = '';
                      }
                      if (bodyText) {
                        lastMessage = {
                          body: bodyText,
                          fromMe: isFromMe,
                        };
                      }
                    }
                  }

                  return {
                    id: { _serialized: idSerialized, user: c.id?.user },
                    name,
                    formattedTitle: name,
                    isGroup,
                    unreadCount,
                    timestamp,
                    lastMessage,
                  };
                } catch {
                  return null;
                }
              }).filter(Boolean);
            } catch {
              return [];
            }
          });
        }
      }

      if (!Array.isArray(rawChats)) {
        throw new Error('Could not retrieve chat array from WhatsApp Web');
      }

      const chats = rawChats
        .filter((c) => c && c.id && ((c.id._serialized || c.id) !== 'status@broadcast'))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 40)
        .map((c) => {
          const serializedId = c.id?._serialized || (typeof c.id === 'string' ? c.id : (c.id?.user ? `${c.id.user}@c.us` : ''));
          return {
            id: serializedId,
            name: c.name || c.formattedTitle || (c.id && c.id.user) || 'Unknown',
            isGroup: Boolean(c.isGroup),
            unreadCount: typeof c.unreadCount === 'number' ? c.unreadCount : 0,
            timestamp: c.timestamp || Math.floor(Date.now() / 1000),
            lastMessage: c.lastMessage
              ? {
                  body: c.lastMessage.hasMedia ? '[Media message]' : (c.lastMessage.body || ''),
                  fromMe: Boolean(c.lastMessage.fromMe),
                }
              : null,
          };
        });

      if (chats.length > 0) {
        console.log(`[WhatsApp] Successfully loaded and pushed ${chats.length} chats to browser.`);
        if (target && typeof target.emit === 'function') {
          target.emit('wa:chats', chats);
        }
      } else {
        console.warn('[WhatsApp] No chats found on this attempt, skipping emit to preserve existing chats.');
      }
      return chats;
    } catch (err) {
      console.warn(`[WhatsApp] getChats attempt ${attempt}/${retries} failed: ${err?.message || err}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.error('[WhatsApp] getChats failed after all retries.');
  return [];
}

/**
 * Initialize WhatsApp client with LocalAuth & event listeners.
 */
export function init(io) {
  console.log('[WhatsApp] Initializing WhatsApp client...');

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    webVersionCache: {
      type: 'none',
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });

  client.on('qr', (qr) => {
    console.log('[WhatsApp] QR code received');
    state.state = 'qr';
    state.qr = qr;
    state.error = null;
    io.emit('wa:status', { state: 'qr', qr });
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated');
    state.state = 'authenticating';
    state.qr = null;
    io.emit('wa:status', { state: 'authenticating' });
  });

  client.on('ready', async () => {
    console.log('[WhatsApp] Client ready!');
    const widUser = client.info?.wid?.user || '';
    const pushname = client.info?.pushname || '';
    state.state = 'ready';
    state.qr = null;
    state.error = null;
    state.me = { number: widUser, name: pushname };

    io.emit('wa:status', { state: 'ready', me: state.me });

    // Wait 3s for WhatsApp Web to fully sync contacts/chats before fetching
    setTimeout(async () => {
      await pushChatList(io);
    }, 3000);
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    state.state = 'disconnected';
    state.qr = null;
    state.error = String(msg);
    io.emit('wa:status', { state: 'disconnected', error: String(msg) });
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Disconnected:', reason);
    state.state = 'disconnected';
    state.qr = null;
    state.me = null;
    state.error = String(reason);
    io.emit('wa:status', { state: 'disconnected', reason: String(reason) });

    // Re-initialize so a new QR appears
    client.initialize().catch((err) => {
      console.error('[WhatsApp] Re-initialization error:', err.message);
    });
  });

  client.on('message_create', (msg) => {
    if (state.state !== 'ready') return;
    if (!msg) return;
    if (msg.isNotification || msg.isGroupNotification) return;
    const type = msg.type || '';
    if (['notification_template', 'gp2', 'e2e_notification', 'protocol', 'ciphertext', 'broadcast_notification'].includes(type)) {
      return;
    }
    const formatted = formatMessage(msg);
    if (!formatted.body?.trim() || formatted.body.endsWith('@lid') || formatted.body.endsWith('@c.us') || formatted.body.endsWith('@g.us')) {
      if (!formatted.hasMedia) return;
    }
    io.emit('wa:message', formatted);
  });

  client.on('message_ack', (msg, ack) => {
    if (state.state !== 'ready') return;
    // msg.id.remote is a WID object — always extract ._serialized for a plain string
    const chatId =
      msg.id?.remote?._serialized ||
      (typeof msg.id?.remote === 'string' ? msg.id.remote : null) ||
      (msg.fromMe ? msg.to : msg.from);
    if (!chatId || !msg.id?._serialized) return;
    io.emit('wa:ack', {
      chatId,
      id: msg.id._serialized,
      ack: typeof ack === 'number' ? ack : (msg.ack ?? 0),
    });
  });

  client.initialize().catch((err) => {
    console.error('[WhatsApp] Initial launch failed:', err.message);
    state.state = 'disconnected';
    state.error = err.message;
    io.emit('wa:status', { state: 'disconnected', error: err.message });
  });

  return { client, state };
}

export function getState() {
  return state;
}

export function getClient() {
  return client;
}
