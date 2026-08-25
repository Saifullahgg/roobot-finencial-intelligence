# R.O.O.B.O.T. Financial Intelligence

Voice-first Roman Urdu market news dashboard for crypto, stocks, and forex.

## Local run

1. Copy `.env.example` to `.env`.
2. Add `GNEWS_API_KEY` for live news. Without it, the safe demo feed is used.
3. Run `npm start`.
4. Open `http://localhost:3000`.

The assistant conversation runs in the browser at no AI API cost. It understands common English and Roman Urdu intents, uses the current news feed for summaries, remembers recent exchanges locally, and speaks using the best available browser voice.

## Vercel deployment

1. Import `Saifullahgg/roobot-finencial-intelligence` into Vercel.
2. Keep the framework preset as `Other`; no build command is required.
3. In Vercel Project Settings → Environment Variables, add `GNEWS_API_KEY` for Production, Preview, and Development as needed.
4. Deploy. Vercel serves the static dashboard and the serverless routes automatically:
   - `/api/news`
   - `/api/health`

Never commit `.env` or place the provider key in frontend JavaScript. The included `.gitignore` protects local secrets.

## Checks

Run `npm run check` to validate frontend, local server, shared service, and Vercel function syntax.
