import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async thunks ────────────────────────────────────────────────────────────

/**
 * Fetch the thread list from Gmail.
 * Pass { q, pageToken } for search / pagination.
 * When pageToken is provided the results are APPENDED (Load More).
 */
export const loadThreads = createAsyncThunk(
  'email/loadThreads',
  async ({ q = '', pageToken = '' } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (q)         params.set('q', q);
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`/api/gmail/threads?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { threads, nextPageToken }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Fetch a single full thread (full format — bodies included).
 */
export const loadThread = createAsyncThunk(
  'email/loadThread',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/gmail/threads/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json(); // { messages }
      return { id, messages: data.messages };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Send a new email or a reply.
 * payload: { to, subject, body, threadId?, inReplyTo?, references? }
 */
export const sendEmail = createAsyncThunk(
  'email/sendEmail',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/gmail/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { ok, id }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const emailSlice = createSlice({
  name: 'email',
  initialState: {
    /**
     * Thread list items (summary format):
     * { id, subject, from, snippet, date, unread, messageCount }
     */
    threads:       [],
    nextPageToken: null,

    /** The thread currently open in the right pane */
    activeThreadId: null,

    /**
     * Full thread content keyed by id:
     * { [id]: Message[] }
     * Message: { id, from, to, subject, date, bodyText, bodyHtml?, messageIdHeader, references }
     */
    threadDetail: {},

    /** Search query (passed as Gmail `q`) */
    query: '',

    loading: false,
    sending: false,
    error:   null,

    composeOpen: false,
    /** Message being replied to (for prefilling composer) */
    replyTo: null,
  },

  reducers: {
    setActiveThread(state, action) {
      state.activeThreadId = action.payload;
    },

    /**
     * Clear list when query changes so the next loadThreads replaces it.
     */
    setQuery(state, action) {
      state.query        = action.payload;
      state.threads      = [];
      state.nextPageToken = null;
    },

    setComposeOpen(state, action) {
      state.composeOpen = action.payload;
      if (!action.payload) state.replyTo = null;
    },

    setReplyTo(state, action) {
      state.replyTo = action.payload;
    },

    clearError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // ── loadThreads ──────────────────────────────────────────────────────
      .addCase(loadThreads.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loadThreads.fulfilled, (state, action) => {
        state.loading = false;
        const { threads = [], nextPageToken } = action.payload;

        // Append when using "Load more" (pageToken provided), otherwise replace
        if (action.meta.arg?.pageToken) {
          // Avoid duplicates by id
          const existing = new Set(state.threads.map((t) => t.id));
          state.threads = [
            ...state.threads,
            ...threads.filter((t) => !existing.has(t.id)),
          ];
        } else {
          state.threads = threads;
        }
        state.nextPageToken = nextPageToken ?? null;
      })
      .addCase(loadThreads.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ── loadThread ───────────────────────────────────────────────────────
      .addCase(loadThread.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loadThread.fulfilled, (state, action) => {
        state.loading = false;
        const { id, messages } = action.payload;
        state.threadDetail[id] = messages;
        state.activeThreadId   = id;
      })
      .addCase(loadThread.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ── sendEmail ────────────────────────────────────────────────────────
      .addCase(sendEmail.pending, (state) => {
        state.sending = true;
        state.error   = null;
      })
      .addCase(sendEmail.fulfilled, (state) => {
        state.sending     = false;
        state.composeOpen = false;
        state.replyTo     = null;
      })
      .addCase(sendEmail.rejected, (state, action) => {
        state.sending = false;
        state.error   = action.payload;
      });
  },
});

export const {
  setActiveThread, setQuery, setComposeOpen, setReplyTo, clearError,
} = emailSlice.actions;

export default emailSlice.reducer;
