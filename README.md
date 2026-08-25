# R.O.O.B.O.T. Financial Intelligence

Voice-first Roman Urdu market news dashboard for crypto, stocks, and forex.

## Local run

1. Copy `.env.example` to `.env`.
2. Add `GNEWS_API_KEY` for live news. Without it, the safe demo feed is used.
3. Add `OPENAI_API_KEY` for conversational AI. Optionally set `OPENAI_CHAT_MODEL`; the default is `gpt-4o-mini`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Vercel deployment

1. Import `Saifullahgg/roobot-finencial-intelligence` into Vercel.
2. Keep the framework preset as `Other`; no build command is required.
3. In Vercel Project Settings → Environment Variables, add `GNEWS_API_KEY`, `OPENAI_API_KEY`, and optionally `OPENAI_CHAT_MODEL` for Production, Preview, and Development as needed.
4. Deploy. Vercel serves the static dashboard and the serverless routes automatically:
   - `/api/news`
   - `/api/chat`
   - `/api/health`

Never commit `.env` or place the provider key in frontend JavaScript. The included `.gitignore` protects local secrets.

## Checks

Run `npm run check` to validate frontend, local server, shared service, and Vercel function syntax.
