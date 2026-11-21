# Supabase (phase 2+)

Phase 1 stores the visitor’s gear, site, Bortle class, and night-vision preference in `localStorage` only on web. The Expo app mirrors that locally (AsyncStorage) and can sync when Auth is configured.

## Mobile schema

Apply [`migrations/20261121_mobile_accounts_lists.sql`](migrations/20261121_mobile_accounts_lists.sql):

- Supabase Auth (email magic link from the mobile **You** tab).
- `profiles` keyed by auth user.
- `gear_profiles` plus child telescope/camera/filter rows.
- `target_lists` / `target_list_items` for named observing lists.
- `saved_targets` for favorites.
- RLS so a user can read and write only their own rows.

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`. Do not commit service-role keys.

The Panchang client in `@dss/core` (`PanchangClient`) remains a later seam for the owner’s engine.
