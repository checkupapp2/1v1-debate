# Who's Better 1v1? — Check-Up

Viral basketball 1v1 debate web app. Powered by Check-Up — The Basketball Network.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- Firebase Firestore (reuses existing `checkupv2` project)
- Anthropic Claude API — pre-generation only, never live
- YouTube Data API — reuse the existing Check-Up Google Cloud key
- Hosting: Netlify, connected to `checkupapp2/1v1-debate`

## Local setup

```bash
cd ~/1v1-debate
npm install
# add YOUTUBE_API_KEY and ANTHROPIC_API_KEY to .env.local (Firebase keys already in)
npm run seed                # one-time: seed players into Firestore
npm run generate-analysis   # one-time / on new players: pre-generate Claude analysis
npm run dev                 # http://localhost:3000
```

## Architecture
- Players, matchups, votes, comments all live in Firestore.
- AI analysis is **pre-generated** by `scripts/generate-analysis.mjs` and stored in `matchups/{id}`.
  No Claude calls happen on user votes.
- YouTube video IDs are fetched once per player on first vote and cached on the player doc — zero
  API calls after that.
- Local-only vote history tracked in `localStorage` for Mt. Rushmore.

## Cost math
- 27 seed players → 351 unique matchups
- ~$0.003 per Claude Haiku call ≈ **~$1.05** total first run
- Adding 1 player adds ≤ N new matchups (one for each existing player). Idempotent — re-runs skip
  already-generated matchups.

## Pages
- `/` — random matchup, era filter, weekly king banner, voting flow, 3-layer reveal
- `/matchup/[id]` — shareable matchup page with OG card
- `/rushmore` — your top 4 picks
- `/api/og` — share image generator (1200x630)
- `/api/weekly-king` — last-7-day vote leader

## Deploying to Netlify
1. Push to `checkupapp2/1v1-debate` on GitHub.
2. Netlify → New site from Git → pick repo. Build cmd `next build`, publish `.next`.
3. Set env vars (Firebase + YouTube + Anthropic + `NEXT_PUBLIC_SITE_URL`).
4. Point `1v1.checkupbasketball.com` at the Netlify site.

## Brand
Orange `#F9A825`, Black `#1E1E1E`, White `#FFFFFF`. Every share card carries
"Check-Up — The Basketball Network".
