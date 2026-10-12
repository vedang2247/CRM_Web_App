import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { init, getState, getClient, pushChatList, formatMessage } from './waClient.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:3000';

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'running',
    whatsapp: getState(),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: WEB_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Initialize WhatsApp Client & bridge
init(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Emit current WhatsApp status immediately on connect (page-refresh recovery)
  socket.emit('wa:status', getState());
  if (getState().state === 'ready') {
    pushChatList(socket).catch((err) => {
      console.warn('[Socket] Failed to push chat list on connect:', err?.message || err);
    });
  }

  // 1. Fetch chat list
  socket.on('wa:getChats', async (ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    const state = getState();
    if (state.state !== 'ready') {
      return cb({ ok: false, error: 'not_ready' });
    }
    try {
      const chats = await pushChatList(io);
      cb({ ok: true, chats });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  // 2. Fetch messages for a chat
  socket.on('wa:getMessages', async (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : (typeof payload === 'function' ? payload : () => {});
    const data = typeof payload === 'object' && payload !== null ? payload : {};
    const { chatId, limit = 50 } = data;

    const state = getState();
    const client = getClient();
    if (state.state !== 'ready' || !client) {
      return cb({ ok: false, error: 'not_ready' });
    }

    try {
      if (client.pupPage) {
        const messages = await client.pupPage.evaluate(async (cId, lim) => {
          try {
            const ChatColl = window.require('WAWebCollections')?.Chat;
            if (!ChatColl) return [];
            let chatModel = ChatColl.get(cId);
            if (!chatModel) {
              try {
                const wid = window.require('WAWebWidFactory')?.createWid(cId);
                if (wid) chatModel = ChatColl.get(wid);
              } catch {}
            }
            if (!chatModel) {
              const arr = ChatColl.getModelsArray ? ChatColl.getModelsArray() : (ChatColl.models || []);
              chatModel = arr.find((x) => x?.id?._serialized === cId || x?.id === cId);
            }
            if (!chatModel || !chatModel.msgs) return [];

            // Load earlier messages if needed
            if (chatModel.msgs.length < lim) {
              try {
                const loader = window.require('WAWebChatLoadMessages');
                if (loader && typeof loader.loadEarlierMsgs === 'function') {
                  await loader.loadEarlierMsgs({ chat: chatModel });
                }
              } catch {}
            }

            let myUser = '';
            try {
              const myWid = window.require('WAWebConn')?.Conn?.wid?._serialized || '';
              myUser = myWid ? myWid.split('@')[0] : '';
            } catch {}

            const models = chatModel.msgs.getModelsArray ? chatModel.msgs.getModelsArray() : (chatModel.msgs.models || []);

            // Filter out system notifications, gp2 events, reactions, and protocols
            const filtered = models.filter((m) => {
              if (!m) return false;
              if (m.isNotification || m.isGroupNotification) return false;
              const type = m.type || '';
              if (['notification_template', 'gp2', 'e2e_notification', 'protocol', 'ciphertext', 'broadcast_notification'].includes(type)) {
                return false;
              }
              return true;
            });

            const slice = filtered.slice(-lim);

            return slice.map((m) => {
              try {
                const idSerialized = m.id?._serialized || String(Date.now() + Math.random());
                const remoteChatId = m.id?.remote?._serialized || m.id?.remote || (m.id?.fromMe ? m.to : m.from) || cId;

                // Sender & author
                const author = m.author?._serialized || m.author || (m.id?.participant?._serialized || m.id?.participant) || '';
                const authorUser = typeof author === 'string' && author ? author.split('@')[0] : '';
                const fromMeFlag = Boolean(m.fromMe ?? m.id?.fromMe);
                const isFromMe = fromMeFlag && (!authorUser || !myUser || authorUser === myUser);

                // Author display name (for group chats)
                let authorName = '';
                if (!isFromMe && authorUser) {
                  try {
                    const contact = window.require('WAWebCollections')?.Contact?.get(author);
                    authorName = contact?.name || contact?.pushname || contact?.formattedName || authorUser;
                  } catch {
                    authorName = authorUser;
                  }
                }

                // Body formatting
                let bodyText = m.body || '';
                if (m.caption) {
                  bodyText = m.caption;
                }

                const isMedia = Boolean(m.hasMedia || ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(m.type));
                if (isMedia && !bodyText) {
                  if (m.type === 'image') bodyText = '[Image]';
                  else if (m.type === 'video') bodyText = '[Video]';
                  else if (m.type === 'audio' || m.type === 'ptt') bodyText = '[Voice message]';
                  else if (m.type === 'document') bodyText = m.filename ? `[Document: ${m.filename}]` : '[Document]';
                  else if (m.type === 'sticker') bodyText = '[Sticker]';
                  else bodyText = '[Media message]';
                } else if (m.type === 'vcard' || m.type === 'multi_vcard') {
                  bodyText = '[Contact Card]';
                } else if (m.type === 'location') {
                  bodyText = '[Location]';
                } else if (m.type === 'poll_creation') {
                  bodyText = m.pollName ? `[Poll: ${m.pollName}]` : '[Poll]';
                } else if (m.type === 'revoked') {
                  bodyText = '[This message was deleted]';
                }

                // Discard empty text or raw JIDs
                if (!bodyText.trim() || bodyText.endsWith('@lid') || bodyText.endsWith('@c.us') || bodyText.endsWith('@g.us')) {
                  return null;
                }

                return {
                  id: idSerialized,
                  chatId: typeof remoteChatId === 'string' ? remoteChatId : cId,
                  body: bodyText,
                  fromMe: isFromMe,
                  authorName,
                  timestamp: m.t ? m.t * 1000 : Date.now(),
                  ack: typeof m.ack === 'number' ? m.ack : 0,
                  hasMedia: isMedia,
                  type: m.type || 'chat',
                };
              } catch {
                return null;
              }
            }).filter(Boolean);
          } catch {
            return [];
          }
        }, chatId, limit);

        if (Array.isArray(messages)) {
          return cb({ ok: true, messages });
        }
      }

      cb({ ok: true, messages: [] });
    } catch (err) {
      console.warn(`[WhatsApp] Error in getMessages for ${chatId}:`, err?.message || err);
      cb({ ok: true, messages: [] });
    }
  });

  // 3. Send message (Strictly user-triggered only)
  socket.on('wa:send', async (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    const { chatId, text } = payload || {};
    console.log(`[WhatsApp User Send] Explicit send for chat: ${chatId}`);
    const state = getState();
    const client = getClient();
    if (state.state !== 'ready' || !client) {
      return cb({ ok: false, error: 'not_ready' });
    }
    if (!text || !text.trim() || !chatId) {
      return cb({ ok: false, error: 'empty_text' });
    }
    try {
      const sentMsg = await client.sendMessage(chatId, text.trim());
      const formatted = formatMessage(sentMsg);
      cb({ ok: true, message: formatted });
    } catch (err) {
      console.error('[WhatsApp Send Error]:', err.message);
      cb({ ok: false, error: err.message });
    }
  });

  // 4. Mark chat read
  socket.on('wa:markRead', async (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    const { chatId } = payload || {};
    const state = getState();
    const client = getClient();
    if (state.state !== 'ready' || !client) {
      return cb({ ok: false, error: 'not_ready' });
    }
    try {
      if (client.pupPage) {
        await client.pupPage.evaluate(async (cId) => {
          try {
            const ChatColl = window.require('WAWebCollections')?.Chat;
            let chat = ChatColl?.get(cId);
            if (!chat) {
              const arr = ChatColl?.getModelsArray ? ChatColl.getModelsArray() : (ChatColl?.models || []);
              chat = arr.find((x) => x?.id?._serialized === cId || x?.id === cId);
            }
            if (chat && typeof chat.sendSeen === 'function') {
              await chat.sendSeen();
            }
          } catch {}
        }, chatId);
      }
      cb({ ok: true });
    } catch (err) {
      cb({ ok: true });
    }
  });

  // 5. Logout
  socket.on('wa:logout', async (ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    const client = getClient();
    if (!client) {
      return cb({ ok: false, error: 'no_client' });
    }
    try {
      await client.logout();
      const state = getState();
      state.state = 'disconnected';
      state.qr = null;
      state.me = null;
      io.emit('wa:status', { state: 'disconnected' });
      cb({ ok: true });

      // Re-initialize to generate a new QR
      client.initialize().catch((err) => {
        console.error('[WhatsApp] Re-initialization error after logout:', err.message);
      });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[Server] WhatsApp server listening on http://localhost:${PORT}`);
  console.log(`[Server] CORS configured for: ${WEB_ORIGIN}`);
});
