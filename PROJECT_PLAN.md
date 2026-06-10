# AI Chatbot — Project Plan & Status

_Last updated: June 2026_

## Overview

Browser chat UI + Express server + pluggable AI (Ollama local, OpenAI cloud, offline demo). Optional Google Cloud for **all TTS languages** and **translation**.

**Run:** `npm start` → **http://localhost:3567** (see `.env` `PORT`).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, vanilla JS (ES modules) |
| Backend | Node.js, Express |
| AI | Ollama (default), OpenAI, offline fallback |
| Voice | Web Speech API + Google Cloud TTS |
| Translation | Google Cloud Translation API |
| Config | `.env` (not committed) |

## File layout

```
public/
  index.html, styles.css, app.js      # entry → js/main.js
  js/
    storage.js    # localStorage + conversations
    voice.js      # voices, TTS, speech modes
    settings.js   # settings UI, themes, export
    chat.js       # chat, sidebar, streaming
    main.js       # boot
    constants.js, state.js, dom.js, persistence.js, utils.js
server.js
.env
```

## Environment (this machine)

- **Port:** `3567`
- **Ollama:** `OLLAMA_MODELS` on `D:\OllamaModels` if C: is tight
- **Google:** set `GOOGLE_CLOUD_TTS_API_KEY` in `.env` (enable TTS + Translation APIs)

## Major features

- Streaming replies, markdown, code copy, tables
- Multiple conversations, search, tags, pin, rename
- Export chat / all-chats JSON backup
- Themes (6) + accent colors
- Settings: preset personalities, temperature, max tokens
- File + PDF upload
- Read-aloud + per-message speaker
- **Voice picker:** English accents, Google Punjabi, all Google languages, filter chips
- **Translation:** user → English for AI; optional English under messages; reply → voice language for speech
- **Quick speech modes:** English US/UK, English reply + Punjabi speech

## Remaining / optional

- PWA, deploy online, import backup JSON
- More automated tests in CI
- LaTeX/math in markdown

## Development phases (completed)

1. Core chat + Express + OpenAI scaffold  
2. Ollama local AI + model picker  
3. UX batches: streaming, sidebar, themes, export, tags, tokens  
4. Voice: browser TTS → Google Cloud all languages  
5. Translation pipeline + custom voice picker UI  
6. Code split into `public/js/*` modules + speech mode presets  
