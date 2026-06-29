# 🧠 Vibecode Editor – AI-Powered, Collaborative Web IDE

![Vibecode Editor Thumbnail](public/vibe-code-editor-thumbnaail.svg)

**Vibecode Editor** is a browser-based IDE built with **Next.js (App Router)**,
**WebContainers**, and the **Monaco Editor**. It runs real Node.js projects
entirely in the browser, offers **AI-powered code completion and chat** via the
**Google Gemini API**, and supports **real-time multiplayer editing** through a
Socket.io collaboration server.

---

## 🚀 Features

- 🔐 **OAuth Login with NextAuth v5** – Google & GitHub with automatic
  multi-provider account linking.
- 🧱 **Project Templates** – React, Next.js, Express, Hono, Vue, or Angular.
- 🗂️ **Custom File Explorer** – Create, rename, delete and manage files/folders,
  with open-tab and unsaved-change tracking (Zustand store).
- 🖊️ **Enhanced Monaco Editor** – Syntax highlighting, formatting, keybindings.
- 💡 **AI Code Completion (Gemini)** – Context-aware inline suggestions. The
  server analyses the surrounding code (language, framework, scope, incomplete
  patterns) before prompting the model. Trigger on `Ctrl + Space`, accept with `Tab`.
- 🤖 **AI Chat Assistant (Gemini)** – Ask for explanations, refactors and fixes.
- 👥 **Real-time Collaboration** – Share a playground link and edit together.
  Live presence (who's here / what file they're on) and code sync over WebSockets.
- 🎥 **Video/Audio Calls** – Built-in WebRTC mesh calling with mic/camera toggles.
- 🖌️ **Collaborative Whiteboard** – Shared canvas for sketching ideas together.
- ⚙️ **WebContainers Integration** – Run frontend/backend apps in-browser, with
  graceful fallback on unsupported browsers.
- 💻 **Interactive Terminal** – Embedded terminal via xterm.js.

---

## 🧱 Tech Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| Framework      | Next.js 15 (App Router) + custom Node server |
| Styling        | TailwindCSS, ShadCN UI                       |
| Language       | TypeScript                                   |
| Auth           | NextAuth v5 (Google + GitHub OAuth, JWT)     |
| Editor         | Monaco Editor                                |
| AI             | Google Gemini API (`gemini-1.5-flash`)       |
| Realtime       | Socket.io (custom server) + WebRTC           |
| Runtime        | WebContainers                                |
| Terminal       | xterm.js                                     |
| Database / ORM | MongoDB via Prisma                           |
| State          | Zustand                                      |
| Testing        | Vitest                                       |

---

## 🏗️ Architecture

```
                          ┌─────────────────────────────┐
                          │        Browser (client)      │
                          │  Monaco · WebContainers ·    │
                          │  Zustand store · socket.io-  │
                          │  client                      │
                          └───────┬─────────────┬────────┘
                                  │ HTTP        │ WebSocket
                                  ▼             ▼
              ┌───────────────────────────────────────────────┐
              │      Custom Node server (server.ts)            │
              │  ┌─────────────────┐   ┌────────────────────┐  │
              │  │  Next.js (SSR /  │   │  Socket.io server  │  │
              │  │  App Router /    │   │  /api/socket       │  │
              │  │  API routes)     │   │  RoomManager       │  │
              │  └────────┬─────────┘   └─────────┬──────────┘  │
              └───────────┼───────────────────────┼────────────┘
                          │                        │
              ┌───────────▼───────┐     ┌──────────▼──────────┐
              │  Gemini API        │     │  In-memory presence │
              │  (chat + complete) │     │  + code relay       │
              └────────────────────┘     └─────────────────────┘
                          │
              ┌───────────▼────────┐
              │  MongoDB (Prisma)  │
              └────────────────────┘
```

Why a **custom server**? Next.js route handlers run per-request and can't hold
the long-lived WebSocket connections collaboration needs. `server.ts` wraps
Next.js in a plain Node HTTP server and attaches Socket.io on the same origin
(`/api/socket`).

---

## 👥 Real-time Collaboration

- **Rooms**: one room per playground id. Open the same playground URL (via the
  **Share** button) to join.
- **Presence**: the header shows avatars of everyone in the room, with a live
  connection dot and the file each person is editing.
- **Sync**: local edits are broadcast to peers and applied through the file
  store. An echo guard prevents rebroadcast loops.
- **Conflict strategy**: currently **last-write-wins per file**. This is simple
  and predictable; the natural next step is a CRDT (e.g. Yjs + `y-monaco`) for
  true concurrent character-level merging — see the roadmap below.
- **Video/audio calls**: a **WebRTC mesh** (one peer connection per participant)
  signalled over the same socket. The server only does signalling —
  introducing peers and relaying SDP/ICE — while media flows directly P2P.
  Uses a public STUN server; cross-NAT calls would also need a TURN server.
- **Whiteboard**: a shared canvas. Strokes use normalised (0..1) coordinates so
  they render identically regardless of each peer's canvas size, and are stored
  server-side so late joiners can replay the current board.

The collaboration server logic is split into dependency-free, unit-tested
classes: [`RoomManager`](modules/collaboration/server/room-manager.ts) (presence),
[`CallRegistry`](modules/collaboration/server/call-registry.ts) (call membership),
and [`WhiteboardStore`](modules/collaboration/server/whiteboard-store.ts).

---

## 🔒 Security

- **Auth on AI routes**: `/api/chat` and `/api/code-completion` require an
  authenticated session (401 otherwise).
- **Rate limiting**: a fixed-window [rate limiter](lib/rate-limit.ts) caps usage
  per user (20/min chat, 60/min completions) and returns `X-RateLimit-*`
  headers. Swap the in-memory store for Redis to scale across instances.

---

## 🧪 Testing

[Vitest](https://vitest.dev/) covers the core logic (65 tests):

```bash
npm test          # run once
npm run test:watch
```

Covered: the rate limiter, AI code-context analysis, file-path utilities, the
Zustand file-explorer store, and the collaboration server classes
(`RoomManager`, `CallRegistry`, `WhiteboardStore`).

---

## 🛠️ Getting Started

### 1. Clone & install

```bash
git clone https://github.com/AkGoyal2111/VibeCodeEditor.git
cd VibeCodeEditor
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your credentials (see [`.env.example`](.env.example)):

```env
DATABASE_URL=your_mongodb_connection_string
AUTH_SECRET=your_auth_secret
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Run the dev server (Next.js + Socket.io)

```bash
npm run dev
```

Visit `http://localhost:3000`.

> The app runs through a **custom Node server** (`server.ts`) to host Socket.io.
> Because of this it needs a long-running Node host (Render, Railway, Fly.io, a
> VM/container) rather than a purely serverless platform. `npm run dev:next` is
> available if you want plain Next.js without collaboration.

---

## 🎯 Keyboard Shortcuts

* `Ctrl + Space` / `Double Enter` – Trigger AI suggestions
* `Tab` – Accept AI suggestion
* `Ctrl + S` / `Ctrl + Shift + S` – Save / Save all

---

## 🗺️ Roadmap

- [ ] CRDT-based concurrent editing (Yjs + `y-monaco`) with live remote cursors
- [ ] TURN server so video calls work across restrictive NATs
- [ ] Redis-backed rate limiting + presence for horizontal scaling
- [ ] E2E tests (Playwright) for the editor and collaboration flows
- [ ] Live demo deployment

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

* [Monaco Editor](https://microsoft.github.io/monaco-editor/)
* [WebContainers](https://webcontainers.io/)
* [Socket.io](https://socket.io/)
* [Google Gemini](https://ai.google.dev/)
* [xterm.js](https://xtermjs.org/)
* [NextAuth.js](https://next-auth.js.org/)
