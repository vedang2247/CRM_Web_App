import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Fetch task list with filters and pagination.
 */
export const loadTasks = createAsyncThunk(
  'tasks/loadTasks',
  async (filterParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().tasks;
      const merged = {
        ...state.filters,
        page: state.page,
        limit: state.limit,
        ...filterParams,
      };

      const params = new URLSearchParams();
      if (merged.status) params.set('status', merged.status);
      if (merged.clientId) params.set('clientId', String(merged.clientId));
      if (merged.assigneeId) params.set('assigneeId', String(merged.assigneeId));
      if (merged.q) params.set('q', merged.q);
      if (merged.page) params.set('page', String(merged.page));
      if (merged.limit) params.set('limit', String(merged.limit));

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { tasks, total, page, limit }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Fetch single full task detail.
 */
export const loadTask = createAsyncThunk(
  'tasks/loadTask',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { task }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Create a new task.
 */
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { task }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Update task fields.
 */
export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, ...changes }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return await res.json(); // { task }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Delete a task.
 */
export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
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

/**
 * Add a communication link (WhatsApp or Email) to a task.
 */
export const addTaskLink = createAsyncThunk(
  'tasks/addTaskLink',
  async ({ taskId, ...linkData }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { taskId, link: data.link };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Remove a communication link from a task.
 */
export const removeTaskLink = createAsyncThunk(
  'tasks/removeTaskLink',
  async ({ taskId, linkId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/links/${linkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      return { taskId, linkId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Send an email from inside a task.
 */
export const sendTaskEmail = createAsyncThunk(
  'tasks/sendTaskEmail',
  async ({ taskId, to, subject, bodyText, templateId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, bodyText, templateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return rejectWithValue(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { taskId, taskEmail: data.taskEmail, taskLink: data.taskLink };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    // List (dashboard)
    tasks: [],
    total: 0,
    page: 1,
    limit: 20,

    // Active task detail
    activeTaskId: null,
    taskDetail: {}, // { [id]: Task & { links, sentEmails, client, assignee, reviewer } }

    // Filters (controlled by TaskFilters component)
    filters: {
      status: '', // '' = all
      clientId: '',
      assigneeId: '',
      q: '',
    },

    // UI state
    loading: false,
    detailLoading: false,
    saving: false, // PATCH in-flight
    error: null,
    detailError: null,
  },

  reducers: {
    setFilters(state, action) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      state.page = 1; // Reset to page 1 on filter change
    },
    setActiveTask(state, action) {
      state.activeTaskId = action.payload;
    },
    clearDetailError(state) {
      state.detailError = null;
    },
    clearError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // ── loadTasks ───────────────────────────────────────────────────────
      .addCase(loadTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks || [];
        state.total = action.payload.total ?? 0;
        state.page = action.payload.page ?? 1;
        state.limit = action.payload.limit ?? 20;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── loadTask ────────────────────────────────────────────────────────
      .addCase(loadTask.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(loadTask.fulfilled, (state, action) => {
        state.detailLoading = false;
        const task = action.payload.task;
        if (task) {
          state.taskDetail[task.id] = task;
          state.activeTaskId = task.id;
        }
      })
      .addCase(loadTask.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload;
      })

      // ── createTask ──────────────────────────────────────────────────────
      .addCase(createTask.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.saving = false;
        const newTask = action.payload.task;
        if (newTask) {
          state.tasks.unshift(newTask);
          state.total += 1;
          state.taskDetail[newTask.id] = newTask;
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // ── updateTask ──────────────────────────────────────────────────────
      .addCase(updateTask.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.saving = false;
        const updated = action.payload.task;
        if (updated) {
          // Update in task list
          const idx = state.tasks.findIndex((t) => t.id === updated.id);
          if (idx !== -1) {
            state.tasks[idx] = { ...state.tasks[idx], ...updated };
          }
          // Update in detail cache
          state.taskDetail[updated.id] = updated;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // ── deleteTask ──────────────────────────────────────────────────────
      .addCase(deleteTask.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.saving = false;
        const deletedId = action.payload;
        state.tasks = state.tasks.filter((t) => t.id !== deletedId);
        state.total = Math.max(0, state.total - 1);
        delete state.taskDetail[deletedId];
        if (state.activeTaskId === deletedId) {
          state.activeTaskId = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // ── addTaskLink ─────────────────────────────────────────────────────
      .addCase(addTaskLink.fulfilled, (state, action) => {
        const { taskId, link } = action.payload;
        if (state.taskDetail[taskId]) {
          if (!state.taskDetail[taskId].links) state.taskDetail[taskId].links = [];
          state.taskDetail[taskId].links.unshift(link);
        }
      })

      // ── removeTaskLink ──────────────────────────────────────────────────
      .addCase(removeTaskLink.fulfilled, (state, action) => {
        const { taskId, linkId } = action.payload;
        if (state.taskDetail[taskId] && state.taskDetail[taskId].links) {
          state.taskDetail[taskId].links = state.taskDetail[taskId].links.filter(
            (l) => l.id !== linkId
          );
        }
      })

      // ── sendTaskEmail ───────────────────────────────────────────────────
      .addCase(sendTaskEmail.fulfilled, (state, action) => {
        const { taskId, taskEmail, taskLink } = action.payload;
        if (state.taskDetail[taskId]) {
          if (!state.taskDetail[taskId].sentEmails) state.taskDetail[taskId].sentEmails = [];
          if (!state.taskDetail[taskId].links) state.taskDetail[taskId].links = [];
          state.taskDetail[taskId].sentEmails.unshift(taskEmail);
          state.taskDetail[taskId].links.unshift(taskLink);
        }
      });
  },
});

export const { setFilters, setActiveTask, clearDetailError, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
