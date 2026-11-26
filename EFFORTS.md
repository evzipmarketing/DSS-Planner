# DeepSkyMate — development efforts

Auto-measured project stats. Refresh with `pnpm efforts:refresh`.

<!-- efforts:measured:start -->
_Last refreshed: 2026-11-26 (auto)_

## Snapshot

| Metric | Value | Source |
|--------|-------|--------|
| Project start (first commit) | **2026-11-12** | `git log --reverse` |
| Latest commit (as of refresh) | **2026-11-26** | `07599ca` — Sync DeepSkyMate brand icons for mobile and web PWA install. |
| Calendar span | **15 days** (2026-11-12 → 2026-11-26) | First → latest commit date |
| Days with commits | **8** | Unique `git log` dates |
| Total commits on `main` | **31** | `git rev-list --count HEAD` |
| Source files counted | **183** | `apps/` + `packages/` |
| Current source LOC | **~43,069** | Line count under `apps/` + `packages/` |
| Git churn (all history) | **+62,131 / -5,517** (net ~**+56,614**) | `git log --numstat` |
| Cursor agent transcripts (local) | **20** chats under this project | Agent transcript folder |

---

## Commit days

| Date | Commits |
|------|--------:|
| 2026-11-12 | 4 |
| 2026-11-13 | 12 |
| 2026-11-14 | 4 |
| 2026-11-21 | 2 |
| 2026-11-22 | 1 |
| 2026-11-23 | 1 |
| 2026-11-24 | 4 |
| 2026-11-26 | 3 |

### Authors

| Author | Commits |
|--------|--------:|
| Cursor Agent | 31 |
| itsardnepu | 14 |
| evzipmarketing | 13 |

---

## Lines of code (measured 2026-11-26)

| Area | Approx. lines |
|------|-------------:|
| `apps/web` | 17,750 |
| `apps/mobile` | 14,562 |
| `packages/core` | 6,847 |
| `packages/data` | 3,910 |
| **Total** | **~43,069** |

| Extension | Approx. lines |
|-----------|-------------:|
| `.tsx` | 23,509 |
| `.ts` | 14,479 |
| `.css` | 4,699 |
| `.json` | 228 |
| `.md` | 110 |
| `.js` | 44 |

| Tests | Value |
|-------|------:|
| `packages/core/test` files | 9 |
| Test LOC (approx.) | ~2,088 |

**Heuristic effort:** ~48–96 hours (8 active days × 6–12 h).
<!-- efforts:measured:end -->

---

## Stack & scope

- **Monorepo:** `apps/web` (Next), `apps/mobile` (Expo), `packages/core`, `packages/data`
- **Shipped:** Tonight shortlist & ranking, gear/setup, altitude windows, moon/band advice, Profile/lists, sky explorer, Planner hub (multi-target, single-target, multi-rigs, mosaic, collage, asterisms), imaging plans, CSV export
