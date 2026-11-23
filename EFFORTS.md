# DeepSkyMate — development efforts log

Reference sheet for dates, code volume, and effort. Update the **Fill in** rows when you have billing or calendar numbers.

_Last refreshed: 2026-11-24_

---

## Snapshot

| Metric | Value | Source |
|--------|-------|--------|
| Project start (first commit) | **2026-11-12** | `git log --reverse` |
| Latest commit (as of refresh) | **2026-11-24** | `aac2db4` — multi/single-target planners |
| Calendar span | **13 days** (12 → 24 Nov 2026) | First → latest commit date |
| Days with commits | **7** | Unique `git log` dates |
| Total commits on `main` | **25** | `git rev-list --count HEAD` |
| Current source LOC | **~27,900** | `apps/` + `packages/` (see below) |
| Git churn (all history) | **+47,680 / −4,498** (net ~**+43,200**) | `git log --numstat` |
| Cursor agent transcripts (local) | **8** chats under this project | Agent transcript folder |

---

## Dates & activity

### Commit days

| Date | Commits | Notes |
|------|--------:|-------|
| 2026-11-12 | 4 | Initial commit, phase 1 planner, early layout/redesign |
| 2026-11-13 | 12 | Heavy day: Graphite/minimal layouts, rebrand to DeepSkyMate, framing/altitude UX |
| 2026-11-14 | 4 | Setup gating, brand SVG, altitude/frame polish |
| 2026-11-21 | 2 | Expo mobile app + constellation sky explorer |
| 2026-11-22 | 1 | Web Tonight/Profile parity with mobile |
| 2026-11-23 | 1 | Custom frame/hours filter, Profile About |
| 2026-11-24 | 1 | Multi-target + single-target planners, moon-aware scheduling, CSV export |

### Major milestones (from commit messages)

1. **2026-11-12** — DSS Planner phase 1; nightly workflow redesign  
2. **2026-11-13** — Rebrand to **DeepSkyMate**; imageable window / gear / framing polish  
3. **2026-11-14** — Setup gating, smart telescopes, target detail layout  
4. **2026-11-21** — Expo **mobile** app; Planner/Profile hubs; sky explorer  
5. **2026-11-22–23** — Web/mobile parity; custom list ranges  
6. **2026-11-24** — Multi-target & single-target planners; moon band rules; Tonight CSV export  

### Authors (commit counts)

| Author | Commits |
|--------|--------:|
| Cursor Agent | 31* |
| evzipmarketing | 13 |
| itsardnepu | 8 |

\*Includes commits attributed across history/`--all`; `main` tip count is 25 commits.

---

## Lines of code (measured 2026-11-24)

Counted under `apps/` and `packages/`, excluding `node_modules`, `.next`, `dist`, `build`, `.expo`, `coverage`.

| Area | Approx. lines |
|------|-------------:|
| `apps/web` | 11,425 |
| `apps/mobile` | 8,861 |
| `packages/core` | 4,360 |
| `packages/data` | 3,287 |
| **Total** | **~27,933** |

### By file type

| Extension | Approx. lines |
|-----------|-------------:|
| `.tsx` | 13,918 |
| `.ts` | 10,673 |
| `.css` | 3,002 |
| `.json` | 227 |
| `.md` | 73 |
| `.js` | 40 |

### Tests

| Item | Value |
|------|------:|
| `packages/core/test` files | 5 |
| Test LOC (approx.) | ~1,236 |

### How to re-measure

```powershell
# From repo root — rough LOC refresh (PowerShell)
$roots = @("apps","packages")
$exclude = @("node_modules",".next","dist","build",".expo")
# Or install/use: npx cloc apps packages --exclude-dir=node_modules,.next,dist
```

---

## Time spent

| Item | Value | Notes |
|------|-------|-------|
| Calendar span | 13 days | Not all days were full-time |
| Active git days | 7 | Days with ≥1 commit |
| **Estimated focused build time** | **~40–80 hours** | Heuristic only — fill in your real hours below |
| Your logged hours (manual) | _TBD_ | Calendar / timesheet |
| Pair / review hours (manual) | _TBD_ | Meetings, testing on sky, device QA |

**Heuristic used for the estimate:** 7 active days × ~6–12 h typical Cursor-assisted build intensity on this project shape (web + mobile + core). Replace with your actual log.

### Hour log (fill in)

| Date | Hours | What you worked on |
|------|------:|--------------------|
| 2026-11-12 | | |
| 2026-11-13 | | |
| 2026-11-14 | | |
| 2026-11-21 | | |
| 2026-11-22 | | |
| 2026-11-23 | | |
| 2026-11-24 | | |
| **Total** | | |

---

## Credits / cost (fill in from Cursor / GitHub / hosting)

Cursor does not expose spend inside the repo. Copy numbers from the Cursor dashboard / invoices.

| Item | Amount | Period | Source |
|------|-------:|--------|--------|
| Cursor plan / subscription | _TBD_ | | Cursor Settings → Account / Billing |
| Cursor usage credits / on-demand | _TBD_ | | Cursor usage page |
| Agent / premium model premium requests | _TBD_ | | |
| GitHub (repo / Actions) | _TBD_ | | |
| Vercel / hosting | _TBD_ | | |
| Domains / other | _TBD_ | | |
| **Total cash cost** | _TBD_ | | |

### Credit log (fill in)

| Date | Credits / \$ | Notes |
|------|-------------:|-------|
| | | |
| | | |

---

## Stack & scope (for context)

- **Monorepo:** `apps/web` (Next), `apps/mobile` (Expo), `packages/core`, `packages/data`
- **Shipped (high level):** Tonight shortlist & ranking, gear/setup, altitude/imageable windows, moon/band advice, Profile/lists, sky explorer, Planner hub, multi-target night planner, single-target goal-first planner, CSV export on target details
- **Still planned:** Multi-rigs, Mosaic, Collage, Asterisms (see `.cursor/plans/planner_modules_plan_0bfd4930.plan.md`)

---

## Refresh checklist

When you want an updated snapshot:

1. Update **Last refreshed** date at the top.  
2. Re-run LOC / `git rev-list --count` / commit-day table.  
3. Paste Cursor billing totals into the credits table.  
4. Add rows to the hour log for any new build days.  
5. Optionally append a short “what shipped this week” bullet list below.

### Changelog of this file

| Date | Change |
|------|--------|
| 2026-11-24 | Initial efforts log from git + LOC snapshot |
