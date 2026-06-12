# AI Chatbot Web Application — Project Plan & Documentation

_Last updated: 10 June 2026_

This document records **what** we are building, **why**, **how** it was produced, the
decisions we made along the way, the current status, and the steps that remain.

---

## 1. Project Overview

An **AI chatbot web application**: a website where a user types a message and an
AI responds in natural language. It has three layers:

1. **Frontend (chat interface)** — what the user sees in the browser.
2. **Backend (server logic)** — receives messages and talks to the AI safely.
3. **AI model (the "brain")** — a Large Language Model (LLM) that generates replies.

```
User types  ─►  Frontend (browser)  ─►  Backend (server)  ─►  AI Model
User reads  ◄──  Frontend (browser)  ◄──  Backend (server)  ◄──┘
```

---

## 2. Objectives (Why We Are Building It)

- Provide instant, conversational help through a simple web page.
- Learn the full structure of a real web application (frontend + backend + AI).
- Keep secrets (API keys) safe on the server, never in the browser.
- Start simple and working, then add features incrementally.

---

## 3. Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend approach | Plain **HTML / CSS / JavaScript** | Easiest to start and understand |
| Backend | **Node.js + Express** | Lightweight, popular, matches JS frontend |
| AI provider (initial) | **OpenAI (GPT)** | Industry standard, easy API |
| AI provider (revised) | **Ollama (free local AI)** | No API key, no cost, fully private |
| Default model | `llama3.2` (small, local) | Fast on a normal computer, free |

> **Note:** We started with OpenAI but switched to a free **local** model (Ollama)
> so the app can run without a paid API key. See Section 8 for status.

---

## 4. Architecture & Technology Stack

| Layer | Technology |
|-------|------------|
| Browser UI | HTML5, CSS3, vanilla JavaScript |
| Web server | Node.js (v22), Express |
| AI connection | OpenAI-compatible API client |
| AI runtime | Ollama (local) — _OpenAI as alternative_ |
| Config | dotenv (`.env` file) |
| Runtime check | npm scripts (`start`, `dev`) |

---

## 5. File Structure

```
ai-chatbot-web-application/
├── public/             # Frontend (loaded by the browser)
│   ├── index.html      # Page structure: header, messages, input form
│   ├── styles.css      # Dark, modern chat styling
│   └── app.js          # Browser logic: capture input, call server, show replies
├── server.js           # Express server + AI connection (guards the secret key)
├── package.json        # Project info, scripts, dependencies
├── .env                # Local secrets/config (NOT committed to git)
├── .env.example        # Template showing required environment variables
├── .gitignore          # Excludes node_modules and .env from git
├── README.md           # Setup & run instructions
└── PROJECT_PLAN.md     # This document
```

---

## 6. How It Works (Behind the Scenes)

1. User types a message and presses **Send** (`public/app.js`).
2. The message is shown on screen and added to a `history` list (so the AI
   remembers context). A temporary "Thinking..." bubble appears.
3. The frontend sends the whole conversation to the backend at `/api/chat`.
4. The backend (`server.js`) adds a **system prompt** (the bot's personality)
   and forwards everything to the AI model — keeping any secret key server-side.
5. The AI generates a reply, which travels back to the browser.
6. The "Thinking..." bubble is replaced with the real answer, and the reply is
   saved to history for the next turn.

**Why a backend at all?** So the secret API key never appears in the browser
where anyone could steal it. The server is a safe middleman.

---

## 7. Development Phases (What We Did, In Order)

| Phase | Step | Status |
|-------|------|--------|
| 1 | **Discover** — checked empty workspace, gathered requirements | Done |
| 2 | **Decide** — chose simple stack + OpenAI + build now | Done |
| 3 | **Verify environment** — confirmed Node.js v22 & npm 11 | Done |
| 4 | **Scaffold** — created `package.json` (project blueprint) | Done |
| 5 | **Backend** — wrote `server.js` (server + AI call) | Done |
| 6 | **Frontend** — wrote `index.html`, `styles.css`, `app.js` | Done |
| 7 | **Config & docs** — added `.env.example`, `.gitignore`, `README.md` | Done |
| 8 | **Install & test** — ran `npm install`, started server (HTTP 200) | Done |
| 9 | **Run live** — confirmed the chat UI renders at localhost:3000 | Done |
| 10 | **Power the AI** — switching to free local AI (Ollama) | In progress |

Guiding principle: **foundation first, features later.**

---

## 8. Current Status

- **The web application is fully built and runs.** Visiting
  `http://localhost:3000` shows the complete chat interface.
- **The UI works without any key** — you can type, see your message, and the
  "Thinking..." indicator. Replies require an AI model to be connected.
- **AI replies are not yet live.** We are setting up **Ollama** (a free local AI)
  so no API key or payment is needed.
  - Ollama installation via `winget` did not complete (installer exit code 1).
  - Next attempt: install Ollama using its graphical installer, then download a
    small model and point the server at it.

---

## 9. Testing Approach

- **Smoke test:** start the server and confirm it boots without crashing
  (prints `running at http://localhost:3000`). ✅ Passed.
- **HTTP test:** request the home page and confirm `200 OK` + chat HTML served.
  ✅ Passed (1102 bytes, contains "AI Chatbot").
- **End-to-end test (pending):** send a real message and receive an AI reply —
  blocked until the AI model (Ollama) is connected.

---

## 10. Setup checklist (current)

| Step | Status |
|------|--------|
| Ollama local AI (`OLLAMA_URL`, `ollama pull`) | ✅ Supported |
| OpenAI as optional cloud provider | ✅ Supported |
| Google TTS + Translation (all language voices) | ✅ Optional — see `docs/GOOGLE_CLOUD_SETUP.md` |
| `.env` configuration | ✅ `.env.example` template |
| Automated smoke tests (`npm test`) | ✅ `tests/smoke.mjs` |
| README + project docs | ✅ Updated |

**Your action items (not code):**

1. Copy `.env.example` → `.env` and set variables you need.
2. For Google voices/translation: paste `GOOGLE_CLOUD_TTS_API_KEY` and restart the server.
3. Run `npm start`, then `npm test` to verify.

---

## 11. Implemented Enhancements

These interactive/UX features have been built on top of the core app.

### Batch 1 — Chat experience & polish

- **Streaming replies** — answers appear word-by-word as the AI generates them.
- **Markdown rendering** — bold, italics, lists, headings, and code blocks
  (via a small built-in, dependency-free, offline-safe renderer).
- **Clear chat / New conversation** button.
- **Persistent history** — conversations are saved in the browser
  (`localStorage`) and survive a page refresh.
- **Copy-to-clipboard** button on each AI reply.
- **Light/dark theme toggle** (remembered between visits).
- **Suggested prompt chips** shown on an empty chat to help users start.
- **Stop-generation button** — cancel a streaming reply mid-way.
- **Message timestamps** on every message.

### Batch 2 — Product-grade features

- **Multiple conversations** — a sidebar lists saved chats; create, switch,
  delete, and auto-title each one. Each conversation is stored separately.
- **Editable bot personality** — a Settings panel lets the user rewrite the
  system prompt that shapes the bot's behavior (sent per request).
- **Model picker** — a header dropdown lists available models
  (auto-detected via the `/api/models` endpoint) and lets the user choose.
- **Voice input (speech-to-text)** — a mic button dictates a message and
  auto-sends it (browser Web Speech API; hidden if unsupported).
- **Read-aloud (text-to-speech)** — optional auto-spoken replies (toggle in
  Settings), plus a per-reply speaker button (\u{1F50A}) to read any message on
  demand and click again to stop. Settings also include a **voice picker**
  (from the voices installed on your system) and a **speaking-speed slider**
  (0.5x–2x), applied to both auto and on-demand speech.
- **Syntax highlighting + copy-code** — color-coded code blocks, each with its
  own copy button.
- **Regenerate** — re-roll the most recent AI reply.
- **Animated typing indicator** — bouncing dots while the AI is thinking.
- **Scroll-to-latest button** — appears when scrolled up in a long chat.

### Batch 3 — Power-user & content features

- **Personality presets** — pick from ready-made personas (Tutor, Coding
  assistant, Creative writer, Concise expert, Pirate, Default) in Settings;
  editing the prompt switches to a "Custom" persona.
- **Creativity slider (temperature)** — control how focused vs. imaginative
  replies are (0–1), sent per request.
- **Response length control** — Short / Medium / Long / Unlimited cap on reply
  size (mapped to `max_tokens` / Ollama `num_predict`).
- **Export chat** — download the active conversation as `.md`, `.txt`, or
  `.json` from the header Export menu, plus an **"All chats: backup (.json)"**
  option that bundles every conversation into one dated backup file
  (`ai-chat-backup-YYYY-MM-DD.json`).
- **Rename conversations** — pencil button on each sidebar item for inline
  editing of the title.
- **Pin / favorite conversations** — star button keeps important chats sorted
  to the top of the sidebar.
- **Search across conversations** — sidebar search box filters chats by title
  or message content.
- **Edit & resend** — an Edit button on any of your messages reloads it into the
  input and truncates the chat from that point, so you can re-ask.
- **File/document upload** — attach PDF, Word (`.docx`), Excel (`.xlsx`/`.xls`),
  or plain text/code (`.txt`, `.md`, `.csv`, `.json`, etc.). Text is extracted
  on the server via `POST /api/attach/extract` (`pdf-parse`, `mammoth`, `xlsx`)
  and sent as context (large files are truncated). Legacy `.doc`, PowerPoint,
  and images are not supported yet.
- **Themes & accent colors** — six color themes (Dark, Light, Midnight, Forest,
  Solar, Rose) selectable in Settings or by cycling with the header button, plus
  a custom accent-color picker. Choices persist between visits.
- **Word / character counter** — a small live count under the input box that
  appears as you type (with a soft warning past ~4000 characters) and hides
  when the box is empty.
- **Markdown tables** — GitHub-style tables (with column alignment) now render
  as real tables inside replies.
- **Keyboard shortcuts** — `Ctrl/Cmd+K` new chat, `Ctrl/Cmd+/` focus search,
  and `Esc` to stop a reply / close the modal / close the export menu / close
  the mobile drawer.
- **Retry on error** — failed replies show a red bubble with a Retry button
  (and stop generation cleanly).
- **Thumbs up / down feedback** — rate any reply; the choice is saved per
  message and can be toggled off.
- **Toast confirmations** — small pop-ups confirm actions like "Copied to
  clipboard", new chat, and feedback.
- **Token / usage counter** — each message shows an estimated token count
  (~4 chars per token) and the header shows the conversation's running total,
  so you can see how big replies and chats are getting.
- **Auto-scroll toggle + "new messages" indicator** — choose whether the view
  follows new text (Settings). With it off, a "New messages" button appears when
  replies arrive while you've scrolled up.
- **Conversation tags** — label chats with tags (the tag button on each chat),
  see them as chips in the sidebar, and filter the list by clicking a tag in the
  filter bar (works together with search).
- **Responsive design** — adapts to phones, tablets, and large screens:
  - On phones the app goes full-screen and the sidebar becomes a slide-in
    drawer with a tap-away backdrop (auto-closes when you pick/create a chat).
  - The header shrinks gracefully (smaller controls, title truncates) and the
    decorative status dot hides on very small screens.
  - Uses dynamic viewport height (`dvh`) so mobile browser bars don't clip the
    input, 16px input font to stop iOS zoom-on-focus, wider layout on large
    monitors, and respects `prefers-reduced-motion`.

### Backend support added across batches

- `/api/chat` accepts optional `model`, `systemPrompt`, `temperature`, and
  `maxTokens` per request (applied to both the OpenAI and Ollama providers).
- `GET /api/models` reports the active provider and selectable models
  (from Ollama's `/api/tags`, or a static OpenAI list).
- `GET /api/speech/voices` — Google voice catalog (cached) + browser metadata.
- `POST /api/translate` — Cloud Translation (needs Google API key).
- `POST /api/speech/synthesize` — Google TTS MP3 (needs Google API key).

### Batch 4 — Multilingual voice & translation

- **Google Cloud TTS** — dynamic voice catalog; English accents; Punjabi male/female;
  all languages when API key is set.
- **Browser voices** — grouped by language; dedicated **Browser — Punjabi** section.
- **Translation toggles** — user messages → English for the AI; optional English
  translation badge under messages; English replies → voice language for speech.
- **Source language picker** — e.g. **Punjabi → English only** (other languages unchanged).
- **Punjabi chat mode** — one-click preset in Settings (voice + translation + read-aloud).
- **Responsive polish** — tablet drawer at 960px, safe areas, 44px touch targets.
- **Docs** — `README.md`, `docs/GOOGLE_CLOUD_SETUP.md`, smoke tests.

## 12. Future Enhancements (Optional)

- **Deploy online** (e.g. Render, Railway) so others can use it.
- **Persist history in a database** (instead of just the browser).
- **LaTeX/math** rendering in replies.
- **Image generation** from prompts.
- **User accounts** and per-user saved chats.
- **Rate limiting** to protect the server from abuse.
- **Install as a PWA** (installable, works offline).
- **Gentle frontend module split** (`voice.js` / `chat.js` as script tags, no build step).

---

## 13. Glossary (Quick Reference)

- **LLM** — Large Language Model; the AI that generates text.
- **Prompt** — the text/instructions sent to the model.
- **System prompt** — hidden instruction that sets the bot's behavior.
- **Token** — a chunk of text the model processes (billing unit for paid APIs).
- **Context window** — how much text the model can consider at once.
- **API key** — secret credential to access a paid AI service; kept server-side.
- **Ollama** — software that runs AI models locally, for free, on your computer.
```
