import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { emitAck } from '@/lib/socket';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sort chatOrder array by chatsById[id].timestamp descending */
function sortByTimestamp(chatOrder, chatsById) {
  return [...chatOrder].sort((a, b) => {
    const ta = chatsById[a]?.timestamp ?? 0;
    const tb = chatsById[b]?.timestamp ?? 0;
    return tb - ta;
  });
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const loadChats = createAsyncThunk(
  'whatsapp/loadChats',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const res = await emitAck('wa:getChats');
      if (res && res.ok) {
        // pushChatList on the server already emitted 'wa:chats' to this socket,
        // which providers.js handles and dispatches setChats automatically.
        // No need to dispatch setChats here — doing so would double-apply the
        // same chat list and cause a redundant re-render race.
        return res.chats || [];
      }
      const err = res?.error || 'Failed to load chats';
      dispatch(setError(err));
      return rejectWithValue(err);
    } catch (err) {
      dispatch(setError(err.message));
      return rejectWithValue(err.message);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const loadMessages = createAsyncThunk(
  'whatsapp/loadMessages',
  async (chatId, { dispatch, getState, rejectWithValue }) => {
    try {
      dispatch(setMessagesLoading(true));
      dispatch(setMessagesError(null));
      const res = await emitAck('wa:getMessages', { chatId, limit: 50 }, 25000);
      if (res && res.ok && Array.isArray(res.messages)) {
        dispatch(setMessages({ chatId, messages: res.messages }));
        return { chatId, messages: res.messages };
      }
      const errMsg = res?.error || 'Failed to load messages';
      const existing = getState().whatsapp?.messagesByChat?.[chatId];
      if (!existing || existing.length === 0) {
        dispatch(setMessages({ chatId, messages: [] }));
      }
      dispatch(setMessagesError(errMsg));
      return rejectWithValue(errMsg);
    } catch (err) {
      const errMsg = err.message || 'Failed to load messages';
      const existing = getState().whatsapp?.messagesByChat?.[chatId];
      if (!existing || existing.length === 0) {
        dispatch(setMessages({ chatId, messages: [] }));
      }
      dispatch(setMessagesError(errMsg));
      return rejectWithValue(errMsg);
    } finally {
      dispatch(setMessagesLoading(false));
    }
  }
);

export const sendWaMessage = createAsyncThunk(
  'whatsapp/sendWaMessage',
  async ({ chatId, text }, { dispatch, rejectWithValue }) => {
    const tempId = `tmp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      chatId,
      body: text,
      fromMe: true,
      timestamp: Date.now(),
      ack: 0,
      hasMedia: false,
      type: 'chat',
    };
    dispatch(upsertMessage(optimisticMsg));

    try {
      const res = await emitAck('wa:send', { chatId, text });
      dispatch(removeMessage({ chatId, id: tempId }));
      if (res && res.ok && res.message) {
        dispatch(upsertMessage(res.message));
        return res.message;
      }
      return rejectWithValue(res?.error || 'Failed to send message');
    } catch (err) {
      dispatch(removeMessage({ chatId, id: tempId }));
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const whatsappSlice = createSlice({
  name: 'whatsapp',
  initialState: {
    /**
     * chatsById  : { [chatId]: Chat }
     * chatOrder  : chatId[] sorted by timestamp desc
     * Chat shape : { id, name, isGroup, unreadCount, timestamp, lastMessage }
     */
    chatsById:     {},
    chatOrder:     [],

    /**
     * messagesByChat : { [chatId]: Message[] }  oldest → newest
     * Message shape  : { id, chatId, body, fromMe, timestamp(ms), ack, hasMedia, type }
     */
    messagesByChat: {},

    activeChatId: null,

    /** Free-text search against chat name / last message body */
    search: '',

    /**
     * chatStatus : { [chatId]: 'open' | 'resolved' }
     * Persisted to localStorage so it survives page refresh.
     */
    chatStatus: {},

    /** 'open' | 'resolved' | 'all' */
    filter: 'all',

    /**
     * tasks: Task[]
     * Task shape: { id, text, chatId, chatName, createdAt }
     * In-memory only — resets on page refresh (no DB).
     */
    tasks: [],

    loading: false,
    /** True while wa:getMessages ack is in-flight for the active chat */
    messagesLoading: false,
    error:   null,
    /** Last error message from loadMessages (null when no error) */
    messagesError: null,
  },

  reducers: {
    // ── Chat list ─────────────────────────────────────────────────────────────

    /**
     * Replace the entire chat list (called after wa:getChats ack).
     * Also rehydrates chatStatus from localStorage.
     */
    setChats(state, action) {
      const chats = action.payload;
      if (!Array.isArray(chats)) return;
      // Never wipe out existing chats if an empty array is received
      if (chats.length === 0 && state.chatOrder.length > 0) {
        state.loading = false;
        return;
      }
      state.chatsById = {};
      chats.forEach((chat) => {
        state.chatsById[chat.id] = chat;
      });
      state.chatOrder = sortByTimestamp(chats.map((c) => c.id), state.chatsById);

      // Rehydrate chatStatus from localStorage
      try {
        const saved = localStorage.getItem('wa_chat_status');
        if (saved) state.chatStatus = JSON.parse(saved);
      } catch {
        // ignore
      }

      state.loading = false;
      state.error   = null;
    },

    // ── Messages ──────────────────────────────────────────────────────────────

    /**
     * Add or update a single message (handles incoming events + sent messages).
     * - Deduplicates by id
     * - Updates the chat's lastMessage preview and timestamp
     * - Bumps unreadCount when not from me and chat is not the active one
     * - Re-sorts chatOrder by timestamp
     */
    upsertMessage(state, action) {
      const msg = action.payload;
      const { chatId } = msg;

      if (!state.messagesByChat[chatId]) {
        state.messagesByChat[chatId] = [];
      }

      const idx = state.messagesByChat[chatId].findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        // Update existing (e.g., ack change arrived via message_create)
        state.messagesByChat[chatId][idx] = { ...state.messagesByChat[chatId][idx], ...msg };
      } else {
        // Append new message (keep array oldest→newest)
        state.messagesByChat[chatId].push(msg);

        // Update chat preview
        if (state.chatsById[chatId]) {
          state.chatsById[chatId].lastMessage = { body: msg.body, fromMe: msg.fromMe };
          // timestamp from Message is in ms; Chat stores seconds
          state.chatsById[chatId].timestamp   = Math.floor(msg.timestamp / 1000);

          // Bump unread only when not from me and chat is not currently open
          if (!msg.fromMe && chatId !== state.activeChatId) {
            state.chatsById[chatId].unreadCount =
              (state.chatsById[chatId].unreadCount ?? 0) + 1;
          }
        } else {
          // Chat not in list yet (rare edge case) — add a skeleton entry
          state.chatsById[chatId] = {
            id: chatId, name: chatId, isGroup: false,
            unreadCount: msg.fromMe ? 0 : 1,
            timestamp: Math.floor(msg.timestamp / 1000),
            lastMessage: { body: msg.body, fromMe: msg.fromMe },
          };
          state.chatOrder.push(chatId);
        }

        // Re-sort
        state.chatOrder = sortByTimestamp(state.chatOrder, state.chatsById);
      }
    },

    /**
     * Replace the full message list for a chat (after wa:getMessages ack).
     */
    setMessages(state, action) {
      const { chatId, messages } = action.payload;
      state.messagesByChat[chatId] = messages;
    },

    // ── Active chat ───────────────────────────────────────────────────────────

    setActiveChat(state, action) {
      state.activeChatId = action.payload;
      // Clear unread badge when opening the chat
      if (action.payload && state.chatsById[action.payload]) {
        state.chatsById[action.payload].unreadCount = 0;
      }
    },

    // ── Ack ticks ─────────────────────────────────────────────────────────────

    setAck(state, action) {
      const { chatId, id, ack } = action.payload;
      const msgs = state.messagesByChat[chatId];
      if (msgs) {
        const msg = msgs.find((m) => m.id === id);
        if (msg) msg.ack = ack;
      }
    },

    // ── Chat status (Open / Resolved) ─────────────────────────────────────────

    setChatStatus(state, action) {
      const { chatId, status } = action.payload;
      state.chatStatus[chatId] = status;
      // Persist to localStorage
      try {
        localStorage.setItem('wa_chat_status', JSON.stringify(state.chatStatus));
      } catch {
        // ignore
      }
    },

    removeMessage(state, action) {
      const { chatId, id } = action.payload;
      if (state.messagesByChat[chatId]) {
        state.messagesByChat[chatId] = state.messagesByChat[chatId].filter((m) => m.id !== id);
      }
    },

    // ── Search / filter ───────────────────────────────────────────────────────

    setSearch(state, action) {
      state.search = action.payload;
    },

    setFilter(state, action) {
      state.filter = action.payload;
    },

    // ── Loading / error ───────────────────────────────────────────────────────

    setLoading(state, action) {
      state.loading = action.payload;
    },

    setMessagesLoading(state, action) {
      state.messagesLoading = action.payload;
    },

    setMessagesError(state, action) {
      state.messagesError = action.payload;
    },

    setError(state, action) {
      state.error = action.payload;
    },

    // ── Tasks (Convert to Task from message context menu) ─────────────────────

    /**
     * Add a task derived from a WhatsApp message.
     * payload: { text, chatId, chatName }
     */
    addTask(state, action) {
      const { text, chatId, chatName } = action.payload;
      state.tasks.push({
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        chatId,
        chatName: chatName || chatId,
        createdAt: new Date().toISOString(),
      });
    },

    /** Remove a task by its id */
    removeTask(state, action) {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setChats, upsertMessage, setMessages, removeMessage,
  setActiveChat, setAck, setChatStatus,
  setSearch, setFilter,
  setLoading, setMessagesLoading, setMessagesError, setError,
  addTask, removeTask,
} = whatsappSlice.actions;

export default whatsappSlice.reducer;
