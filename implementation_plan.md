# Unified Inbox — 30-Step Implementation Plan

> Covers every file the spec lists. Steps are grouped into the 9 milestones.  
> Each step states **what file(s) change**, **what goes in them**, and **how to verify**.

---

## Spec Review & Adjustments

| Area | Adjustment |
|---|---|
| `qrcode.react` version | Use `qrcode.react@3` (v3 exports `QRCodeSVG`/`QRCodeCanvas`; the old default export is gone). |
| `iron-session` vs manual cookie | Replace manual signed-cookie with **`iron-session@8`** (it handles encryption/signing, works with Next.js App Router, adds zero new surface area). |
| `sanitize-html` for Gmail HTML | Add `sanitize-html` (tiny, used only server-side in the parse helper) so we can optionally render HTML emails safely. |
| `socket.io` version pinning | Pin `socket.io@4` / `socket.io-client@4` — they must match major versions exactly. |
| `whatsapp-web.js` install note | Must be installed with `--legacy-peer-deps` because it pins an old `puppeteer` minor. |
| Mobile responsive | Use Tailwind's `md:` breakpoints + a state variable to toggle pane visibility on narrow screens. |

---

## Milestone 1 — Scaffold & Foundation (Steps 1–6)

### Step 1 — Initialise the monorepo root

**Files:** `/`, `/README.md`, `/.gitignore`, `/PROJECT_SPEC.md`

- Create the root directory (the workspace already exists at `d:\Web Dev\Projects\CRM_Web_App`).
- Add a root `.gitignore` covering `node_modules/`, `*.env`, `.wwebjs_auth/`, `.wwebjs_cache/`, `.next/`, `.DS_Store`.
- Stub out `README.md` with headings (filled in at Step 30).
- No `package.json` at root; each sub-package manages itself.

**Verify:** `git status` shows a clean root with the two untracked folders `web/` and `server/`.

---

### Step 2 — Scaffold the Next.js 14 app (`web/`)

**Files:** `web/` (entire Next.js scaffold)

- Run `npx create-next-app@14 web --app --js --tailwind --eslint --no-src-dir --import-alias "@/*"` in non-interactive mode.
- This creates: `web/app/layout.js`, `web/app/page.js`, `web/tailwind.config.js`, `web/postcss.config.js`, `web/next.config.js`, `web/package.json`, etc.
- Install extra deps: `redux @reduxjs/toolkit react-redux socket.io-client qrcode.react iron-session`.
- Create `web/.env.local.example` (empty values, all five vars from spec §6).
- Add `web/.gitignore`: `.env.local`, `.next/`.

**Why Next.js 14 App Router?** All API routes live in `app/api/*/route.js` files and are plain async functions — no Express needed on the Next side.

**Verify:** `cd web && npm run dev` → localhost:3000 shows the default Next.js welcome page.

---

### Step 3 — Design system in `globals.css` + Tailwind config

**Files:** `web/app/globals.css`, `web/tailwind.config.js`

- `tailwind.config.js`: extend theme with custom colors:
  - `wa-panel: #f0f2f5`, `wa-chat-bg: #efeae2`, `wa-outgoing: #d9fdd3`, `wa-accent: #00a884`
  - `neutral-*` shades for the Gmail pane
- `globals.css`: import Tailwind layers, set `body { font-family: 'Inter', sans-serif; }`, load Inter from Google Fonts via `@import`.
- Define a few CSS custom properties for the sidebar widths so they are easy to tweak.

**Why here?** Tailwind tokens defined once in the config mean every component can use `bg-wa-accent` etc. without magic strings.

**Verify:** The class `bg-wa-accent` resolves to `#00a884` in the browser DevTools.

---

### Step 4 — Redux store + three slices (skeleton)

**Files:** `web/lib/store.js`, `web/lib/slices/connectionsSlice.js`, `web/lib/slices/whatsappSlice.js`, `web/lib/slices/emailSlice.js`

- `store.js`: `configureStore({ reducer: { connections, whatsapp, email } })`. Export `store`, typed `useAppSelector`/`useAppDispatch` helpers.
- **`connectionsSlice`** initial state exactly as in spec §10.1. Actions: `setWaStatus`, `setGmail`. Thunk `fetchGmailProfile` (calls `/api/gmail/profile`, on 401 stays disconnected).
- **`whatsappSlice`** initial state per spec §10.2. All actions as listed (skeleton implementations — logic filled in Steps 11–14).
- **`emailSlice`** initial state per spec §10.3. Thunks `loadThreads`, `loadThread`, `sendEmail` — skeleton.

**Why Redux Toolkit?** `createSlice` eliminates boilerplate; `createAsyncThunk` gives `pending/fulfilled/rejected` states for free, which drive loading spinners.

**Verify:** `store.getState()` in the browser console returns the three slice initial states.

---

### Step 5 — `providers.js` + socket singleton bootstrap

**Files:** `web/app/providers.js`, `web/lib/socket.js`

- `socket.js`: export a `getSocket()` function that creates the socket once (`io(process.env.NEXT_PUBLIC_WA_SERVER_URL, { autoConnect: false })`). Register `wa:status`, `wa:message`, `wa:ack` listeners that call Redux dispatch (import store directly — avoids prop drilling).
- `providers.js`: `"use client"`. Wraps children in `<Provider store={store}>`. In a `useEffect` (runs once, client only), calls `getSocket().connect()` and dispatches `fetchGmailProfile`.
- `layout.js`: wraps `{children}` in `<Providers>`. Also sets the `<html lang>`, imports globals.css, and sets a `<meta name="description">`.

**Why not create sockets in components?** Socket creation inside a component causes a new connection on every render. One singleton per browser tab is the correct pattern.

**Verify:** Opening DevTools → Network → WS shows a socket.io connection attempt to `:4000` (will fail until Step 8, but no crash).

---

### Step 6 — TopNav + three page skeletons + `page.js` redirect

**Files:** `web/components/TopNav.js`, `web/components/Avatar.js`, `web/components/StatusPill.js`, `web/app/page.js`, `web/app/connections/page.js`, `web/app/whatsapp/page.js`, `web/app/email/page.js`

- `TopNav.js`: `"use client"`. Uses `usePathname` for active tab highlighting. Shows brand (left), three `<Link>` tabs (center), two `<StatusPill>`s (right). Reads `wa.state` and `gmail.connected` from Redux.
- `Avatar.js`: takes `name` prop, renders a circle with initials + deterministic background color (hash of name -> HSL).
- `StatusPill.js`: green dot + "Connected" or grey dot + "Disconnected".
- `page.js`: server component, just `redirect("/connections")`.
- The three route pages: render `<TopNav>` + a `<main>` with placeholder text.

**Verify:** Navigating `/connections`, `/whatsapp`, `/email` works; active tab highlights; status pills show "Disconnected".

---

## Milestone 2 — WhatsApp Server + QR (Steps 7–10)

### Step 7 — Scaffold the WhatsApp server (`server/`)

**Files:** `server/package.json`, `server/.env.example`, `server/.gitignore`, `server/index.js` (stub)

- `package.json`: `"type":"module"`, scripts: `"dev": "node --watch index.js"`.
- Deps: `express`, `socket.io`, `cors`, `dotenv`, `whatsapp-web.js`. Install with `--legacy-peer-deps`.
- `.env.example`: `PORT=4000`, `WEB_ORIGIN=http://localhost:3000`.
- `.gitignore`: `.env`, `.wwebjs_auth/`, `.wwebjs_cache/`, `node_modules/`.
- `index.js` stub: loads dotenv, creates Express app + HTTP server + `Server` from socket.io, sets CORS to `WEB_ORIGIN`, calls `waClient.init(io)`, listens on `PORT`.

**Why separate server?** `whatsapp-web.js` spawns a long-lived Chromium process. Next.js route handlers are ephemeral (especially in serverless). They cannot share a process.

**Verify:** `cd server && npm run dev` → process starts with no crash (waClient not yet real).

---

### Step 8 — `waClient.js` — WhatsApp client + event bridge

**Files:** `server/waClient.js`

- Export `init(io)` function.
- Instantiate `Client` with `LocalAuth` + puppeteer args from spec §8.1.
- Define mutable `state` object: `{ state, qr, me }`.
- Wire every library event to update `state` and `io.emit('wa:status', ...)` exactly per spec §8.2.
- On `ready`: also call `pushChatList(io)` (helper defined here: fetches top 40 chats, emits `wa:chats`).
- On every new socket `connection`: emit current `wa:status` immediately (page-refresh recovery).
- Call `client.initialize()` at end of `init`.

**Key implementation detail:** `chat.id._serialized` for IDs; `contact.name || msg.notifyName || contact.number` for display names.

**Verify:** `npm run dev` in `server/` → terminal shows "WhatsApp client is initializing..."; in ~15 s a QR appears in the terminal (wwebjs default console output).

---

### Step 9 — Socket event handlers for browser→server messages

**Files:** `server/waClient.js` (additions), `server/index.js` (socket `connection` handler)

- In `index.js` `connection` handler, register all five browser→server events per spec §8.3 with acknowledgement callbacks.
- `wa:getChats`: call `client.getChats()`, map to `Chat[]` shape (spec §8.4), filter out `id._serialized === 'status@broadcast'`, sort by `timestamp` desc, take top 40.
- `wa:getMessages`: `chat.fetchMessages({ limit })`, map to `Message[]`.
- `wa:send`: `client.sendMessage(chatId, text)`, map result to `Message`.
- `wa:markRead`: `(await client.getChatById(chatId)).sendSeen()`.
- `wa:logout`: `client.logout()` then `client.initialize()`.
- All handlers guard: `if (state.state !== 'ready') return ack({ ok: false, error: 'not_ready' })`.

**Verify:** In browser console: `socket.emit('wa:getChats', (r) => console.log(r))` returns `{ ok: false, error: 'not_ready' }` (server not ready yet — correct).

---

### Step 10 — Connections page: WhatsApp card with live QR

**Files:** `web/components/connections/WhatsAppCard.js`, `web/app/connections/page.js`

- `WhatsAppCard.js`: `"use client"`. Reads `wa` from Redux. Switch on `wa.state`:
  - `disconnected`: "Link WhatsApp" button (does nothing — socket auto-connects), server-unreachable banner if `wa.error` is set.
  - `qr`: `<QRCodeSVG value={wa.qr} size={256} />` + scanning instructions.
  - `authenticating`: spinner + "Linking…".
  - `ready`: green pill, "Connected as [name] ([number])", **Disconnect** button (emits `wa:logout`).
- The socket listener in `socket.js` already dispatches `setWaStatus` on every `wa:status` — so this component is purely display.
- `connections/page.js`: import both cards, lay them side-by-side in a responsive grid.

**Verify: Milestone 2 acceptance** — Start server, open `:3000/connections`, see QR render. Scan with phone → card flips to "Connected as …" within ~3 s.

---

## Milestone 3 — WhatsApp Chat List & Thread (Steps 11–13)

### Step 11 — `whatsappSlice` full logic + `loadChats` / `loadMessages` thunks

**Files:** `web/lib/slices/whatsappSlice.js` (flesh out)

- `loadChats` thunk: emit `wa:getChats` via the socket singleton (wrap in a `Promise` for the ack), dispatch `setChats` on success. Also restores `chatStatus` from `localStorage` (key `wa_chat_status`).
- `setChats(chats)`: populate `chatsById`, set `chatOrder` sorted by timestamp desc.
- `loadMessages(chatId)` thunk: emit `wa:getMessages`, dispatch `setMessages({ chatId, messages })`.
- `upsertMessage(message)`: dedupe by `id`; update `chatsById[chatId].lastMessage` and `timestamp`; re-sort `chatOrder`; increment `unreadCount` only if `chatId !== activeChatId && !fromMe`.
- `setAck({ chatId, id, ack })`: find the message in `messagesByChat[chatId]` and update its `ack` field.
- `setChatStatus(chatId, status)`: update state + persist full map to `localStorage`.

**Why localStorage for statuses?** The spec forbids a database. `localStorage` survives page refresh; the Redux slice reads it on `loadChats`.

**Verify:** `store.getState().whatsapp` reflects correct structure after dispatching actions in unit test or browser console.

---

### Step 12 — WhatsApp page layout + ChatList component

**Files:** `web/app/whatsapp/page.js`, `web/components/whatsapp/ChatList.js`

- `whatsapp/page.js`: `"use client"`. On mount (useEffect), dispatch `loadChats` if `wa.state === 'ready'`. Renders two-pane layout: `<ChatList>` (left, `w-80`, hidden on mobile when a chat is open) + right pane (`flex-1`).
- `ChatList.js`:
  - Search input (controlled, dispatches `setSearch`).
  - Filter tabs: Open / Resolved / All (dispatches `setFilter`).
  - List of filtered+searched chats (hide groups by default — toggle hidden in state but don't expose UI now).
  - Each row: `<Avatar name={chat.name}>`, name, last message body (truncated 40 chars), time (formatted client-side with `new Date(ts * 1000).toLocaleTimeString`), unread badge (red circle with count).
  - Click → dispatch `setActiveChat(id)` + `loadMessages(id)` + emit `wa:markRead`.

**Formatting note:** All timestamps are formatted in a `useEffect` or with a client-only component to avoid Next.js hydration mismatch (server renders nothing; client fills in the time).

**Verify:** Chat list shows real WhatsApp chats; clicking one sets `activeChatId` in Redux.

---

### Step 13 — ChatThread + MessageBubble + Composer (display only)

**Files:** `web/components/whatsapp/ChatThread.js`, `web/components/whatsapp/MessageBubble.js`, `web/components/whatsapp/Composer.js`

- `ChatThread.js`: reads `messagesByChat[activeChatId]`. Auto-scrolls a `div` ref to bottom when messages change (`useEffect` on messages.length). Shows date separator when date changes between consecutive messages. Shows "Loading messages…" state.
- `MessageBubble.js`: 
  - `fromMe` → right-aligned, `bg-wa-outgoing`, rounded corners.
  - Others → left-aligned, `bg-white`.
  - Body text. Time (bottom-right, tiny). Ack ticks: `ack === 1` → single grey ✓; `ack === 2` → double grey ✓✓; `ack === 3` → blue ✓✓. Media → `[Media message]` in italic.
- `Composer.js`: `<textarea>` (Enter = send, Shift+Enter = newline). Send button. Dispatches `sendWaMessage({ chatId: activeChatId, text })`. Clears on send.
- Header in `ChatThread.js`: chat name, `Open`/`Resolved` toggle (reads+updates `chatStatus`), group badge.

**Verify: Milestone 3 acceptance** — Real chat history visible; date separators correct; message bubbles styled correctly.

---

## Milestone 4 — Live Messaging (Step 14)

### Step 14 — Live socket events + send + ack + markRead wiring

**Files:** `web/lib/socket.js` (complete listener wiring), `web/lib/slices/whatsappSlice.js` (`sendWaMessage` thunk)

- `socket.js`: on `wa:message` → dispatch `upsertMessage(message)` (deduplication already in reducer).
- `socket.js`: on `wa:ack` → dispatch `setAck({ chatId, id, ack })`.
- `sendWaMessage` thunk:
  1. Create an optimistic message (temp id `"tmp_" + Date.now()`, `ack:0`), dispatch `upsertMessage`.
  2. Emit `wa:send`, await ack.
  3. On success: the real `wa:message` event (fired by `message_create`) will arrive shortly and `upsertMessage` will add the real message; we don't need to manually replace the temp one (it stays as a visual pending indicator until the `wa:message` replaces it by id deduplication — note: temp id ≠ real id, so both will exist briefly; simpler approach: on `sendWaMessage` ack success, remove temp message and let the incoming `wa:message` handle it).
- `markRead` called automatically on `setActiveChat`.

**Verify: Milestone 4 acceptance** — Send "Hello from app" from the UI → appears on phone. Send a message from the phone → appears live in UI within 1–2 s. Ack ticks update from ✓ to ✓✓ to blue ✓✓.

---

## Milestone 5 — Gmail OAuth (Steps 15–17)

### Step 15 — `lib/google.js` — OAuth2 client factory + cookie helpers

**Files:** `web/lib/google.js`

- `createOAuth2Client()`: creates `new google.auth.OAuth2(CLIENT_ID, SECRET, REDIRECT_URI)`.
- `getSessionFromCookie(req)`: uses `iron-session` to decrypt the `gmail_session` cookie from the request headers.
- `saveSessionToCookie(res, tokenData)`: encrypts and sets the `gmail_session` httpOnly cookie via `iron-session` (maxAge 7 days, sameSite lax).
- `clearSessionCookie(res)`: sets the cookie with maxAge 0.
- `getAuthenticatedClient(req, res)`: reads cookie → sets credentials on the OAuth client → attaches a `tokens` event listener that re-saves the cookie whenever the library auto-refreshes the access token → returns `{ oauth2Client, email }`.

**Why `iron-session`?** It handles AES-GCM encryption + HMAC signing in one package. We avoid rolling our own crypto with `SESSION_SECRET` from env.

**Verify:** Unit test in scratch: `createOAuth2Client()` returns an object with `generateAuthUrl`.

---

### Step 16 — OAuth route handlers

**Files:** `web/app/api/auth/google/route.js`, `web/app/api/auth/google/callback/route.js`, `web/app/api/auth/logout/route.js`

- `GET /api/auth/google`:
  - Generate random `state` (16 hex bytes).
  - Store in a short-lived cookie (`oauth_state`, httpOnly, maxAge 10 min).
  - Redirect to `oauth2Client.generateAuthUrl({ access_type:'offline', prompt:'consent', scope:[...], state })`.
- `GET /api/auth/google/callback`:
  - Read `state` from query param; compare to cookie; 400 if mismatch.
  - `oauth2Client.getToken(code)` → tokens.
  - `oauth2Client.setCredentials(tokens)`.
  - Call `google.oauth2('v2').userinfo.get()` to get `email`.
  - `saveSessionToCookie(res, { ...tokens, email })`.
  - Clear `oauth_state` cookie.
  - `redirect('/connections?gmail=connected')`.
- `POST /api/auth/logout`:
  - `clearSessionCookie(res)`.
  - Return `{ ok: true }`.

**All routes have `export const runtime = "nodejs"` at top.**

**Verify:** Clicking "Connect Gmail" redirects to Google consent; after consent, lands on `/connections?gmail=connected`.

---

### Step 17 — Gmail card on Connections page + `fetchGmailProfile` thunk

**Files:** `web/components/connections/GmailCard.js`, `web/app/api/gmail/profile/route.js`, `web/lib/slices/connectionsSlice.js` (thunk)

- `GET /api/gmail/profile`: `getAuthenticatedClient` → `gmail.users.getProfile({ userId:'me' })` → `{ email: profile.data.emailAddress }`. 401 if no cookie.
- `fetchGmailProfile` thunk: fetch `/api/gmail/profile`; on 200 dispatch `setGmail({ connected: true, email })`; on 401 dispatch `setGmail({ connected: false, email: null })`.
- Called in `providers.js` on mount so state is restored on every page load/refresh.
- `GmailCard.js`: "Connect Gmail" → navigate to `/api/auth/google`. When connected: email, Disconnect button (POST `/api/auth/logout` + dispatch `setGmail({ connected:false })`). Success toast when `?gmail=connected` in URL (use a simple `useSearchParams` + `useEffect`).

**Verify: Milestone 5 acceptance** — Connect Gmail → card shows real Gmail address. Refresh page → still shows connected. Click Disconnect → card resets.

---

## Milestone 6 — Gmail Thread List & Thread View (Steps 18–20)

### Step 18 — `lib/gmailParse.js` — payload parsing utilities

**Files:** `web/lib/gmailParse.js`

- `getHeader(headers, name)`: case-insensitive find.
- `decodeBase64Url(data)`: `Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf-8')`.
- `extractBody(payload)`: recursively walk `payload.parts`; prefer `text/plain`; fall back to `text/html` (strip HTML tags with a regex or `sanitize-html` stripping all tags). Return the decoded string.
- `parseThread(thread)`: map each `message` in `thread.messages` to `{ id, from, to, subject, date, bodyText, bodyHtml, messageIdHeader, references, labelIds }`.
- `parseThreadListItem(thread, messages)`: extract `{ id, subject, from, snippet, date, unread, messageCount }` from metadata-format messages.

**Why a dedicated parse file?** Gmail's nested `payload.parts` structure is complex. Isolating it makes the route handlers thin and testable.

**Verify:** Import in a scratch script, pass a hardcoded payload, assert correct field extraction.

---

### Step 19 — Gmail thread list + thread detail API routes

**Files:** `web/app/api/gmail/threads/route.js`, `web/app/api/gmail/threads/[id]/route.js`

- `GET /api/gmail/threads`:
  - Parse `q` and `pageToken` from `request.nextUrl.searchParams`.
  - `gmail.users.threads.list({ userId:'me', maxResults:20, labelIds:['INBOX'], q, pageToken })`.
  - For each thread id, call `gmail.users.threads.get({ userId:'me', id, format:'metadata', metadataHeaders:['From','Subject','Date'] })` in parallel (`Promise.all`).
  - Map with `parseThreadListItem`; return `{ threads, nextPageToken }`.
- `GET /api/gmail/threads/[id]`:
  - `gmail.users.threads.get({ userId:'me', id:params.id, format:'full' })`.
  - `parseThread(thread)`.
  - Return `{ messages }`.

**Both have `export const runtime = "nodejs"`.**

**Verify:** `curl http://localhost:3000/api/gmail/threads` returns JSON with real inbox threads.

---

### Step 20 — Email page: ThreadList + ThreadView components

**Files:** `web/app/email/page.js`, `web/components/email/ThreadList.js`, `web/components/email/ThreadView.js`

- `email/page.js`: `"use client"`. On mount dispatch `loadThreads({})`. Two-pane layout (same responsive pattern as WhatsApp). If not connected show empty state with link to Connections.
- `ThreadList.js`:
  - Search box (debounced 400 ms, dispatches `loadThreads({ q: searchValue })`).
  - Thread rows: sender name, subject (bold if unread), snippet, date (formatted client-side), unread blue dot. Click → dispatch `loadThread(id)` + set `activeThreadId`.
  - "Load more" button (dispatches `loadThreads({ pageToken: nextPageToken })`, appends threads).
  - **Compose** button (dispatches `setComposeOpen(true)`).
- `ThreadView.js`:
  - List of messages in the thread, each showing from/to/date header + `bodyText` in a `<pre className="whitespace-pre-wrap">`.
  - **Reply** section at the bottom: textarea pre-filled with a blank line + quoted original text; Send Reply button.
  - Dispatches `sendEmail({ to, subject:'Re: ...', body, threadId, inReplyTo, references })`.

**Verify: Milestone 6 acceptance** — Real Gmail inbox visible; click a thread → readable body; unread dots show correctly.

---

## Milestone 7 — Gmail Send/Reply (Steps 21–22)

### Step 21 — `lib/mime.js` — RFC 2822 raw message builder

**Files:** `web/lib/mime.js`

- `buildRaw({ to, from, subject, body, inReplyTo, references, threadId })`:
  - Encode subject: if it contains non-ASCII, wrap in `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`.
  - Build headers string with CRLF (`\r\n`): `From`, `To`, `Subject`, `MIME-Version`, `Content-Type: text/plain; charset=UTF-8`, and optionally `In-Reply-To`, `References`.
  - Append `\r\n\r\n` + body.
  - Return `Buffer.from(fullMessage).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')` (base64url, no padding).

**Why a separate file?** MIME encoding has tricky edge cases. Isolating it means it can be unit-tested without a live Gmail connection.

**Verify:** `buildRaw({ to:'a@b.com', subject:'Test', body:'Hello' })` produces a valid base64url string that decodes to a valid MIME message.

---

### Step 22 — Gmail send route + ComposeModal + Reply wiring

**Files:** `web/app/api/gmail/send/route.js`, `web/components/email/ComposeModal.js`, `web/lib/slices/emailSlice.js` (`sendEmail` thunk)

- `POST /api/gmail/send`:
  - Parse body `{ to, subject, body, threadId?, inReplyTo?, references? }`.
  - Validate: `to` is a valid email regex, `body` is non-empty, length < 100 KB.
  - `buildRaw(...)` from `lib/mime.js`.
  - `gmail.users.messages.send({ userId:'me', requestBody: { raw, threadId } })`.
  - Return `{ ok: true, id: response.data.id }`.
- `sendEmail` thunk: sets `sending: true`, POST `/api/gmail/send`, on success show toast + reload thread if it was a reply, on failure set `error`.
- `ComposeModal.js`: modal overlay. Fields: To, Subject, Body textarea. Send button (disabled while `sending`). On success toast "Email sent!" + close modal.
- `ThreadView.js` Reply: wired to `sendEmail` with `inReplyTo` and `references` from the last message in the thread.

**Verify: Milestone 7 acceptance** — Send a compose email → recipient receives it. Reply to a thread → appears in the same thread in Gmail.

---

## Milestone 8 — Polish, Error States, Responsive (Steps 23–26)

### Step 23 — Open/Resolved status + search/filter in WhatsApp

**Files:** `web/components/whatsapp/ChatList.js` (wire filter), `web/lib/slices/whatsappSlice.js` (selector)

- Add a `selectFilteredChats` selector: filter `chatOrder` by `filter` (`chatStatus[id] === 'open'` etc.) and then by `search` (case-insensitive match on `name` or `lastMessage.body`).
- The header Open/Resolved toggle in `ChatThread.js` dispatches `setChatStatus` and persists to `localStorage`.
- Filter tabs in `ChatList.js` highlight the active tab.
- **Verify:** Mark a chat Resolved → it disappears from Open tab; switch to Resolved tab → it appears.

---

### Step 24 — Empty states + error banners across all pages

**Files:** All page and component files (minor additions)

- WhatsApp page: if `chatOrder.length === 0 && !loading` → "No chats yet. Make sure WhatsApp is connected."
- WhatsApp page: if `wa.state !== 'ready'` → full-page empty state with a prominent link to Connections.
- Email page: if `!gmail.connected` → empty state with link to Connections.
- Email page: if `threads.length === 0 && !loading` → "Your inbox is empty."
- Gmail 401 from any route → `emailSlice` sets `error: 'reconnect'` → banner "Gmail session expired. Reconnect Gmail." with a button.
- WA server unreachable: the socket `connect_error` event (registered in `socket.js`) dispatches `setWaStatus({ state:'disconnected', error:'WhatsApp server not reachable (is server/ running?)' })` → shown in WhatsApp card and WhatsApp page.

**Verify:** Stop the WA server → error banner appears. Stop being logged in → empty state appears.

---

### Step 25 — Responsive layout (mobile single-pane)

**Files:** `web/app/whatsapp/page.js`, `web/app/email/page.js`, `web/components/whatsapp/ChatList.js`, `web/components/email/ThreadList.js`

- Add a local `showList` boolean state to each page. On mobile (`< md`): show list when `activeChatId === null`, show thread when a chat is selected.
- The `ChatThread` / `ThreadView` header shows a `←` back button on mobile that sets `activeChatId = null` / `activeThreadId = null`.
- Use Tailwind `hidden md:block` / `block md:hidden` + conditional render.
- **Verify:** Resize browser to 375 px → list shows; select a chat → list hides, thread shows; back arrow → list returns.

---

### Step 26 — (Stretch) Convert to Task drawer

**Files:** `web/components/whatsapp/TaskDrawer.js`, `web/lib/slices/whatsappSlice.js` (add `tasks: []`)

- Add `tasks` array and `addTask({ text, chatId, chatName })` action to `whatsappSlice`.
- `MessageBubble.js`: right-click context menu (or long-press on mobile) → "Convert to Task".
- `TaskDrawer.js`: slide-in panel from the right; lists tasks with source chat name, timestamp, delete button.
- A bell/task icon in the WhatsApp page header toggles the drawer.
- Tasks are stored in Redux only (in-memory, reset on refresh).

**Verify:** Right-click a message → "Convert to Task" → appears in the drawer.

---

## Milestone 9 — Final Checks + README (Steps 27–30)

### Step 27 — `npm run build` + lint fixes in `web/`

**Files:** Any file with lint errors surfaced by `next build`

- Run `cd web && npm run build`.
- Fix any missing `key` props, unused imports, unescaped HTML entities (`&apos;`, etc.), and missing `alt` attributes.
- Fix any `"use client"` directives that are missing on components using browser APIs or Redux hooks.
- Fix any server components accidentally importing `socket.js` (would break — socket is client-only).
- **Goal:** zero errors, zero warnings in build output.

**Verify:** `next build` exits 0.

---

### Step 28 — Security audit pass

**Files:** All route handlers, `socket.js`, `google.js`

- Confirm: no `console.log` with token values or message bodies.
- Confirm: `GOOGLE_CLIENT_ID/SECRET` never sent to the browser (only used in server-side route handlers).
- Confirm: `gmail_session` cookie has `httpOnly: true`, `sameSite: 'lax'`.
- Confirm: `/api/gmail/send` validates `to` (regex), `body` non-empty, length limit.
- Confirm: WA server `cors` origin is exactly `WEB_ORIGIN`, not `*`.
- Confirm: `NEXT_PUBLIC_WA_SERVER_URL` is the only env var with `NEXT_PUBLIC_` prefix (the only one that should be visible in the browser bundle).

**Verify:** Browser Network tab: no requests expose tokens; no env var values beyond the WA server URL in JS bundles.

---

### Step 29 — End-to-end smoke test (full flow)

**Files:** none (manual verification)

Run through this checklist:

| # | Check | Pass |
|---|---|---|
| 1 | QR renders at `/connections` without the server crashing | |
| 2 | Scanning QR flips card to "Connected as …" | |
| 3 | WhatsApp page shows real chats | |
| 4 | Clicking a chat shows history; unread badge clears | |
| 5 | Sending from app arrives on phone with ✓✓ then blue ✓✓ | |
| 6 | Sending from phone appears live in app | |
| 7 | Open/Resolved toggle persists across refresh | |
| 8 | Filter tabs work; search filters by name/body | |
| 9 | "Connect Gmail" → consent → card shows email | |
| 10 | Gmail inbox shows real threads with unread dots | |
| 11 | Click thread → readable body in right pane | |
| 12 | Reply → appears in Gmail thread on phone/web | |
| 13 | Compose → new email arrives at recipient | |
| 14 | "Load more" fetches next page of threads | |
| 15 | Stop WA server → error banner, no crash | |
| 16 | `next build` exits 0 | |

---

### Step 30 — `README.md` + Demo Script

**Files:** `/README.md`

Write the full README per spec §15:

1. **What it is** — one paragraph.
2. **Architecture diagram** (ASCII art matching spec §4).
3. **Prerequisites** — Google Cloud Console steps (verbatim from spec §7), Node 18+ requirement, WhatsApp spare number recommendation.
4. **Install & Run** — two terminal blocks:
   ```bash
   # Terminal 1 — WhatsApp server
   cd server && cp .env.example .env  # fill in values
   npm install --legacy-peer-deps
   npm run dev

   # Terminal 2 — Next.js app
   cd web && cp .env.local.example .env.local  # fill in values
   npm install
   npm run dev
   ```
5. **Environment variable table** (all 7 vars from spec §6).
6. **Unofficial WhatsApp disclaimer** (verbatim from spec — use a spare number; production would use WABA/Cloud API).
7. **Known limitations** — no database, single-user, no media in WhatsApp, refresh tokens expire after 7 days in Testing mode.
8. **Screenshots** — placeholder text (real screenshots added after first full run).
9. **3-minute demo script** (spec §15).

---

## Summary Map: Files → Steps

| File | Step |
|---|---|
| Root `.gitignore`, `README.md` | 1, 30 |
| `web/` scaffold, `package.json`, `next.config.js` | 2 |
| `web/app/globals.css`, `tailwind.config.js` | 3 |
| `web/lib/store.js`, `*/slices/*.js` | 4, 11 |
| `web/app/providers.js`, `web/lib/socket.js` | 5 |
| `web/components/TopNav.js`, `Avatar.js`, `StatusPill.js`, page skeletons | 6 |
| `server/package.json`, `.env.example`, `index.js` stub | 7 |
| `server/waClient.js` | 8 |
| `server/index.js` socket handlers | 9 |
| `web/components/connections/WhatsAppCard.js` | 10 |
| `whatsappSlice.js` full logic | 11 |
| `web/app/whatsapp/page.js`, `ChatList.js` | 12 |
| `ChatThread.js`, `MessageBubble.js`, `Composer.js` | 13 |
| `socket.js` full wiring, `sendWaMessage` thunk | 14 |
| `web/lib/google.js` | 15 |
| `api/auth/google/route.js`, `callback/route.js`, `logout/route.js` | 16 |
| `api/gmail/profile/route.js`, `GmailCard.js`, `fetchGmailProfile` | 17 |
| `web/lib/gmailParse.js` | 18 |
| `api/gmail/threads/route.js`, `api/gmail/threads/[id]/route.js` | 19 |
| `email/page.js`, `ThreadList.js`, `ThreadView.js` | 20 |
| `web/lib/mime.js` | 21 |
| `api/gmail/send/route.js`, `ComposeModal.js`, `sendEmail` thunk | 22 |
| Open/Resolved + search/filter selectors | 23 |
| Empty states + error banners | 24 |
| Responsive single-pane layout | 25 |
| `TaskDrawer.js` + `addTask` action (stretch) | 26 |
| `next build` + lint fixes | 27 |
| Security audit | 28 |
| Smoke test | 29 |
| `README.md` (complete) | 30 |
