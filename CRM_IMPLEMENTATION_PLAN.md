# CRM Implementation Plan — Unified Inbox → CRM

> **Author:** AI Senior Engineer  
> **Target codebase:** `d:/Web Dev/Projects/CRM_Web_App`  
> **Date:** 2026-10-13  
> **Status:** Plan only — no implementation code written yet.

---

## Table of Contents

1. [Spec Review & Adjustments](#1-spec-review--adjustments)
2. [Prisma Schema](#2-prisma-schema)
3. [API Contract Table](#3-api-contract-table)
4. [Redux State Shape — New Slices](#4-redux-state-shape--new-slices)
5. [Milestones](#5-milestones)
   - [M0 – Foundation & DB Setup](#milestone-m0--foundation--db-setup)
   - [M1 – Task CRUD Core](#milestone-m1--task-crud-core)
   - [M2 – Task Dashboard UI](#milestone-m2--task-dashboard-ui)
   - [M3 – Task Detail Page](#milestone-m3--task-detail-page)
   - [M4 – WhatsApp → Task Flow](#milestone-m4--whatsapp--task-flow)
   - [M5 – Email ↔ Task Flow](#milestone-m5--email--task-flow)
   - [M6 – Email Client from Task (Templates)](#milestone-m6--email-client-from-task-templates)
   - [M7 – Templates Management](#milestone-m7--templates-management)
   - [M8 – Chat Status DB Migration](#milestone-m8--chat-status-db-migration)
   - [M9 – Polish, Badges & Responsive](#milestone-m9--polish-badges--responsive)
6. [Files-to-Steps Summary Map](#6-files-to-steps-summary-map)
7. [End-to-End Smoke-Test Checklist](#7-end-to-end-smoke-test-checklist)
8. [Build Order & Demo Points](#8-build-order--demo-points)
9. [Multi-User Auth — Future Path](#9-multi-user-auth--future-path)

---

## 1. Spec Review & Adjustments

| # | Area | Risk / Clarification | Decision / Assumption |
|---|------|---------------------|-----------------------|
| 1 | **Existing `addTask` / `removeTask` in `whatsappSlice`** | These actions store tasks in-memory only. The new DB-backed flow conflicts with them. | **Keep** both actions alive during M4 transition; after M4 the context-menu calls the new `createTask` thunk instead. Remove the old in-memory `tasks` array from `whatsappSlice` in M4 cleanup step. `TaskDrawer` is retired; replaced by a link to `/tasks`. |
| 2 | **`TaskDrawer` retirement** | `TaskDrawer` currently pulls from `whatsapp.tasks` (in-memory). After M4 it becomes orphaned. | Retire `TaskDrawer` in M4. Replace the bell icon in the WA page header with a "Tasks" badge-link to `/tasks`. |
| 3 | **Phone number normalisation** | WhatsApp `chatId` format is `919812345678@c.us`. Stripping `@c.us` leaves the full E.164 number with country code. Client.phone should be stored the same way. | Store `Client.phone` as E.164 without `+` (e.g., `919812345678`). Normalise by stripping `@c.us`, spaces, and leading `+`. Match via `ILIKE` or exact equality after normalisation. |
| 4 | **Email sender matching** | Gmail `from` header is `"Name <email@domain.com>"`. Need to extract just the email. | Reuse existing `formatSender()` in `ThreadView.js` (extracted to a shared util `web/lib/normalise.js`). |
| 5 | **Task code format** | `TSK0001` from auto-increment int. Postgres SERIAL starts at 1. | Use Prisma `autoincrement()`. Format in a JS helper: `"TSK" + String(id).padStart(4, "0")`. If task count exceeds 9999 it becomes `TSK10000` (5 digits) — acceptable. |
| 6 | **`[TSK0042]` subject matching** | Spec says put task code in outgoing email subject so later replies can be auto-matched. Auto-matching (reply → task) is listed as out-of-scope for now. | Include `[TSK0042]` in subject as specified. Auto-match is **not** implemented. Note it in code comments for future. |
| 7 | **Iron-session cookie** | Gmail OAuth tokens live in iron-session. Prisma API routes need to read the session too (for send-from-task). | Use the same `getIronSession` import already in `web/lib/google.js`. No change to auth flow. |
| 8 | **Neon vs local Postgres** | Spec says "Neon/Supabase or local". | Plan targets **Neon** (connection pooling URL in `DATABASE_URL`). Developer can swap to local by changing the env var. |
| 9 | **`prisma/` location** | Prisma config should be inside `web/` since Next.js API routes are the only DB consumer. | Place `web/prisma/schema.prisma`. Run `prisma generate` from `web/`. |
| 10 | **`next.config.mjs` — no changes needed for Prisma** | Prisma client works in Node.js API routes with `export const runtime = "nodejs"`. | All new API routes get `export const runtime = "nodejs"` at the top. No `next.config` change needed. |
| 11 | **`whatsappSlice.chatStatus` localStorage migration** | Existing code reads localStorage on `setChats`. After DB migration, this must stop. | Migration plan in M8: one-time migration endpoint reads existing `wa_chat_status` from the request body, writes to DB, then a flag in localStorage (`wa_status_migrated=1`) prevents re-migration. |
| 12 | **Clients table — no UI for creation in spec** | Modal says "let the user pick or create a client". | Include a lightweight inline "Create Client" form within the Convert-to-Task and Link-to-Task modals. No dedicated `/clients` page needed this phase. |
| 13 | **Assignee dropdown** | Spec says seed TeamMembers. Reviewer dropdown mentioned. | Add `assigneeId` and `reviewerId` both as nullable FKs on Task. |
| 14 | **`web/lib/db.js` Prisma singleton** | Must prevent multiple PrismaClient instances in Next.js dev HMR. | Standard Next.js Prisma singleton pattern using `globalThis.__prisma`. |

---

## 2. Prisma Schema

**File:** `web/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── TeamMember ─────────────────────────────────────────────────────────────────
model TeamMember {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  avatarUrl String?  @db.VarChar(500)
  createdAt DateTime @default(now())

  assignedTasks  Task[] @relation("Assignee")
  reviewingTasks Task[] @relation("Reviewer")
}

// ── Client ────────────────────────────────────────────────────────────────────
model Client {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(150)
  phone     String?  @unique @db.VarChar(20)   // E.164 without '+', e.g. 919812345678
  email     String?  @unique @db.VarChar(255)
  company   String?  @db.VarChar(150)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks Task[]
}

// ── Task ──────────────────────────────────────────────────────────────────────
model Task {
  id          Int      @id @default(autoincrement())
  // Display code: formatted as TSK0001 in application layer
  title       String   @db.VarChar(300)
  description String?  @db.Text
  status      String   @default("open")   // open | in_progress | waiting | resolved | closed
  priority    String   @default("medium") // low | medium | high | urgent
  dueDate     DateTime?

  clientId    Int?
  client      Client?    @relation(fields: [clientId], references: [id], onDelete: SetNull)

  assigneeId  Int?
  assignee    TeamMember? @relation("Assignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  reviewerId  Int?
  reviewer    TeamMember? @relation("Reviewer", fields: [reviewerId], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  links       TaskLink[]
  sentEmails  TaskEmail[]

  @@index([status])
  @@index([clientId])
}

// ── TaskLink ──────────────────────────────────────────────────────────────────
model TaskLink {
  id        Int      @id @default(autoincrement())
  taskId    Int
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  type      String   // "whatsapp" | "email"

  // WhatsApp-specific (snapshot required — history not reliably refetchable)
  chatId    String?  @db.VarChar(50)   // e.g. 919812345678@c.us
  messageId String?  @db.VarChar(100)
  snapshot  String?  @db.Text          // message body at time of linking

  // Email-specific (threadId only; Gmail is source of truth)
  threadId  String?  @db.VarChar(100)
  subject   String?  @db.VarChar(500)
  sender    String?  @db.VarChar(255)  // extracted email address

  note      String?  @db.Text
  createdAt DateTime @default(now())

  @@index([taskId])
  @@index([chatId, messageId])
  @@index([threadId])
}

// ── EmailTemplate ─────────────────────────────────────────────────────────────
model EmailTemplate {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(150)     // e.g. "Request Documents"
  subject   String   @db.VarChar(500)     // may contain {{task.code}}
  body      String   @db.Text             // HTML or plain with {{placeholders}}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ── TaskEmail ─────────────────────────────────────────────────────────────────
// Records every email sent from inside a task (via /api/tasks/[id]/email)
model TaskEmail {
  id         Int      @id @default(autoincrement())
  taskId     Int
  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  to         String   @db.VarChar(255)
  subject    String   @db.VarChar(500)
  bodyText   String   @db.Text
  gmailMsgId String?  @db.VarChar(200)   // returned by /api/gmail/send
  threadId   String?  @db.VarChar(100)   // Gmail threadId of the sent message
  sentAt     DateTime @default(now())
}

// ── ChatStatus ────────────────────────────────────────────────────────────────
// Replaces localStorage wa_chat_status (migrated in M8)
model ChatStatus {
  chatId    String   @id @db.VarChar(50)  // e.g. 919812345678@c.us
  status    String   @default("open")     // "open" | "resolved"
  updatedAt DateTime @updatedAt
}
```

### Key design notes

- `Task.status` values: `open`, `in_progress`, `waiting`, `resolved`, `closed`.
- `Task.priority` values: `low`, `medium`, `high`, `urgent`.
- `TaskLink.snapshot` is **required** for WhatsApp links; `null` for email links.
- `TaskEmail` auto-creates a corresponding `TaskLink` of type `email` on the API side after sending.
- `ChatStatus` replaces `whatsapp.chatStatus` Redux + localStorage fully after M8.

---

## 3. API Contract Table

All routes live in `web/app/api/`. All routes export `export const runtime = "nodejs"`.

### Clients

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `GET` | `/api/clients` | `?q=` (optional search) | `{ clients: Client[] }` | 200, 500 |
| `POST` | `/api/clients` | `{ name, phone?, email?, company? }` | `{ client: Client }` | 201, 400, 409, 500 |
| `GET` | `/api/clients/match` | `?phone=` or `?email=` | `{ client: Client \| null }` | 200, 500 |

### Tasks

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `GET` | `/api/tasks` | `?status=&clientId=&assigneeId=&q=&page=&limit=` | `{ tasks: Task[], total, page, limit }` | 200, 500 |
| `POST` | `/api/tasks` | `{ title, description?, status?, priority?, dueDate?, clientId?, assigneeId?, reviewerId? }` | `{ task: Task }` | 201, 400, 500 |
| `GET` | `/api/tasks/[id]` | — | `{ task: Task & { links, sentEmails, client, assignee } }` | 200, 404, 500 |
| `PATCH` | `/api/tasks/[id]` | Partial `{ title?, description?, status?, priority?, dueDate?, clientId?, assigneeId?, reviewerId? }` | `{ task: Task }` | 200, 400, 404, 500 |
| `DELETE` | `/api/tasks/[id]` | — | `{ ok: true }` | 200, 404, 500 |

### Task Links

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `POST` | `/api/tasks/[id]/links` | `{ type: "whatsapp", chatId, messageId, snapshot, note? }` OR `{ type: "email", threadId, subject, sender, note? }` | `{ link: TaskLink }` | 201, 400, 404, 500 |
| `DELETE` | `/api/tasks/[id]/links/[linkId]` | — | `{ ok: true }` | 200, 404, 500 |

### Task Email (send from task)

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `POST` | `/api/tasks/[id]/email` | `{ to, subject, bodyText, templateId? }` | `{ ok: true, taskEmail: TaskEmail, taskLink: TaskLink }` | 201, 400, 404, 500 |

**Side effects:** Calls `/api/gmail/send` internally; prepends `[TSKxxxx]` to subject; saves `TaskEmail`; auto-creates `TaskLink(type=email)`.

### Templates

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `GET` | `/api/templates` | — | `{ templates: EmailTemplate[] }` | 200, 500 |
| `POST` | `/api/templates` | `{ name, subject, body }` | `{ template: EmailTemplate }` | 201, 400, 500 |
| `PATCH` | `/api/templates/[id]` | `{ name?, subject?, body? }` | `{ template: EmailTemplate }` | 200, 400, 404, 500 |
| `DELETE` | `/api/templates/[id]` | — | `{ ok: true }` | 200, 404, 500 |

### Team Members

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `GET` | `/api/team` | — | `{ members: TeamMember[] }` | 200, 500 |

### Chat Status (DB-backed, replaces localStorage after M8)

| Method | Path | Request Body | Response | Status Codes |
|--------|------|-------------|----------|-------------|
| `GET` | `/api/chats/status` | `?chatIds=id1,id2,...` | `{ statuses: { [chatId]: "open"\|"resolved" } }` | 200, 500 |
| `PATCH` | `/api/chats/status` | `{ chatId, status }` | `{ ok: true }` | 200, 400, 500 |
| `POST` | `/api/chats/status/migrate` | `{ statuses: { [chatId]: string } }` | `{ ok: true, count: number }` | 200, 400, 500 |

### Validation rules (all routes)

- `title` / `name`: 1–300 chars, trimmed, not blank.
- `email`: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- `phone`: digits only after normalisation, 7–15 chars.
- `status` (task): must be one of `open | in_progress | waiting | resolved | closed`.
- `priority`: must be one of `low | medium | high | urgent`.
- `type` (TaskLink): must be `whatsapp | email`.
- For `whatsapp` links: `chatId`, `messageId`, `snapshot` are all **required**.
- For `email` links: `threadId`, `subject`, `sender` are all **required**.
- Missing required fields → 400 `{ error: "field X is required" }`.
- Never log token values or message bodies; use `[REDACTED]` placeholder in error logs.

---

## 4. Redux State Shape — New Slices

### `tasksSlice` (`web/lib/slices/tasksSlice.js`)

Follows the same pattern as `emailSlice`: `createAsyncThunk` + `extraReducers`.

```js
// Initial state
{
  // List (dashboard)
  tasks: [],              // Task[] — summary list from GET /api/tasks
  total: 0,
  page: 1,
  limit: 20,

  // Active task detail
  activeTaskId: null,
  taskDetail: {},         // { [id]: Task & { links, sentEmails, client, assignee } }

  // Filters (controlled by TaskFilters component)
  filters: {
    status: '',           // '' = all
    clientId: '',
    assigneeId: '',
    q: '',
  },

  // UI state
  loading: false,
  detailLoading: false,
  saving: false,          // PATCH in-flight
  error: null,
  detailError: null,
}
```

**Thunks:**

| Thunk | Action creator | API call |
|-------|----------------|----------|
| `loadTasks` | `tasksSlice/loadTasks` | `GET /api/tasks` (with filters) |
| `loadTask` | `tasksSlice/loadTask` | `GET /api/tasks/[id]` |
| `createTask` | `tasksSlice/createTask` | `POST /api/tasks` |
| `updateTask` | `tasksSlice/updateTask` | `PATCH /api/tasks/[id]` |
| `deleteTask` | `tasksSlice/deleteTask` | `DELETE /api/tasks/[id]` |
| `addTaskLink` | `tasksSlice/addTaskLink` | `POST /api/tasks/[id]/links` |
| `removeTaskLink` | `tasksSlice/removeTaskLink` | `DELETE /api/tasks/[id]/links/[linkId]` |
| `sendTaskEmail` | `tasksSlice/sendTaskEmail` | `POST /api/tasks/[id]/email` |

**Reducers:**

```js
setFilters(state, action)    // merge partial filter object
setActiveTask(state, action) // set activeTaskId
clearDetailError(state)
```

---

### `templatesSlice` (`web/lib/slices/templatesSlice.js`)

```js
// Initial state
{
  templates: [],   // EmailTemplate[]
  loading: false,
  saving: false,
  error: null,
}
```

**Thunks:**

| Thunk | API call |
|-------|----------|
| `loadTemplates` | `GET /api/templates` |
| `createTemplate` | `POST /api/templates` |
| `updateTemplate` | `PATCH /api/templates/[id]` |
| `deleteTemplate` | `DELETE /api/templates/[id]` |

---

### Updated `store.js`

```js
// Add to configureStore reducer map:
tasks:     tasksReducer,
templates: templatesReducer,
```

---

## 5. Milestones

---

### Milestone M0 — Foundation & DB Setup

> **Goal:** Prisma connected, DB migrated, seed data loaded, Prisma client singleton in place, new env vars documented. Independently demoable via `npx prisma studio`.

---

#### Step 1: Install dependencies

**Files:** `web/package.json`

**What:** Add `@prisma/client`, `prisma` (devDependency).

```
npm install @prisma/client
npm install -D prisma
```

**Verify:** `node -e "require('@prisma/client')"` exits without error.

---

#### Step 2: Write Prisma schema

**Files:** `web/prisma/schema.prisma`

**What:** Full schema as defined in §2 above. All models, fields, relations, indexes, cascade rules.

**Verify:** `npx prisma validate` (from `web/`) exits with no errors.

---

#### Step 3: Add env vars

**Files:** `web/.env.local`, `web/.env.local.example`

**What:**
```
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
```
`DATABASE_URL` added to `.env.local.example` with placeholder. `.env.local` holds real value (already in `.gitignore`).

**Verify:** `echo $env:DATABASE_URL` (PowerShell) prints connection string.

---

#### Step 4: Run initial migration

**Files:** `web/prisma/migrations/` (generated)

**What:** `npx prisma migrate dev --name init` (from `web/`). Creates all tables.

**Verify:** `npx prisma migrate status` shows all migrations applied.

---

#### Step 5: Prisma client singleton

**Files:** `web/lib/db.js` (new)

**What:**
```js
// web/lib/db.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
export const db = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = db;
```

**Verify:** Import `db` in a test API route; `GET /api/test-db` returns `{ ok: true }`.

---

#### Step 6: Seed script

**Files:** `web/prisma/seed.js` (new), `web/package.json` (add `prisma.seed` field)

**What:** `seed.js` inserts:

- **TeamMembers (3):**
  ```
  { name: "Vedang Sharma", email: "vedang@crm.internal" }
  { name: "Priya Mehta",   email: "priya@crm.internal"  }
  { name: "Ravi Kumar",    email: "ravi@crm.internal"   }
  ```
- **Clients (4):**
  ```
  { name: "Ananya Iyer",   phone: "919876543210", email: "ananya@client.com"  }
  { name: "Suresh Gupta",  phone: "919123456789", email: "suresh@biz.in"      }
  { name: "TechCorp Ltd",  phone: null,           email: "contact@techcorp.io"}
  { name: "Nisha Reddy",   phone: "917890123456", email: "nisha@example.com"  }
  ```
- **EmailTemplates (4):**
  ```
  { name: "Request Documents",
    subject: "[{{task.code}}] Documents Required — {{task.title}}",
    body: "Dear {{client.name}},\n\nWe need the following documents for {{task.title}}..." }
  { name: "Clarification Needed",
    subject: "[{{task.code}}] Clarification Required",
    body: "Dear {{client.name}},\n\nWe need clarification regarding {{task.title}}..." }
  { name: "Status Update",
    subject: "[{{task.code}}] Status Update — {{task.title}}",
    body: "Dear {{client.name}},\n\nHere is an update on {{task.title}} (due {{task.dueDate}})..." }
  { name: "Follow Up",
    subject: "[{{task.code}}] Following Up on {{task.title}}",
    body: "Dear {{client.name}},\n\nJust following up on {{task.title}}..." }
  ```

`package.json` `prisma.seed` field:
```json
"prisma": { "seed": "node prisma/seed.js" }
```

**Verify:** `npx prisma db seed` exits with `Seed complete`. `npx prisma studio` shows populated tables.

---

#### Step 7: Shared utility — phone normaliser & email parser

**Files:** `web/lib/normalise.js` (new)

**What:**
```js
// web/lib/normalise.js

/** Strip @c.us / @g.us, +, spaces → raw digit string */
export function normalisePhone(raw = '') {
  return raw.replace(/@(c|g)\.us$/, '').replace(/[\s+\-()]/g, '');
}

/** Extract email address from "Name <email@x.com>" or bare email */
export function extractEmail(from = '') {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

/** Format task code from numeric id */
export function taskCode(id) {
  return 'TSK' + String(id).padStart(4, '0');
}

/** Replace template placeholders with task/client data */
export function renderTemplate(body, { client, task }) {
  return body
    .replace(/\{\{client\.name\}\}/g, client?.name ?? '')
    .replace(/\{\{task\.code\}\}/g, taskCode(task.id))
    .replace(/\{\{task\.title\}\}/g, task.title)
    .replace(/\{\{task\.dueDate\}\}/g,
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD');
}
```

**Verify:** Unit-check in Node REPL: `normalisePhone('919812345678@c.us')` → `'919812345678'`.

---

### Milestone M1 — Task CRUD Core (API Layer)

> **Goal:** All task API routes working. Testable with curl/Postman. No UI yet.

---

#### Step 8: Team Members API

**Files:** `web/app/api/team/route.js` (new)

**What:**
- `GET /api/team` — return all TeamMembers ordered by name.
- `export const runtime = "nodejs"`.
- Uses `db.teamMember.findMany({ orderBy: { name: 'asc' } })`.
- Returns `{ members }`.

**Verify:** `curl http://localhost:3000/api/team` returns 3 seeded members.

---

#### Step 9: Clients API

**Files:**
- `web/app/api/clients/route.js` (new)
- `web/app/api/clients/match/route.js` (new)

**What:**

`route.js`:
- `GET` — accept `?q=` search against name/phone/email (case-insensitive `contains`). Return `{ clients }`.
- `POST` — validate name (required), email regex if provided, phone normalisation; check uniqueness on phone/email; return 409 if conflict; return `{ client }` 201.

`match/route.js`:
- `GET ?phone=X` or `GET ?email=X` — normalise phone, lowercase email; `db.client.findFirst` with OR condition. Return `{ client: Client | null }`.

**Verify:**
- `POST /api/clients` with `{ name: "Test", phone: "919999999999" }` → 201.
- `GET /api/clients/match?phone=919999999999` → `{ client: { name: "Test" } }`.
- `POST /api/clients` again with same phone → 409.

---

#### Step 10: Tasks list & create API

**Files:** `web/app/api/tasks/route.js` (new)

**What:**

`GET /api/tasks`:
- Accept query params: `status`, `clientId`, `assigneeId`, `q` (title search), `page` (default 1), `limit` (default 20, max 100).
- Build Prisma `where` dynamically.
- `q` → `{ title: { contains: q, mode: 'insensitive' } }`.
- Include `client`, `assignee`, `reviewer` (select id + name only).
- Return `{ tasks, total, page, limit }`.

`POST /api/tasks`:
- Validate: `title` required and ≤300 chars; `status`/`priority` enum check; `dueDate` ISO parse.
- Return `{ task }` 201.

**Verify:** `POST /api/tasks` with `{ title: "Test task" }` → 201 with `id: 1`. `GET /api/tasks` → `{ tasks: [{ id: 1, title: "Test task", ... }] }`.

---

#### Step 11: Task detail, update & delete API

**Files:**
- `web/app/api/tasks/[id]/route.js` (new)

**What:**

`GET`: Include `links`, `sentEmails`, `client`, `assignee`, `reviewer`. Return 404 if not found.

`PATCH`: Accept partial update. Validate individual fields. Re-validate `status`/`priority` enums if provided. Return updated task.

`DELETE`: Cascade handled by Prisma (`onDelete: Cascade` on links and sentEmails). Return `{ ok: true }`.

**Verify:** `PATCH /api/tasks/1` `{ status: "in_progress" }` → 200. `GET /api/tasks/1` shows updated status. `DELETE /api/tasks/1` → 200; subsequent GET → 404.

---

#### Step 12: Task Links API

**Files:** `web/app/api/tasks/[id]/links/route.js` (new), `web/app/api/tasks/[id]/links/[linkId]/route.js` (new)

**What:**

`POST /api/tasks/[id]/links`:
- Validate `type` ∈ `['whatsapp', 'email']`.
- WhatsApp: require `chatId`, `messageId`, `snapshot` (reject if blank).
- Email: require `threadId`, `subject`, `sender` (validate email format of sender).
- `note` optional, max 1000 chars.
- Return `{ link }` 201.

`DELETE /api/tasks/[id]/links/[linkId]`: Verify link belongs to task (join check). Return `{ ok: true }`.

**Verify:** Link a WhatsApp message to task 1; GET `/api/tasks/1` shows `links` array with 1 item.

---

#### Step 13: Task Email send API

**Files:** `web/app/api/tasks/[id]/email/route.js` (new)

**What:**

`POST /api/tasks/[id]/email`:
1. Validate `to` (email regex), `subject` (≤500 chars), `bodyText` (≤50000 chars).
2. Load task by id (404 if missing).
3. Prepend `[TSKxxxx]` to subject if not already present.
4. Call `sendGmail({ to, subject, bodyText })` — reuse `web/lib/google.js` `getGmailClient()` + `gmail.users.messages.send`. **Must read iron-session cookie to get tokens.**
5. Save `TaskEmail` record.
6. Auto-create `TaskLink` of type `email`: `{ threadId, subject, sender: to, note: null }`.
7. Return `{ ok: true, taskEmail, taskLink }` 201.

**No token or body values in server logs.**

**Verify:** `POST /api/tasks/1/email` with valid `to`/`subject`/`bodyText` → 201; email lands in Gmail; task GET shows 1 `sentEmail` and 1 `link`.

---

#### Step 14: Templates API

**Files:** `web/app/api/templates/route.js` (new), `web/app/api/templates/[id]/route.js` (new)

**What:**

`GET /api/templates`: Return all templates ordered by name.  
`POST /api/templates`: Validate `name` (1–150 chars), `subject` (1–500 chars), `body` (1–50000 chars).  
`PATCH /api/templates/[id]`: Partial update, same validation per present field.  
`DELETE /api/templates/[id]`: Return `{ ok: true }`.

**Verify:** All 4 seeded templates visible. Create, update, delete via curl.

---

### Milestone M2 — Task Dashboard UI

> **Goal:** `/tasks` page is fully browsable with filters. Independently demoable.

---

#### Step 15: Redux slices for tasks & templates

**Files:**
- `web/lib/slices/tasksSlice.js` (new)
- `web/lib/slices/templatesSlice.js` (new)
- `web/lib/store.js` (modified)

**What:**

`tasksSlice.js`:
- `initialState` as specified in §4.
- All thunks (`loadTasks`, `loadTask`, `createTask`, `updateTask`, `deleteTask`, `addTaskLink`, `removeTaskLink`, `sendTaskEmail`) using `createAsyncThunk`.
- `extraReducers` for all pending/fulfilled/rejected cases.
- Pattern: match `emailSlice.js` exactly (pending → loading true, fulfilled → set data, rejected → set error).
- `setFilters(state, action)` merges partial filter.
- `setActiveTask(state, action)`.
- `clearDetailError(state)`.

`templatesSlice.js`:
- All template thunks following same pattern.

`store.js` modification:
- Import and add `tasksReducer`, `templatesReducer` to the `reducer` map.

**Verify:** Open Redux DevTools → see `tasks` and `templates` keys in state tree.

---

#### Step 16: Task Dashboard page & layout

**Files:**
- `web/app/tasks/page.js` (new)
- `web/app/tasks/layout.js` (new, optional — for page metadata)

**What:**

`page.js`:
- `'use client'`
- On mount: `dispatch(loadTasks(filters))`, `dispatch(loadTemplates())`.
- Layout: left sidebar (TaskFilters) + right main (TaskTable/TaskCards).
- `layout.js` metadata: `{ title: "Tasks — CRM" }`.

**Verify:** `http://localhost:3000/tasks` loads without error, shows loading spinner.

---

#### Step 17: TaskFilters component

**Files:** `web/components/tasks/TaskFilters.js` (new)

**What:**
- Props: none (reads/writes `tasks.filters` from Redux).
- UI: search input, status dropdown, assignee dropdown, client search input.
- On change: `dispatch(setFilters({ ... }))` then `dispatch(loadTasks())` debounced 300ms.
- Status options: All, Open, In Progress, Waiting, Resolved, Closed.
- Assignee options: fetched from `GET /api/team` (loaded once on mount).
- Tailwind classes reuse `wa-accent` and `em-accent` color tokens.

**Verify:** Typing in search box filters task list within 300ms.

---

#### Step 18: TaskCard component

**Files:** `web/components/tasks/TaskCard.js` (new)

**What:**
- Props: `task` (summary shape from list API).
- Shows: task code (`TSK0001`), title, status pill, priority badge, assignee avatar, client name, due date (red if overdue).
- Status pill reuses `StatusPill` component with extended color mapping:
  - `open` → grey, `in_progress` → blue, `waiting` → amber, `resolved` → green, `closed` → slate.
- Priority badge: `urgent` → red, `high` → orange, `medium` → yellow, `low` → grey.
- Click → `router.push('/tasks/' + task.id)`.
- Task code in top-left, monospace, muted color.

**Verify:** TaskCard renders correctly with sample data; click navigates to detail page.

---

#### Step 19: Pagination in task list

**Files:** `web/components/tasks/TaskPagination.js` (new), `web/app/tasks/page.js` (modified)

**What:**
- Simple prev/next pagination using `total`, `page`, `limit` from Redux.
- `dispatch(loadTasks({ ...filters, page: newPage }))` on button click.

**Verify:** With 25+ tasks, pagination controls appear and load correct pages.

---

#### Step 20: TopNav update — Tasks tab

**Files:** `web/components/TopNav.js` (modified)

**What:**
- Add `{ label: 'Tasks', href: '/tasks', id: 'nav-tasks' }` to the `TABS` array.
- No other changes.

**Verify:** "Tasks" tab appears in nav and is highlighted when on `/tasks`.

---

### Milestone M3 — Task Detail Page

> **Goal:** `/tasks/[id]` fully functional with status/priority editing and communication timeline. Independently demoable.

---

#### Step 21: Task Detail page

**Files:** `web/app/tasks/[id]/page.js` (new)

**What:**
- `'use client'`
- On mount: `dispatch(loadTask(id))`.
- Layout: 2-column on desktop — left: TaskInfo panel; right: LinkedCommsTimeline.
- Breadcrumb: `Tasks / TSK0001`.

**Verify:** Navigate to `/tasks/1`; task data loads correctly.

---

#### Step 22: TaskInfo panel

**Files:** `web/components/tasks/TaskInfo.js` (new)

**What:**
- Displays: title (editable inline on click), description (textarea on click), status dropdown, priority dropdown, due date picker (plain `<input type="date">`), assignee dropdown, reviewer dropdown, client name with link.
- On any field change: debounced `dispatch(updateTask({ id, ...changes }))` after 800ms idle, or immediate on blur.
- Status / priority dropdowns call `updateTask` immediately on change.
- "Email Client" button → opens `TaskEmailModal` (M6).
- Shows `saving` spinner from Redux state during PATCH.

**Verify:** Change status to "in_progress"; Redux state updates; API call fires; status persists on refresh.

---

#### Step 23: LinkedCommsTimeline component

**Files:** `web/components/tasks/LinkedCommsTimeline.js` (new)

**What:**
- Accepts `links: TaskLink[]` and `sentEmails: TaskEmail[]` from task detail.
- Renders chronological timeline (sorted by `createdAt`).
- Each entry shows:
  - **WhatsApp link:** green WA icon, snapshot text (truncated 200 chars), note (if any), chatId (formatted), "Remove" button.
  - **Email link:** blue mail icon, subject, sender, note (if any), link to `/email` (filtered to threadId), "Remove" button.
  - **Sent email:** purple send icon, subject, to, sentAt, "View Thread" link.
- "Remove" → `dispatch(removeTaskLink({ taskId, linkId }))`.
- Empty state: "No linked communications yet."

**Verify:** After linking a WA message (M4), it appears here with snapshot.

---

### Milestone M4 — WhatsApp → Task Flow

> **Goal:** Right-click on a message bubble → "Convert to Task" opens a proper DB-backed modal. WhatsApp chats show task badges.

---

#### Step 24: `ConvertToTaskModal` component

**Files:** `web/components/tasks/ConvertToTaskModal.js` (new)

**What:**
- Props: `message` (WA Message shape), `onClose()`.
- State: `title`, `description` (prefilled with `message.body`), `clientId`, `clientQuery`, `clientResults`, `newClientName`, `newClientPhone`, `status`, `priority`, `dueDate`.
- On open:
  1. Extract phone from `message.chatId` via `normalisePhone()`.
  2. `GET /api/clients/match?phone=<normalized>` → if found, auto-populate `clientId` and show "Matched: ClientName".
  3. If not found, show inline "Create Client" form with name + phone prefilled.
- Client search: debounced `GET /api/clients?q=` with result dropdown.
- Assignee: `GET /api/team` once on mount; dropdown.
- Submit → `dispatch(createTask({ title, description, clientId, assigneeId, status, priority, dueDate }))`.
- On task created: `dispatch(addTaskLink({ taskId: newTask.id, type: 'whatsapp', chatId: message.chatId, messageId: message.id, snapshot: message.body, note: '' }))`.
- Success toast → close modal.

**Verify:** Right-click message from a seeded client's phone number; modal opens with client pre-matched; submit creates task in DB; `/tasks` shows new task.

---

#### Step 25: Wire modal to `MessageBubble`

**Files:** `web/components/whatsapp/MessageBubble.js` (modified)

**What:**
- Import `ConvertToTaskModal`.
- Add `showConvertModal` state (bool).
- `handleConvertToTask`: instead of `dispatch(addTask(...))`, set `showConvertModal = true`. Remove `setTaskAdded` flow (it referenced in-memory task).
- Render `<ConvertToTaskModal ... />` conditionally.
- Context menu item text stays "Convert to Task".
- **Remove** import of `addTask` from `whatsappSlice`.

**Verify:** Context menu → "Convert to Task" → modal appears with prefilled body text.

---

#### Step 26: Remove in-memory task system from `whatsappSlice`

**Files:** `web/lib/slices/whatsappSlice.js` (modified)

**What:**
- Remove `tasks: []` from `initialState`.
- Remove `addTask` and `removeTask` reducers and their exports.
- All other state/actions untouched.

**Verify:** Redux DevTools → `whatsapp` state no longer has a `tasks` key. `addTask` and `removeTask` are no longer importable (no other file should import them after Step 25).

---

#### Step 27: Retire `TaskDrawer`, update WA page header

**Files:**
- `web/components/whatsapp/TaskDrawer.js` (deprecated — leave with deprecation comment)
- `web/app/whatsapp/page.js` (modified — remove TaskDrawer usage; replace bell icon with Tasks link)

**What:**
- In `web/app/whatsapp/page.js`: remove `<TaskDrawer>` import and usage. Replace bell-icon button with a link to `/tasks`.
- Mark `TaskDrawer.js` with `// @deprecated — replaced by /tasks page in M4`.

**Verify:** WA header shows "Tasks ↗" link; clicking navigates to task dashboard.

---

#### Step 28: Task link badges on WA chats

**Files:**
- `web/app/api/chats/linked-tasks/route.js` (new)
- `web/components/whatsapp/ChatList.js` (modified)
- `web/components/whatsapp/ChatThread.js` (modified)

**What:**

New API `GET /api/chats/linked-tasks?chatId=X`:
- `db.taskLink.findMany({ where: { chatId: X, type: 'whatsapp' }, include: { task: { select: { id: true } } } })`.
- Return `{ count, taskCodes: string[] }`.

`ChatList.js`: fetch linked-tasks count per visible chat lazily. Display `TSKxxxx` green pill badge below chat name when `count > 0`.

`ChatThread.js`: fetch `GET /api/chats/linked-tasks?chatId=<activeChatId>` on chat open. Show subtle banner: `"Linked to TSKxxxx, TSKyyyy"` with links to tasks.

**Verify:** After linking a message, reopen the chat list → badge appears on that contact.

---

### Milestone M5 — Email ↔ Task Flow

> **Goal:** ThreadView has "Link to Task" and "Convert to Task" buttons. Linked threads show badges.

---

#### Step 29: `LinkToTaskModal` component

**Files:** `web/components/tasks/LinkToTaskModal.js` (new)

**What:**
- Props: `thread` (email thread summary shape), `onClose()`.
- State: `taskQuery`, `taskResults`, `selectedTaskId`, `note`.
- Task search: debounced `GET /api/tasks?q=<taskQuery>` → show dropdown of matches (code + title).
- Note textarea: max 1000 chars.
- Submit → `dispatch(addTaskLink({ taskId: selectedTaskId, type: 'email', threadId: thread.id, subject: thread.subject, sender: extractEmail(thread.from), note }))`.
- Success toast → close.

**Verify:** From email thread, open modal, search tasks, pick one, add note, submit → task detail shows email link.

---

#### Step 30: `ConvertEmailToTaskModal` component

**Files:** `web/components/tasks/ConvertEmailToTaskModal.js` (new)

**What:**
- Props: `thread` (email thread summary), `latestMessage`, `onClose()`.
- Prefill `title` from `thread.subject`, `description` from `latestMessage.bodyText` (stripped to plain text, max 2000 chars).
- Client matching: `GET /api/clients/match?email=<senderEmail>` → auto-populate if found.
- Otherwise inline create-client form.
- Same fields as `ConvertToTaskModal`: assignee, priority, due date.
- Submit → `createTask` then `addTaskLink(type: 'email', ...)`.

**Verify:** Open email thread; convert to task; task appears in `/tasks`.

---

#### Step 31: Wire modals to `ThreadView`

**Files:** `web/components/email/ThreadView.js` (modified)

**What:**
- Add state: `showLinkModal`, `showConvertModal`.
- Add two buttons in thread view header (next to Reply button):
  - "Link to Task" → `showLinkModal = true`.
  - "Convert to Task" → `showConvertModal = true`.
- Render both modals conditionally.

**Verify:** Both buttons appear in ThreadView header; both modals open correctly.

---

#### Step 32: Task link badge on email threads

**Files:**
- `web/app/api/email/linked-tasks/route.js` (new)
- `web/components/email/ThreadList.js` (modified)

**What:**

New API `GET /api/email/linked-tasks?threadId=X`:
- `db.taskLink.findMany({ where: { threadId: X, type: 'email' }, include: { task: { select: { id: true } } } })`.
- Return `{ count, taskCodes }`.

`ThreadList.js`: for active/hovered thread, fetch linked-tasks count. Show `"Linked to TSKxxxx"` pill below subject.

**Verify:** After linking an email thread to a task, the thread list shows the badge.

---

### Milestone M6 — Email Client from Task (Templates)

> **Goal:** Task detail has "Email Client" which opens a compose modal with template dropdown. Sent emails appear in timeline.

---

#### Step 33: `TaskEmailModal` component

**Files:** `web/components/tasks/TaskEmailModal.js` (new)

**What:**
- Props: `task`, `onClose()`.
- State: `to` (prefilled with `task.client?.email ?? ''`), `templateId`, `subject`, `bodyText`.
- Template dropdown: from `templates.templates` (Redux).
- On template select: apply `renderTemplate(template.body, { client: task.client, task })` → set `bodyText` and `subject`.
- User can edit subject and body freely after template is applied.
- `to` is editable.
- Submit → `dispatch(sendTaskEmail({ taskId: task.id, to, subject, bodyText, templateId }))`.
- On `sendTaskEmail.fulfilled`: close modal; `dispatch(loadTask(task.id))` to refresh timeline.
- `saving` spinner from `tasksSlice`.

**Verify:** Pick "Request Documents" template; placeholders fill correctly; send → email arrives in Gmail; timeline shows sent email.

---

#### Step 34: Wire "Email Client" button in TaskInfo

**Files:** `web/components/tasks/TaskInfo.js` (modified)

**What:**
- "Email Client" button only shown when `task.client?.email` is non-null.
- `onClick` → `setShowEmailModal(true)`.
- Render `<TaskEmailModal task={task} onClose={() => setShowEmailModal(false)} />`.

**Verify:** Button absent when no client email; present and functional when client email exists.

---

### Milestone M7 — Templates Management

> **Goal:** `/templates` page for CRUD management of email templates. Independently demoable.

---

#### Step 35: Templates page

**Files:** `web/app/templates/page.js` (new)

**What:**
- `'use client'`
- On mount: `dispatch(loadTemplates())`.
- Layout: list on left, edit form on right (or modal).
- List: template name + preview of subject. Buttons: Edit, Delete.
- "New Template" button → shows empty form.
- Form fields: name, subject (with placeholder hints), body (textarea).
- Save → `createTemplate` or `updateTemplate` thunk.
- Delete → confirm dialog → `deleteTemplate` thunk.

**Verify:** Create a template; edit it; delete it. All 4 seeded templates visible on load.

---

#### Step 36: Templates tab in TopNav

**Files:** `web/components/TopNav.js` (modified)

**What:**
- Add `{ label: 'Templates', href: '/templates', id: 'nav-templates' }` to TABS array.

**Verify:** "Templates" nav item visible and active on `/templates`.

---

### Milestone M8 — Chat Status DB Migration

> **Goal:** `chatStatus` moves from localStorage to `ChatStatus` table. Zero data loss for existing users.

---

#### Step 37: ChatStatus API routes

**Files:**
- `web/app/api/chats/status/route.js` (new)
- `web/app/api/chats/status/migrate/route.js` (new)

**What:**

`status/route.js`:
- `GET ?chatIds=id1,id2,...` → split by comma; `db.chatStatus.findMany({ where: { chatId: { in: ids } } })`; return `{ statuses: { [chatId]: status } }`.
- `PATCH` body `{ chatId, status }` → validate status ∈ `['open', 'resolved']`; `db.chatStatus.upsert`; return `{ ok: true }`.

`status/migrate/route.js`:
- `POST` body `{ statuses: { [chatId]: string } }` → validate; `db.chatStatus.createMany({ data: [...], skipDuplicates: true })`; return `{ ok: true, count }`.

**Verify:** `PATCH /api/chats/status` with `{ chatId: "919...", status: "resolved" }` → row created in DB.

---

#### Step 38: Update `whatsappSlice` — chatStatus DB integration

**Files:** `web/lib/slices/whatsappSlice.js` (modified)

**What:**

New thunk `syncChatStatus`:
```js
// On app load, after chats are set, fetch DB status for all known chatIds
export const syncChatStatus = createAsyncThunk(
  'whatsapp/syncChatStatus',
  async (chatIds, { dispatch }) => {
    const res = await fetch(`/api/chats/status?chatIds=${chatIds.join(',')}`);
    const data = await res.json();
    dispatch(setChatStatusBulk(data.statuses));
  }
);
```

New thunk `updateChatStatus` (replaces the localStorage write in `setChatStatus` reducer):
```js
export const updateChatStatus = createAsyncThunk(
  'whatsapp/updateChatStatus',
  async ({ chatId, status }, { dispatch }) => {
    await fetch('/api/chats/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, status }),
    });
    dispatch(setChatStatus({ chatId, status })); // still updates Redux
  }
);
```

Update `setChatStatus` reducer: **remove** the `localStorage.setItem` call.

Update `setChats` reducer: **remove** the `localStorage.getItem` call; status now comes via `syncChatStatus`.

Add `setChatStatusBulk` reducer: merges `{ [chatId]: status }` object into `chatStatus`.

**Verify:** Change a chat to Resolved; refresh page; chat is still Resolved (from DB, not localStorage).

---

#### Step 39: One-time localStorage migration

**Files:** `web/app/providers.js` (modified)

**What:**

In `AppBootstrap.useEffect`, after `dispatch(fetchGmailProfile())`, add migration logic:

```js
// One-time migration: move localStorage wa_chat_status → DB
const migrated = localStorage.getItem('wa_status_migrated');
if (!migrated) {
  try {
    const saved = localStorage.getItem('wa_chat_status');
    if (saved) {
      const statuses = JSON.parse(saved);
      if (Object.keys(statuses).length > 0) {
        await fetch('/api/chats/status/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statuses }),
        });
      }
    }
  } catch { /* ignore */ } finally {
    localStorage.setItem('wa_status_migrated', '1');
  }
}
```

Also: after `setChats` dispatched in `onChats` handler, dispatch `syncChatStatus(chatIds)` to hydrate Redux from DB.

**Verify:** Clear DB, add status in localStorage; refresh → migration runs → `wa_status_migrated=1` set; DB has rows; refresh again → migration does NOT run again.

---

### Milestone M9 — Polish, Badges & Responsive

> **Goal:** Full UX polish, "Linked to TSKxxxx" badges everywhere, mobile responsive, final QA pass.

---

#### Step 40: Tailwind design tokens for CRM

**Files:** `web/tailwind.config.js` (modified)

**What:** Add CRM-specific color tokens:
```js
colors: {
  // ... existing tokens ...
  "crm-bg":           "#f8fafc",
  "crm-card":         "#ffffff",
  "crm-accent":       "#6366f1",   // indigo — distinct from wa/em accents
  "crm-accent-dark":  "#4f46e5",
  "crm-border":       "#e2e8f0",
  "crm-muted":        "#94a3b8",

  "status-open":        "#64748b",
  "status-in-progress": "#3b82f6",
  "status-waiting":     "#f59e0b",
  "status-resolved":    "#10b981",
  "status-closed":      "#94a3b8",

  "prio-urgent": "#ef4444",
  "prio-high":   "#f97316",
  "prio-medium": "#eab308",
  "prio-low":    "#94a3b8",
}
```

**Verify:** CRM pages use consistent color palette; no raw hex values in JSX.

---

#### Step 41: `TaskCodeBadge` shared component

**Files:** `web/components/tasks/TaskCodeBadge.js` (new)

**What:**
- Props: `taskId` (number), `taskCode` (string), optional `count` (for "+2 more").
- Renders a small pill `Linked to TSK0042` → `href="/tasks/<taskId>"`.
- Used in: `ChatList`, `ChatThread`, `ThreadList`.

**Verify:** Badge renders correctly in all 3 contexts.

---

#### Step 42: App-level metadata and brand update

**Files:** `web/app/layout.js` (modified), `web/components/TopNav.js` (modified)

**What:**
```js
// layout.js
export const metadata = {
  title: "CRM — Unified Communications",
  description: "Task-based CRM with WhatsApp and Gmail integration."
};
```

TopNav brand text: `"Unified Inbox"` → `"CRM"`.

**Verify:** Browser tab title is "CRM — Unified Communications".

---

#### Step 43: Responsive layout audit

**Files:**
- `web/app/tasks/page.js` (modified)
- `web/app/tasks/[id]/page.js` (modified)
- `web/app/templates/page.js` (modified)

**What:**
- Task dashboard: single-column on mobile (`flex-col`), two-column on `md:`.
- Task detail: single-column on mobile (info on top, timeline below), two-column on `lg:`.
- All modals: full-screen on mobile (`fixed inset-0`), centered dialog on `md:`.
- No horizontal scrollbars on 375px viewport.

**Verify:** Chrome DevTools at 375px → no overflow, modals full-screen.

---

#### Step 44: Toast notification system

**Files:** `web/components/Toast.js` (new), `web/app/providers.js` (modified)

**What:**
- Lightweight `ToastContext` wrapping entire app.
- `useToast()` hook exposes `showToast(message, type)` where `type` ∈ `success | error | info`.
- Renders up to 3 stacked toasts at bottom-right; each auto-dismisses after 3s.
- Used in all `createTask`, `addTaskLink`, `sendTaskEmail` success/error cases.

**Verify:** Create task → green toast "Task TSK0005 created". API error → red toast.

---

#### Step 45: `globals.css` — CRM page utility classes

**Files:** `web/app/globals.css` (modified)

**What:**
- Verify `Inter` font import is present.
- Add `@layer components` utilities: `.task-card`, `.badge`, `.status-pill`, `.priority-dot`.

**Verify:** Classes available globally; no duplicate definitions.

---

## 6. Files-to-Steps Summary Map

| File (✨ new, ✏️ modified) | Step(s) |
|---------------------------|---------|
| `web/prisma/schema.prisma` ✨ | S2 |
| `web/.env.local` ✏️ | S3 |
| `web/.env.local.example` ✏️ | S3 |
| `web/prisma/migrations/` ✨ | S4 |
| `web/lib/db.js` ✨ | S5 |
| `web/prisma/seed.js` ✨ | S6 |
| `web/package.json` ✏️ | S1, S6 |
| `web/lib/normalise.js` ✨ | S7 |
| `web/app/api/team/route.js` ✨ | S8 |
| `web/app/api/clients/route.js` ✨ | S9 |
| `web/app/api/clients/match/route.js` ✨ | S9 |
| `web/app/api/tasks/route.js` ✨ | S10 |
| `web/app/api/tasks/[id]/route.js` ✨ | S11 |
| `web/app/api/tasks/[id]/links/route.js` ✨ | S12 |
| `web/app/api/tasks/[id]/links/[linkId]/route.js` ✨ | S12 |
| `web/app/api/tasks/[id]/email/route.js` ✨ | S13 |
| `web/app/api/templates/route.js` ✨ | S14 |
| `web/app/api/templates/[id]/route.js` ✨ | S14 |
| `web/lib/slices/tasksSlice.js` ✨ | S15 |
| `web/lib/slices/templatesSlice.js` ✨ | S15 |
| `web/lib/store.js` ✏️ | S15 |
| `web/app/tasks/page.js` ✨ | S16, S19, S43 |
| `web/app/tasks/layout.js` ✨ | S16 |
| `web/components/tasks/TaskFilters.js` ✨ | S17 |
| `web/components/tasks/TaskCard.js` ✨ | S18 |
| `web/components/tasks/TaskPagination.js` ✨ | S19 |
| `web/components/TopNav.js` ✏️ | S20, S36, S42 |
| `web/app/tasks/[id]/page.js` ✨ | S21, S43 |
| `web/components/tasks/TaskInfo.js` ✨ | S22, S34 |
| `web/components/tasks/LinkedCommsTimeline.js` ✨ | S23 |
| `web/components/tasks/ConvertToTaskModal.js` ✨ | S24 |
| `web/components/whatsapp/MessageBubble.js` ✏️ | S25 |
| `web/lib/slices/whatsappSlice.js` ✏️ | S26, S38 |
| `web/components/whatsapp/TaskDrawer.js` ✏️ (deprecated) | S27 |
| `web/app/whatsapp/page.js` ✏️ | S27 |
| `web/app/api/chats/linked-tasks/route.js` ✨ | S28 |
| `web/components/whatsapp/ChatList.js` ✏️ | S28 |
| `web/components/whatsapp/ChatThread.js` ✏️ | S28 |
| `web/components/tasks/LinkToTaskModal.js` ✨ | S29 |
| `web/components/tasks/ConvertEmailToTaskModal.js` ✨ | S30 |
| `web/components/email/ThreadView.js` ✏️ | S31 |
| `web/app/api/email/linked-tasks/route.js` ✨ | S32 |
| `web/components/email/ThreadList.js` ✏️ | S32 |
| `web/components/tasks/TaskEmailModal.js` ✨ | S33 |
| `web/app/templates/page.js` ✨ | S35, S43 |
| `web/app/api/chats/status/route.js` ✨ | S37 |
| `web/app/api/chats/status/migrate/route.js` ✨ | S37 |
| `web/app/providers.js` ✏️ | S39, S44 |
| `web/tailwind.config.js` ✏️ | S40 |
| `web/components/tasks/TaskCodeBadge.js` ✨ | S41 |
| `web/app/layout.js` ✏️ | S42 |
| `web/components/Toast.js` ✨ | S44 |
| `web/app/globals.css` ✏️ | S45 |

**Total: ~35 new files | ~14 modified files**

---

## 7. End-to-End Smoke-Test Checklist

### Setup
- [ ] `npx prisma migrate dev` runs clean from `web/`
- [ ] `npx prisma db seed` inserts 3 members, 4 clients, 4 templates
- [ ] `npm run dev` starts on port 3000 without errors
- [ ] `server/` starts on port 4000; WA QR scan works

### Navigation
- [ ] TopNav shows: Connections | WhatsApp | Email | Tasks | Templates
- [ ] Each tab navigates correctly; active tab highlighted
- [ ] Browser title is "CRM — Unified Communications"

### Task Dashboard (`/tasks`)
- [ ] Task list loads with pagination
- [ ] Filter by status works ("open" → only open tasks)
- [ ] Filter by assignee works
- [ ] Search by title works (debounced 300ms)
- [ ] TaskCard shows: code, title, status pill, priority badge, client name, due date
- [ ] Overdue tasks show red due date
- [ ] Clicking TaskCard navigates to `/tasks/[id]`

### Task Detail (`/tasks/[id]`)
- [ ] Task fields display correctly
- [ ] Inline edit title → PATCH fires → refresh shows new title
- [ ] Status dropdown change → persisted on refresh
- [ ] Priority dropdown change → persisted on refresh
- [ ] Assignee dropdown shows 3 seeded team members
- [ ] "Email Client" button hidden when no client email; visible otherwise

### WhatsApp → Task
- [ ] Right-click a WA message → context menu → "Convert to Task"
- [ ] Modal opens with message body prefilled in description
- [ ] Sender phone auto-matched to seeded client → "Matched: ClientName"
- [ ] Unmatched phone → inline create-client form shown
- [ ] Submit → task created → visible on `/tasks`
- [ ] Task detail → LinkedCommsTimeline shows WA snapshot with chatId
- [ ] Chat list shows `TSKxxxx` badge on that contact

### Email → Task (Link)
- [ ] Open email thread → "Link to Task" button visible
- [ ] Modal: search tasks, pick one, add note, submit
- [ ] Task detail → timeline shows email link with subject, sender, note
- [ ] Thread list shows `Linked to TSKxxxx` badge

### Email → Task (Convert)
- [ ] Open email thread → "Convert to Task" button
- [ ] Modal prefilled with subject as title, body snippet as description
- [ ] Sender email auto-matched to seeded client if match exists
- [ ] Submit → task created; task detail has email link

### Send Email from Task
- [ ] Task detail → "Email Client" → modal opens
- [ ] `to` field prefilled with client email
- [ ] Template dropdown shows 4 seeded templates
- [ ] Pick "Request Documents" → `{{client.name}}`, `{{task.code}}`, `{{task.title}}` render correctly
- [ ] Edit body freely after template applied
- [ ] Send → email arrives in Gmail with `[TSKxxxx]` in subject
- [ ] Task detail timeline shows sent email entry

### Templates (`/templates`)
- [ ] 4 seeded templates listed
- [ ] Create new template → appears in list
- [ ] Edit template → changes saved
- [ ] Delete template → removed from list
- [ ] Templates appear in TaskEmailModal dropdown

### Chat Status Migration
- [ ] Set some chats to Resolved via WA page (uses DB)
- [ ] Refresh page → chats remain Resolved
- [ ] `wa_status_migrated` in localStorage prevents re-migration on refresh
- [ ] DB `ChatStatus` table has correct rows

### Validation / Security
- [ ] `POST /api/tasks` with missing title → 400
- [ ] `POST /api/tasks` with invalid status → 400
- [ ] `POST /api/clients` with invalid email → 400
- [ ] `POST /api/clients` with duplicate phone → 409
- [ ] `GET /api/tasks/99999` → 404
- [ ] `POST /api/tasks/[id]/links` with WA type but no snapshot → 400
- [ ] Server logs contain no token values or message bodies

### Responsive
- [ ] `/tasks` at 375px → single-column, no horizontal scroll
- [ ] Modals at 375px → full-screen, scrollable body
- [ ] TopNav at 375px → tabs scroll horizontally

---

## 8. Build Order & Demo Points

Each milestone produces an independently demoable increment:

```
M0  DB + seed + normalise util
 ↓   Demo: Prisma Studio shows tables + data; normalise() works in REPL

M1  All API routes (no UI)
 ↓   Demo: all endpoints verified via curl/Postman

M2  Task Dashboard + Redux slices
 ↓   Demo: /tasks page with filters and task cards

M3  Task Detail page
 ↓   Demo: edit status/priority in-place; empty timeline renders

M4  WhatsApp → Task modal + badge
 ↓   Demo: right-click WA message → create task → badge on chat

M5  Email ↔ Task modals + badge
 ↓   Demo: link email to task; convert email to task; badges on threads

M6  Send email from task with templates
 ↓   Demo: compose + send → timeline shows sent email entry

M7  Templates CRUD page
 ↓   Demo: manage templates end-to-end from /templates

M8  Chat Status DB migration
 ↓   Demo: status persists on refresh without localStorage

M9  Polish, badges, responsive
 ↓   Demo: full UX review at 375px and 1440px
```

---

## 9. Multi-User Auth — Future Path

> **Not implemented in this plan.** Documented here for architectural awareness.

When multi-user login is needed:

1. **Replace iron-session with NextAuth.js** — supports Google OAuth, credentials, and more.
2. **Add a `User` model** — email + OAuth provider + hashed password (if credentials provider).
3. **Scope DB queries by `userId`** — `Task`, `Client`, `EmailTemplate` all get a `userId` FK. All API routes check session and filter by `req.session.user.id`.
4. **Store Gmail tokens per user** — move from cookie to a `UserGmailToken` table (AES-256 encrypted, key in env).
5. **Separate WA sessions per user** — requires one `server/` instance per user; out of scope until WA multi-device API matures.
6. **`TeamMember.email` maps 1:1 to `User.email`** for login identity.
7. **RBAC** — add `role` field (`admin | member`) to `User`; admins see all tasks, members see assigned tasks only.
8. **No breaking schema change needed now** — add `userId` as nullable FK initially, backfill with a migration script, then make it non-nullable.

---

*End of CRM Implementation Plan — 45 steps across 10 milestones.*
