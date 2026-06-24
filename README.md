# Brooklyn Closet

An AI-powered wardrobe and outfit planner. Upload photos of your clothes, tell it what your
week looks like, and it builds a weekly outfit plan factoring in the weather — then learns your
taste from the outfits you upvote or downvote.

## Features

- **Wardrobe upload + AI auto-tagging** — drop in photos of your clothes; the app detects each
  garment in the photo, crops it out, and asks you to confirm it before tagging category, color,
  pattern, style, warmth, and formality. You can edit any tag yourself at any time.
- **Conversational AI stylist with memory** — chat about your week ("client meetings Mon–Wed, a
  hike Saturday, dinner date Saturday night") and it remembers your taste (favorite/disliked
  colors and styles) across sessions, powered by Google Gemini.
- **Live weather planning** — pulls a real, free, no-API-key-required forecast (Open-Meteo) for
  any city you type, or your current location via the browser, and adjusts warmth/layering
  accordingly.
- **Delete with feedback** — removing an item asks you to rate it first, feeding that signal back
  into your preference profile.
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

Weather works live out of the box (Open-Meteo needs no API key). AI chat/tagging falls back to
deterministic mock logic until you add a free Gemini key. Set these in `.env.local`:

- `GEMINI_API_KEY` — get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
  Enables real Gemini vision calls for clothing detection (`src/lib/ai.ts`'s
  `detectClothingItems`) and real conversational chat with preference memory
  (`chatWithStylist`). Without it, both fall back to deterministic mock logic, so the app is
  still fully usable with zero setup.
- `GEMINI_MODEL` — optional, defaults to `gemini-2.0-flash`.
- `OPENWEATHER_API_KEY` — optional secondary weather source, only used if Open-Meteo is somehow
  unreachable. Not required — Open-Meteo (`src/lib/weather.ts`) is free, live, and keyless.

Each integration point checks for its key at call time and falls back to mock data on failure,
so you can flip these on independently.

## Data storage

Wardrobe items, outfits, chat history, votes, and stylist requests are stored in a flat JSON
file at `data/db.json` (created automatically, gitignored). Uploaded photos are saved to
`public/uploads/`. This is intentionally simple for a single-user app — swap in a real database
before adding multi-user accounts.

## Testing this as a mobile app (no Mac/Xcode required)

The app is an installable [PWA](https://web.dev/explore/progressive-web-apps) — it ships a web
manifest (`src/app/manifest.ts`) and generated app icons (`src/app/icon.tsx`,
`src/app/apple-icon.tsx`, `src/app/icon-192/`, `src/app/icon-512/`), plus the meta tags needed for
iOS "standalone" mode (`src/app/layout.tsx`). This is the fastest way to try it on a phone, since it
needs no Apple Developer account, no Xcode, and no app store review.

1. **Deploy it somewhere reachable from your phone.** On [Replit](https://replit.com):
   - "Import from GitHub" → this repo → branch `claude/ai-wardrobe-outfit-app-e0pzyf`.
   - Replit auto-detects Node and reads the included `.replit` config; hit **Run**, or manually run
     `npm install && npm run dev -- -p 3000` in the Shell.
   - (Optional) Add `GEMINI_API_KEY` as a Replit **Secret** to use real AI detection and chat
     instead of the mock fallback — not required, and weather is already live with no key.
   - Replit gives you a public `https://*.replit.dev` URL once it's running.
2. **Open that URL on your iPhone in Safari** (or Chrome on Android).
3. Tap **Share → Add to Home Screen** (iOS) or use the **Install app** prompt (Android/Chrome).
   It now launches full-screen from your home screen icon like a native app, with no browser
   chrome — camera/photo uploads in the wardrobe step use your phone's native picker since
   `UploadDropzone` is a plain file input.

This is single-user/no-login, so anyone with the URL can use the same wardrobe — fine for testing
with friends, but don't share the link publicly.

## Native iOS app (Capacitor) — only if you need an actual App Store / TestFlight build

The web app can also be wrapped as a native iOS app via [Capacitor](https://capacitorjs.com), if
you eventually want a real App Store/TestFlight build rather than a home-screen PWA. Because this
app has server-side API routes and writes to a local JSON file + disk uploads, the iOS shell can't
bundle a static export — instead it points its WebView at a deployed instance of this Next.js app
(see `capacitor.config.ts`).

Building the iOS app requires a Mac with Xcode — it can't be done from this Linux environment, but
the Xcode project is already scaffolded under `ios/`. To build it:

1. Deploy this app (e.g. to Vercel or Replit) and get its HTTPS URL.
2. Set `CAPACITOR_SERVER_URL` to that URL and run `npm run cap:sync` to write it into the iOS
   project's config.
3. Run `npm run cap:open:ios` to open `ios/App/App.xcodeproj` in Xcode.
4. Set your Apple Developer Team in the App target's Signing & Capabilities tab, then build and
   run on a simulator or device.
5. To share with friends as a beta, use TestFlight — this requires an Apple Developer Program
   membership ($99/year); there's no free way to install on someone else's iPhone remotely.

Without `CAPACITOR_SERVER_URL` set, the shell defaults to `http://localhost:3000` for local
development against `npm run dev`.

## Project structure

- `src/lib/ai.ts` — clothing detection, conversational stylist chat with preference memory, and
  the outfit-generation algorithm (weighs formality fit, weather/warmth fit, learned preference
  scores, and item votes).
- `src/lib/gemini.ts` — thin REST client for the Gemini API used by `ai.ts`.
- `src/lib/weather.ts` — live weather forecast (Open-Meteo primary, OpenWeatherMap optional
  secondary, mock last resort).
- `src/lib/db.ts` / `src/lib/storage.ts` — JSON persistence and image file storage.
- `src/app/api/*` — REST endpoints for items, outfits, chat, weather, and stylist requests.
- `src/app/(pages)` — Dashboard (`/`), Closet (`/closet`), Premium (`/premium`).
