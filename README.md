# AI Chatbot Web Application

A simple AI chatbot web application: a plain **HTML / CSS / JavaScript** frontend and a small **Node.js / Express** backend that talks to **OpenAI's** language models.

The chat interface runs in the browser, while your secret API key stays safe on the server.

## How it works

```
Browser (chat UI)  ─►  Express server  ─►  OpenAI API
   public/*.* files       server.js          (the AI model)
```

1. You type a message in the browser (`public/`).
2. The frontend sends the conversation to the backend (`/api/chat`).
3. The backend forwards it to OpenAI using your secret key.
4. The AI's reply is returned and displayed in the chat.

## Project structure

```
ai-chatbot-web-application/
├── public/            # Frontend (what the browser loads)
│   ├── index.html     # Page structure
│   ├── styles.css     # Styling
│   └── app.js         # Chat logic in the browser
├── server.js          # Node.js/Express backend + OpenAI call
├── package.json       # Project info & dependencies
├── .env.example       # Template for your environment variables
└── .gitignore
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your OpenAI API key

Copy the example env file and fill in your key:

```bash
copy .env.example .env   # Windows
# cp .env.example .env    # macOS/Linux
```

Then open `.env` and set `OPENAI_API_KEY` to your real key from
<https://platform.openai.com/api-keys>.

### 3. Start the server

```bash
npm start
```

Then open <http://localhost:3000> in your browser and start chatting.

> Tip: use `npm run dev` to auto-restart the server when you edit `server.js`.

## Notes

- **Keep your API key secret.** It lives only in `.env` (which is git-ignored) and is used on the server — never in the browser.
- **Costs:** OpenAI charges per token (chunk of text). `gpt-4o-mini` is a low-cost default. Monitor usage in your OpenAI dashboard.
- **Customizing personality:** edit the `SYSTEM_PROMPT` in `server.js` to change how the bot behaves.

## License

MIT
