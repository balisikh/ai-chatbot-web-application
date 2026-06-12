# Google Cloud setup (voices + translation)

Use this when you want **Google voices for all supported languages** (male + female per language), **translation** (your language → English for the AI), and **read-aloud** (English reply → your language in the voice you pick). Works for typing and **microphone** input.

## What the key enables

| Feature | API |
|--------|-----|
| Google voices in Settings | Cloud Text-to-Speech |
| Translate messages to English | Cloud Translation |
| Translate replies for read-aloud | Cloud Translation |
| `POST /api/speech/synthesize` | Cloud Text-to-Speech |

One **API key** covers both APIs.

## Steps

### 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (or pick an existing one).

### 2. Enable APIs

In **APIs & Services → Library**, search and enable:

- **Cloud Text-to-Speech API**
- **Cloud Translation API**

### 3. Create an API key

1. **APIs & Services → Credentials**
2. **Create credentials → API key**
3. Copy the key (restrict it in production: limit to the two APIs above).

### 4. Add to this project

1. Copy `.env.example` to `.env` if you have not already.
2. Set:

   ```env
   GOOGLE_CLOUD_TTS_API_KEY=your_key_here
   ```

3. Restart the server:

   ```bash
   npm start
   ```

4. Hard refresh the app in your browser (`Ctrl+Shift+R`).

### 5. Verify

1. Open **Settings** — badge should show **Google online**; translation toggles enabled.
2. Under **Quick setup — languages**, each language should offer **female** and **male** chips (e.g. `Tamil — female`, `Tamil — male`).
3. Click a chip → **Save** → speak or type in that language; enable **Read aloud** and **Translate** toggles.
4. Voice dropdown lists **Google —** groups with **Male / Female (Wavenet)** labels.
5. Optional: run `npm test` — tests report whether Google voices are active.

## Costs

- Google offers free tiers for TTS and Translation; usage beyond that is billed per character.
- Monitor usage in Google Cloud Console → **Billing**.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Translation toggles disabled | Key missing or empty in `.env`; restart server after editing |
| No Google voices in dropdown | Same as above; check server console for errors |
| `403` or `API not enabled` | Enable both APIs in Cloud Console |
| Voices work but translation fails | Enable Cloud Translation API specifically |

## Browser Punjabi without Google

Install **Punjabi (India)** speech in Windows (**Settings → Time & language → Language**), restart the browser, then pick **Browser — Punjabi** in Settings. Translation still needs the Google key.
