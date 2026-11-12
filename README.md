# DSS Planner

A session planner for deep-sky imaging. Pick a site and a night, see which catalogue objects are actually up, check cloud cover, and preview how the target sits on the sensor of the rig you are using.

Phase 1 is a web app. Later phases add accounts, a private Panchang engine, and a native client. The astronomy and gear maths already live in a framework-free package so that work does not have to start over.

## What you can do

- Site and date, defaulting to Hyderabad (17.385° N, 78.4867° E, `Asia/Kolkata`). Presets cover a few other Indian cities, or you can type coordinates and an IANA timezone.
- A shortlist of deep-sky objects that reach at least 30° while the Sun is below −18°.
- Search by catalogue id (`M 42`, `NGC 224`, `LDN 1`) or common name.
- Catalogue details: J2000 RA/Dec, constellation, size, magnitude, type, and Lynds opacity when the object has one.
- An altitude chart for the target and the Moon, with the horizon and the usable window marked.
- A seeded list of telescopes, cameras, and filters, or your own values: aperture, focal length, reducer/Barlow factor, sensor size, pixel size, resolution, mono or colour, and filter kind (broadband, UV/IR cut, dual/tri/quad narrowband, Hα, OIII, SII, LRGB).
- Field of view, arcseconds per pixel, and a sampling note against a Bortle-based seeing assumption.
- A framing preview: DSS2 colour, north up, east left, sensor rectangle, catalogue ellipse, drag to pan, handle to rotate.
- Suggested sub length and total integration per selected filter and Bortle class.
- Hourly cloud cover, wind, and temperature for the night from Open-Meteo, cached for ten minutes.
- A dim red night-vision theme.
- The current rig, site, Bortle class, and night-vision choice persist in `localStorage`.

## Repository

```
apps/web          Next.js App Router UI
packages/core     Astronomy, optics, catalogue search, weather parsing, Panchang interface
packages/data     Catalogue JSON, seed gear, site presets
supabase          Phase 2 notes only
```

`apps/mobile` is reserved for phase 4 (Expo). It is not in the tree yet. `@dss/core` and `@dss/data` have no DOM dependency, so a React Native app can import them directly.

```
pnpm install
pnpm dev          # http://localhost:3000
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Node 20 or newer. The repo pins pnpm through the `packageManager` field.

## How the sky plate is loaded

The framing request goes to `apps/web/app/api/sky`. That route calls CDS [hips2fits](https://alasky.cds.unistra.fr/hips-image-services/hips2fits) for `CDS/P/DSS2/color` (TAN, ICRS, rotation 0, so north is up and east is left). If hips2fits does not answer, the same field is assembled from public JPEG tiles of that HiPS (MAST, IPAC, then ESA). Colour JPEG tiles deeper than order 7 are clipped, so the fallback stays at order 7 and small fields look softer than a hips2fits cutout. The caption under the frame says which path was used.

## Exposure heuristic

Sub length is the time for sky noise to reach about five times the camera’s nominal read noise. The electron rate uses a magnitude-0 photon zero point, the filter’s equivalent width, aperture, pixel scale, and a Bortle surface brightness. Total hours start from a per-filter baseline at Bortle 4 and f/5, then scale with sky flux and focal ratio squared. It is a planning guess, not a per-object signal-to-noise model.

Sampling compares arcseconds per pixel with an assumed seeing that only tracks Bortle class (about 1.5″ in class 1 to about 3.5″ in class 9). Bortle is sky brightness, not a seeing measurement.

## Data and licences

| Data | Use in the app | Licence / credit |
| --- | --- | --- |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC) NGC, IC, addendum | Positions, sizes, magnitudes, common names, Messier numbers | CC BY-SA 4.0, Mattia Verga. The JSON extract stays under CC BY-SA 4.0. See `packages/data/NOTICE.md`. |
| VizieR VII/7A, Lynds 1962 | Dark nebulae, J2000 positions computed by VizieR, opacity, equivalent diameter from area | Cite Lynds, ApJS 7, 1, and CDS VizieR (DOI 10.26093/cds/vizier). |
| DSS2 colour | Framing plate via hips2fits or HiPS tiles | Digitized Sky Survey, STScI/NASA, coloured and healpix-indexed by CDS. |
| [Open-Meteo](https://open-meteo.com/) | Hourly cloud, precipitation probability, wind, temperature | [CC BY 4.0](https://open-meteo.com/en/license). No API key. |
| Seed telescopes, cameras, filters | Nominal published specifications | Figures are planning values, not lab measurements. Read noise is a high-gain placeholder. |

Messier 24, 40, 73, and 102 are absent: OpenNGC types them outside the deep-sky classes kept in the extract. Rebuild with `packages/data/scripts/build_catalogue.py` if you refresh the upstream files.

## Panchang

`packages/core/src/panchang.ts` exports `PanchangClient` and `UnconfiguredPanchangClient`. The UI does not invent tithi or nakshatra. Wire `getDay` to the owner’s engine in a later phase; the request already carries the planner’s date, coordinates, and timezone.

## Phase 2 — accounts

See `supabase/README.md`. Auth and saved rig profiles are not implemented. Phase 1 keeps a single local session.

## Phase 4 — mobile

An Expo app in `apps/mobile` can import `@dss/core` and `@dss/data`. Do not add browser APIs to those packages. The web framing route (hips2fits and tile assembly) stays on the server; the native app will need the same HTTP endpoint or a shared renderer.

## Deploy on Vercel

The Next.js app is `apps/web`. Workspace packages are TypeScript source, compiled by Next (`transpilePackages`).

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set **Root Directory** to `apps/web`. If Vercel asks, include source files outside the root directory so `packages/core` and `packages/data` are uploaded.
4. Framework preset: **Next.js**.
5. Install command: `pnpm install` (Vercel runs this from the repository root when it detects `pnpm-workspace.yaml`).
6. Build command: `next build` (the default, run in `apps/web`).
7. Output directory: leave the Next.js default. Do not set a static `out` directory.
8. No environment variables are required for phase 1. Open-Meteo and the sky surveys are public.
9. Deploy.

Node 20 or newer on the project (**Settings → General → Node.js Version**). After a phase 2 Supabase connection, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project and keep the service role key off the client.

The sky route calls CDS and, on failure, MAST/IPAC/ESA. Those hosts must be reachable from the Vercel function. Weather calls `api.open-meteo.com`. Both routes cache in the function instance and send `Cache-Control`.
