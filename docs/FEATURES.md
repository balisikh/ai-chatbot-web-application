# Features & architecture reference

Documentation for the AI Chatbot Web Application — use this when writing project docs, user guides, or deployment runbooks.

## Overview

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (`public/`) |
| Backend | Node.js, Express (`server.js`) |
| AI | Ollama (local), OpenAI (cloud), offline demo |
| Voices / translation | Google Cloud TTS + Translation (optional) |
| Chat history | Browser `localStorage` (per device) |

Default URL: `http://localhost:3567`

---

## Chat

- Streaming replies, markdown, code blocks, tables
- Multiple conversations (sidebar, search, tags, pin, rename)
- Regenerate, edit & resend, export (MD/TXT/JSON)
- **Rate limiting** on `POST /api/chat` (default 40 requests / 15 min per IP; env: `CHAT_RATE_MAX`, `CHAT_RATE_WINDOW_MIN`)

---

## Languages & speech

- 26 language quick-setup chips (incl. Spanish Mexico `es-MX`)
- Google + browser voices when `GOOGLE_CLOUD_TTS_API_KEY` is set
- Translate user messages → English for the AI
- **Replies in user language:**
  - **With Google:** post-translate English replies (`replyInUserLanguage` setting)
  - **Without Google:** system-prompt instructs the model to reply in the voice/source language
- Detected-language badges on user messages
- Read aloud: 🔊 stop + separate ▶/⏸ play/pause per reply

---

## File attachments (`POST /api/attach/extract`)

| Format | Method |
|--------|--------|
| PDF | `pdf-parse` |
| Word `.docx` | `mammoth` |
| Word `.doc` | `officeparser` |
| PowerPoint `.pptx` | `JSZip` + slide XML |
| PowerPoint `.ppt` | `officeparser` |
| Excel `.xlsx` / `.xls` | `xlsx` |
| PNG, JPEG, GIF, WebP, BMP | OpenAI vision (`OPENAI_API_KEY`) |
| SVG | Text extraction from SVG XML |
| Plain text / code | UTF-8 read |

Max upload: 15 MB. Text truncated to ~30k characters for context.

Rate limit: `API_RATE_MAX` (default 120 / 15 min) on attach, translate, and TTS.

---

## Chat history

Conversations are stored in the browser (`localStorage`), not on the server. Use **Export** in the header to back up chats as JSON.

---

## API summary

| Endpoint | Purpose |
|----------|---------|
| `POST /api/chat` | Stream chat (rate limited) |
| `GET /api/models` | AI provider + models |
| `GET /api/speech/voices` | Voice catalog |
| `POST /api/translate` | Google Translation |
| `POST /api/speech/synthesize` | Google TTS |
| `POST /api/attach/extract` | File text extraction |

---

## Testing & CI

```bash
npm start
npm test
npm run verify:google
```

GitHub Actions runs smoke tests on push to `main`.

---

## Related docs

- [README.md](../README.md) — setup
- [docs/GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md) — Google APIs
- [docs/DEPLOY.md](DEPLOY.md) — Vercel checklist
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) — project history
