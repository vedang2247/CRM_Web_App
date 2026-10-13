import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const loadTemplates = createAsyncThunk(
  'templates/loadTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.templates || [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.template;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateTemplate = createAsyncThunk(
  'templates/updateTemplate',
  async ({ id, ...changes }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.template;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const templatesSlice = createSlice({
  name: 'templates',
  initialState: {
    templates: [],
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // loadTemplates
      .addCase(loadTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTemplates.fulfilled, (state, action) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(loadTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createTemplate
      .addCase(createTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload) {
          state.templates.unshift(action.payload);
        }
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // updateTemplate
      .addCase(updateTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload;
        if (updated) {
          const idx = state.templates.findIndex((t) => t.id === updated.id);
          if (idx !== -1) {
            state.templates[idx] = updated;
          }
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // deleteTemplate
      .addCase(deleteTemplate.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.saving = false;
        state.templates = state.templates.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = templatesSlice.actions;
export default templatesSlice.reducer;
