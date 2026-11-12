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

The catalogue is two JSON files so the app can paint from the core list and load the rest in the background. `core.json` is the objects an imager usually searches first (Messier, Caldwell, named nebulae and clusters, Sharpless, Barnard, Lynds bright, van den Bergh, Abell planetaries, Arp, RCW, Cederblad, the Herschel 400, and the brighter NGC/IC). `extended.json` is the remaining NGC/IC, Lynds dark nebulae, Abell galaxy clusters, and UGC galaxies that pass the cut. Both are static imports behind separate package entry points (`@dss/data/catalogue` and `@dss/data/catalogue-extended`), so a future Expo app can load them the same way.

Objects that share a designation are one record. M42 carries NGC 1976, LBN 974, Sh2-281, and Ced 55d. Search matches any alias or common name. The shortlist filters by object type, catalogue, faintest magnitude, and minimum size; with the filters left empty it still prefers named and bright targets that actually clear 30°.

| Data | What landed in the files | Licence / credit |
| --- | --- | --- |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC) | Every NGC and IC row, every type, plus the addendum. PGC and UGC numbers already printed there are kept as aliases. | CC BY-SA 4.0, Mattia Verga. The JSON extract stays under the same terms. |
| Messier | All 110. M24 is the Sagittarius star cloud (NGC 6603 stays separate). M40 is Winnecke 4. M73 / NGC 6994 is an asterism. M102 is NGC 5866, the Spindle, not a second copy of M101. | Historical catalogue. Cross-ids from OpenNGC except the M102 convention, which is applied here. |
| Caldwell | All 109, from OpenNGC `C` identifiers and the addendum. | Numbers as published; positions from OpenNGC (CC BY-SA 4.0). |
| VizieR VII/20 Sharpless 1959 | H II regions. A Sharpless number is attached to a nebula already in the catalogue when the centre is clearly nearest that nebula. | Sharpless, ApJS 4, 257. CDS VizieR (DOI 10.26093/cds/vizier). |
| VizieR VII/220A Barnard 1927 | 349 dark nebulae. | Barnard 1927, via CDS. |
| VizieR VII/7A Lynds 1962 | Dark nebulae (LDN), in the extended file. | Lynds, ApJS 7, 1, via CDS. |
| VizieR VII/9 Lynds 1965 | Bright nebulae (LBN). | Lynds, ApJS 12, 163, via CDS. |
| VizieR VII/21B van den Bergh 1966 | Reflection nebulae (vdB). | van den Bergh, AJ 71, 990, via CDS. |
| VizieR V/84 Strasbourg-ESO PN | Abell planetary nebulae whose SEC name is `A n` and whose discoverer line cites Abell. | Acker et al. 1992, via CDS. Not the unpublished remainder of Abell's list. |
| VizieR VII/110A Abell+ 1989 | Abell galaxy clusters (ACO), extended file. | Abell, Corwin, Olowin 1989, via CDS. |
| VizieR B/ocl Dias+ 2002–2015 | Collinder, Melotte, Trumpler, and Stock clusters **when Dias names the cluster that way**. A cluster Dias lists only as NGC or IC keeps that name and does not grow a second number. | Dias et al., via CDS. |
| VizieR VII/192 Arp / Webb 1996 | Arp peculiar galaxies, merged onto NGC or UGC when the name says so. | Arp 1966; positions from Webb 1996, via CDS. |
| Herschel 400 | The 400 NGC numbers of the Astronomical League list, stored as a shared tag on those NGC objects. | List of NGC numbers, not a separate coordinate catalogue. |
| VizieR VII/216 RCW | Rodgers, Campbell, Whiteoak 1960. | Via CDS. |
| VizieR VII/231 Cederblad 1946 | Bright diffuse nebulae, including lettered parts. | Via CDS. |
| Gum | Only 17 published cross-ids (Gum number to NGC, IC, Sh2, or RCW). | The 1955 Gum coordinate catalogue is not a standalone VizieR table we could download. Gum 12, the Gum Nebula itself, has no NGC/RCW hook in that short crosswalk, so it is not a separate record. |
| VizieR VII/26D UGC Nilson 1973 | Galaxies already tied to an NGC/IC object, plus otherwise new UGC galaxies with photographic magnitude 15 or brighter, or a major axis of at least 2′. | Via CDS. |
| PGC | Alias only, and only the PGC numbers OpenNGC already publishes. | The full HyperLEDA/PGC database is not redistributed here: it is enormous, and its terms are for research use rather than a clear open bulk licence. |
| DSS2 colour | Framing plate | Digitized Sky Survey, STScI/NASA, coloured by CDS. |
| [Open-Meteo](https://open-meteo.com/) | Cloud, wind, temperature, and time zone | [CC BY 4.0](https://open-meteo.com/en/license). |
| [NASA Black Marble 2016](https://visibleearth.nasa.gov/images/144898/earth-at-night-black-marble-2016-color-maps) | Coarse Bortle estimate | US government work, public domain. The class is an estimate from a stretched night-lights image, not a sky-quality meter. See `packages/data/NOTICE.md`. |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Place search | [CC BY 4.0](https://open-meteo.com/en/license). |
| [Nominatim](https://nominatim.org/) | Reverse place name for the browser location | [ODbL](https://www.openstreetmap.org/copyright). |

VizieR positions tagged `_RAJ2000` / `_DEJ2000` are computed by CDS and are not part of the original papers. Rebuild with `packages/data/scripts/build_catalogue.py` after refreshing the source files. Counts from the committed extract are in `packages/data/NOTICE.md`.

## Panchang

`packages/core/src/panchang.ts` exports `PanchangClient` and `UnconfiguredPanchangClient`. The UI does not call the Panchang client. Tithi and nakshatra are not shown.

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
