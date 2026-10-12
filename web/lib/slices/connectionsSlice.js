import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async thunk ────────────────────────────────────────────────────────────

/**
 * Called on every page load to restore Gmail session from the httpOnly cookie.
 * On 401 (cookie missing / expired) it stays disconnected — no crash.
 */
export const fetchGmailProfile = createAsyncThunk(
  'connections/fetchGmailProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/gmail/profile');
      if (!res.ok) return rejectWithValue('not_connected');
      const data = await res.json();
      return data; // { email }
    } catch {
      return rejectWithValue('network_error');
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const connectionsSlice = createSlice({
  name: 'connections',
  initialState: {
    /**
     * wa.state: 'disconnected' | 'qr' | 'authenticating' | 'ready'
     * wa.qr   : base64 QR string (only when state === 'qr')
     * wa.me   : { number, name } (only when state === 'ready')
     * wa.error: human-readable error string | null
     */
    wa: { state: 'disconnected', qr: null, me: null, error: null },

    /** gmail.connected tracks whether we have a valid session cookie */
    gmail: { connected: false, email: null, loading: false },
  },
  reducers: {
    /**
     * Dispatched by socket.js when the server emits 'wa:status'.
     * Payload mirrors the server shape from spec §8.2.
     */
    setWaStatus(state, action) {
      const { state: waState, qr, me, error, reason } = action.payload;
      state.wa.state = waState;

      // Update qr only when explicitly provided; clear it when leaving qr state
      if (qr !== undefined) {
        state.wa.qr = qr;
      } else if (waState !== 'qr') {
        state.wa.qr = null;
      }

      // Update me (present only on 'ready')
      if (me !== undefined) state.wa.me = me;
      else if (waState !== 'ready') state.wa.me = null;

      // Error / disconnect reason
      state.wa.error = error || reason || null;
    },

    /**
     * Dispatched after OAuth callback or logout.
     */
    setGmail(state, action) {
      const { connected, email } = action.payload;
      state.gmail.connected = connected;
      state.gmail.email     = email ?? null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchGmailProfile.pending, (state) => {
        state.gmail.loading = true;
      })
      .addCase(fetchGmailProfile.fulfilled, (state, action) => {
        state.gmail.loading   = false;
        state.gmail.connected = true;
        state.gmail.email     = action.payload.email;
      })
      .addCase(fetchGmailProfile.rejected, (state) => {
        state.gmail.loading   = false;
        state.gmail.connected = false;
        state.gmail.email     = null;
      });
  },
});

export const { setWaStatus, setGmail } = connectionsSlice.actions;
export default connectionsSlice.reducer;
