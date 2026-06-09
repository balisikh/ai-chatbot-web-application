# AI Chatbot Web Application — Project Plan & Documentation

_Last updated: 8 June 2026_

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

## 10. Remaining Steps

1. Install **Ollama** (free local AI runtime).
2. Adapt `server.js` to talk to Ollama's local endpoint
   (`http://localhost:11434`) instead of requiring an OpenAI key.
3. Update `.env` to select the local model.
4. Download a small model, e.g. `ollama pull llama3.2`.
5. Restart the server and run the end-to-end test (send a message, get a reply).

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
- **Read-aloud (text-to-speech)** — optional spoken replies (toggle in Settings).
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
  `.json` from the header Export menu.
- **Rename conversations** — pencil button on each sidebar item for inline
  editing of the title.
- **Pin / favorite conversations** — star button keeps important chats sorted
  to the top of the sidebar.
- **Search across conversations** — sidebar search box filters chats by title
  or message content.
- **Edit & resend** — an Edit button on any of your messages reloads it into the
  input and truncates the chat from that point, so you can re-ask.
- **File/document upload** — attach a text-based file (`.txt`, `.md`, `.csv`,
  `.json`, code, etc.); its contents are sent as context so you can ask
  questions about it (large files are truncated to keep within the context).
- **Themes & accent colors** — six color themes (Dark, Light, Midnight, Forest,
  Solar, Rose) selectable in Settings or by cycling with the header button, plus
  a custom accent-color picker. Choices persist between visits.

### Backend support added across batches

- `/api/chat` accepts optional `model`, `systemPrompt`, `temperature`, and
  `maxTokens` per request (applied to both the OpenAI and Ollama providers).
- `GET /api/models` reports the active provider and selectable models
  (from Ollama's `/api/tags`, or a static OpenAI list).

## 12. Future Enhancements (Optional)

- **Deploy online** (e.g. Render, Railway) so others can use it.
- **Persist history in a database** (instead of just the browser).
- **Markdown tables** and **LaTeX/math** rendering.
- **Image generation** from prompts.
- **Word/character counter**, **keyboard shortcuts**, **retry button**.
- **User accounts** and per-user saved chats.
- **Rate limiting** to protect the server from abuse.
- **Install as a PWA** (installable, works offline).

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
