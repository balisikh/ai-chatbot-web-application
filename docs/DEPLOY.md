# Deploy checklist (Vercel + Google voices)

## Before you deploy

### 1. Google Cloud (one-time, ~10 minutes)

You must do this in **your** Google account (we cannot create keys for you):

1. Enable [Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Enable [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
3. [Create an API key](https://console.cloud.google.com/apis/credentials)
4. Local: add to `.env`:

   ```env
   GOOGLE_CLOUD_TTS_API_KEY=your_key_here
   ```

5. Verify:

   ```bash
   npm run verify:google
   ```

### 2. Local smoke test

```bash
npm start
npm test
```

Settings should show **Google online** and female/male language chips.

### 3. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Name | Required for live site |
|------|------------------------|
| `GOOGLE_CLOUD_TTS_API_KEY` | Yes — all Google voices + translation |
| `OPENAI_API_KEY` | Yes — AI chat (Ollama does not run on Vercel) |
| `OPENAI_MODEL` | Optional (default `gpt-4o-mini`) |

Do **not** commit `.env` to GitHub.

### 4. Deploy

Push to GitHub; Vercel builds from `vercel.json` + `server.js`.

After deploy, open:

`https://your-app.vercel.app/api/speech/voices`

Expect: `"googleEnabled": true`, `"translateEnabled": true`

## Notes

- Ollama only works on your PC, not on Vercel.
- File attachments use server-side PDF parsing; keep uploads under ~4 MB on hobby tier.
- Restrict the Google API key to TTS + Translation APIs in production.
