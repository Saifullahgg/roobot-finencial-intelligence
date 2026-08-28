# R.O.O.B.O.T. Financial Intelligence

Voice-first Roman Urdu market news dashboard for crypto, stocks, and forex.

## Local run

1. Copy `.env.example` to `.env`.
2. Add `GNEWS_API_KEY` for live news. Without it, the safe demo feed is used.
3. Run `npm start`.
4. Open `http://localhost:3000`.

The assistant conversation runs in the browser at no AI API cost. It understands common English and Roman Urdu intents, uses the current news feed for summaries, remembers recent exchanges locally, and speaks using the best available browser voice.

## Vercel deployment

1. Push this repository to GitHub. The `.gitignore` already excludes `.env`.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Keep the framework preset as **Other**; no build command is required.
4. In Vercel Project Settings → Environment Variables, add:
   - `GNEWS_API_KEY` — for live news. Without it, the safe demo feed is used.
5. Deploy. Vercel serves the static dashboard and the serverless routes automatically:
   - `/api/news` — live market news
   - `/api/market` — live crypto and forex data
   - `/api/intelligence` — events and airdrop radar
   - `/api/health` — provider status

Never commit `.env` or place provider keys in frontend JavaScript.

## Checks

Run `npm run check` to validate frontend, local server, shared service, and Vercel function syntax.
