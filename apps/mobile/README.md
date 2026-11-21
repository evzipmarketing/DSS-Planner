# DeepSkyMate mobile (`@dss/mobile`)

Expo Router app for iOS and Android. Reuses `@dss/core` and `@dss/data` for offline catalogue and planning. Online sky plates, weather, and geocoding call the Next.js APIs in `apps/web`.

## Setup

From the monorepo root:

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
```

Set:

- `EXPO_PUBLIC_API_URL` — deployed or local web origin, e.g. `http://localhost:3000` or your LAN IP for a physical device
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — optional until you enable accounts

Apply SQL in `supabase/migrations/20261121_mobile_accounts_lists.sql` for Auth + lists.

## Run

```bash
# terminal 1 — API host for sky/weather/place
pnpm --filter @dss/web dev

# terminal 2 — Expo
pnpm --filter @dss/mobile start
```

Then open iOS Simulator, Android emulator, or Expo Go.

## Tabs

- **Tonight** — location/date/gear setup, shortlist, target detail (facts, altitude, framing)
- **Lists** — favorites and named lists (local-first; sync when signed in)
- **Sky** — compass heading toward the selected target
- **You** — theme, magic-link auth, offline/API status
