# AI Chatbot Web Application

A full-featured AI chatbot: **HTML / CSS / JavaScript** frontend and a **Node.js / Express** backend. Chat works with **Ollama** (free local AI), optional **OpenAI**, optional **Google Cloud** voices and translation, and an **offline demo** fallback.

Secrets stay on the server — never in the browser.

## Features

- Streaming replies, markdown, code blocks, tables, export (MD/TXT/JSON)
- Multiple conversations (sidebar, search, tags, pin, rename)
- Settings: personality presets, temperature, length, themes, accents
- Voice input (mic) and read-aloud (TTS)
- **Google + browser voices** — English accents and many languages (incl. Punjabi)
- **Translation** — your language → English for the AI; English → voice language for speech
- **Punjabi chat mode** — one-click settings preset in the modal
- File attachments (PDF, Word `.docx`, Excel, text/code — extracted on the server), regenerate, edit & resend, usage estimates
- **26 popular languages** in Settings quick-setup (incl. Spanish Mexico), with in-app “How to use languages” help
- Responsive layout (phone drawer, tablet, desktop)

## How it works

```
Browser (public/)  ──►  Express (server.js)  ──►  Ollama / OpenAI
                              │
                              ├──► Google TTS + Translation (optional)
                              └──► Offline demo (no AI installed)
```

## Project structure

```
ai-chatbot-web-application/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js           # Frontend (monolithic)
├── server.js            # API + AI providers + Google TTS/translate
├── tests/smoke.mjs      # Automated smoke tests (also run in GitHub Actions on push)
├── docs/
│   ├── GOOGLE_CLOUD_SETUP.md
│   └── DEPLOY.md
├── .env.example
└── package.json
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

**Minimum (local AI):** install [Ollama](https://ollama.com), then:

```bash
ollama pull llama3.2:1b
```

Set `OLLAMA_MODEL=llama3.2:1b` in `.env` if needed.

**Optional OpenAI:** set `OPENAI_API_KEY` in `.env`.

**Optional voices + translation:** set `GOOGLE_CLOUD_TTS_API_KEY` — see [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md).

### 3. Start

```bash
npm start
```

Open the URL printed in the terminal (default `http://localhost:3000`).

```bash
npm run dev    # auto-restart on server.js changes
npm test              # smoke tests (server should be running, or start it first)
npm run verify:google # check Google TTS + Translation key (optional)
```

Push to `main` runs `npm test` automatically via GitHub Actions (see `.github/workflows/ci.yml`).

## Voice & translation quick start

### Punjabi chat (recommended preset)

1. Add Google API key (for translation + Google Punjabi voices) — see docs above.
2. Open **Settings** → click **Punjabi chat mode**.
3. Click **Save**.

You type Punjabi → AI gets English; replies can be read aloud in Punjabi.

### Manual setup

| Goal | Settings |
|------|----------|
| Type Punjabi, AI reads English | Translate to English + **Punjabi → English only** |
| See English under your messages | Show English translation |
| Hear replies in Punjabi | Read aloud + Translate English replies to voice language + Google/Browser Punjabi voice |

### All languages in the voice dropdown

Requires `GOOGLE_CLOUD_TTS_API_KEY`. Use the voice search box to filter by language or accent.

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/chat` | Stream chat (Ollama / OpenAI / offline) |
| `GET /api/models` | List available models |
| `GET /api/speech/voices` | Google + catalog metadata |
| `POST /api/translate` | Translate text (needs Google key) |
| `POST /api/speech/synthesize` | Google TTS audio (needs Google key) |
| `POST /api/attach/extract` | Extract text from PDF, `.docx`, Excel, plain text/code |

Deploy checklist: [docs/DEPLOY.md](docs/DEPLOY.md).

## Notes

- **API keys** live only in `.env` (git-ignored).
- **History** is stored in the browser (`localStorage`), not on the server.
- **Ollama on another drive:** set `OLLAMA_MODELS` before starting Ollama (see `.env.example`).
- **Customize default personality:** edit `SYSTEM_PROMPT` in `server.js` or use Settings.

## License

MIT
