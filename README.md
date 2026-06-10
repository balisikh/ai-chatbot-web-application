# AI Chatbot Web Application

A local-first AI chat web app: **HTML/CSS/JavaScript** frontend, **Node.js/Express** backend, and **Ollama** (or OpenAI) for replies. Optional **Google Cloud** powers multilingual voices and translation.

## Quick start

```powershell
cd "d:\Baljinder Documents\ai-chatbot-web-application"
npm install
npm start
```

Open **http://localhost:3567** (or the port in your `.env`).

## Configuration (`.env`)

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default **3567** in this project) |
| `OLLAMA_URL` | Local Ollama API (default `http://localhost:11434`) |
| `OLLAMA_MODEL` | Model name, e.g. `llama3.2:1b` |
| `OPENAI_API_KEY` | Optional cloud AI (leave placeholder to skip) |
| `GOOGLE_CLOUD_TTS_API_KEY` | Optional — all Google voices + translation |

### Ollama on drive D: (low disk space on C:)

1. Set environment variable `OLLAMA_MODELS=D:\OllamaModels` (or your path).
2. Install/start Ollama from `D:\Ollama` if needed.
3. Pull the model: `ollama pull llama3.2:1b`
4. Restart Ollama, then `npm start`.

### Google voices (English accents, Punjabi, all languages)

1. In [Google Cloud Console](https://console.cloud.google.com/), enable:
   - **Cloud Text-to-Speech API**
   - **Cloud Translation API**
2. Create an API key.
3. In `.env`:
   ```env
   GOOGLE_CLOUD_TTS_API_KEY=your_key_here
   ```
4. Restart the server. You should see: `Google TTS + Translation: enabled (...)`

Without the key, **English browser voices** still work; Google Punjabi and other languages need the key.

## Frontend structure

Code is split into ES modules under `public/js/`:

| File | Role |
|------|------|
| `storage.js` | `localStorage`, conversations |
| `voice.js` | TTS, voice picker, speech modes |
| `settings.js` | Settings modal, themes, export |
| `chat.js` | Messages, sidebar, streaming chat |
| `main.js` | Boot / startup |
| `app.js` | Entry (`import { boot } from "./js/main.js"`) |

## Speech modes (Settings)

One-click presets:

- **English (US)** / **English (UK)** — read in that accent
- **English reply + Punjabi speech** — AI gets English; replies shown in English; 🔊 speaks Punjabi

Your chosen voice per language is remembered in `voiceByLang` when you pick manually.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run server |
| `npm run dev` | Run with `--watch` (auto-restart on `server.js` changes) |

## Project docs

See `PROJECT_PLAN.md` for architecture, features, and history.
