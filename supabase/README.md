# Supabase (phase 2)

Phase 1 stores the visitor’s gear, site, Bortle class, and night-vision preference in `localStorage` only. There is no auth and no database client in the app yet.

Phase 2 is expected to add:

- Supabase Auth (email or a provider the owner chooses).
- A `profiles` row keyed by the auth user.
- `gear_profiles`: named rigs belonging to a user, including site, timezone, and Bortle class.
- Child rows for telescopes, cameras, and filters on a profile, using the same fields as `@dss/core` (`Telescope`, `Camera`, `ImagingFilter`).
- Row-level security so a user can read and write only their own profiles.

The browser can keep `localStorage` as a cache and sync a chosen profile when a session exists. The Panchang client in `@dss/core` (`PanchangClient`) is the other phase-2 seam: implement it against the owner’s engine and pass the same date, coordinates, and timezone the planner already collects.

Do not commit service-role keys. The web app should use the anon key and RLS.
