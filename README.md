# Brooklyn Closet

An AI-powered wardrobe and outfit planner. Upload photos of your clothes, tell it what your
week looks like, and it builds a weekly outfit plan factoring in the weather — then learns your
taste from the outfits you upvote or downvote.

## Features

- **Wardrobe upload + AI auto-tagging** — drop in photos of your clothes; each item gets tagged
  with category, color, pattern, style, warmth, and formality.
- **Chat-based context** — describe your week ("client meetings Mon–Wed, a hike Saturday, dinner
  date Saturday night") and the assistant factors that into what it picks.
- **Weather-aware planning** — pulls a 7-day forecast for any location (current city or a trip
  destination) and adjusts warmth/layering accordingly.
- **Up/down voting** — vote on generated outfits; votes nudge item preference scores that bias
  future picks toward what you actually like.
- **Premium stylist stub** — a placeholder upgrade flow for a future "connect with a human
  stylist" + brand-partner product recommendations tier.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No login is required — this is a
single-user app for now.

## Wiring in real AI and weather APIs

By default the app runs entirely on deterministic mock logic (no API keys needed) so it works
out of the box. To switch on real calls, set these environment variables (e.g. in `.env.local`):

- `ANTHROPIC_API_KEY` — enables real Claude vision calls for clothing tagging
  (`src/lib/ai.ts`'s `classifyClothing`) and real chat-context understanding
  (`extractChatContext`). Without it, both fall back to deterministic mock logic.
- `OPENWEATHER_API_KEY` — enables real forecasts via OpenWeatherMap
  (`src/lib/weather.ts`'s `getWeatherForDate`). Without it, weather is a seeded mock forecast
  with realistic seasonal variation.

Each integration point checks for its key at call time and falls back to mock data on failure,
so you can flip these on independently.

## Data storage

Wardrobe items, outfits, chat history, votes, and stylist requests are stored in a flat JSON
file at `data/db.json` (created automatically, gitignored). Uploaded photos are saved to
`public/uploads/`. This is intentionally simple for a single-user app — swap in a real database
before adding multi-user accounts.

## Project structure

- `src/lib/ai.ts` — clothing classification, chat context extraction, and the outfit-generation
  algorithm (weighs formality fit, weather/warmth fit, and learned preference scores).
- `src/lib/weather.ts` — weather forecast (mock + real OpenWeatherMap path).
- `src/lib/db.ts` / `src/lib/storage.ts` — JSON persistence and image file storage.
- `src/app/api/*` — REST endpoints for items, outfits, chat, weather, and stylist requests.
- `src/app/(pages)` — Dashboard (`/`), Closet (`/closet`), Premium (`/premium`).
