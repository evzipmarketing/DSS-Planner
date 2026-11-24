# DeepSkyMate - development efforts log

Reference sheet for dates, code volume, and effort. **Measured** blocks below are refreshed by `pnpm efforts:refresh` (or Cursor agents after milestones). Keep **Fill in** rows for your hours and billing.

<!-- efforts:measured:start -->
_Last refreshed: 2026-11-24 (auto)_

## Snapshot

| Metric | Value | Source |
|--------|-------|--------|
| Project start (first commit) | **2026-11-12** | `git log --reverse` |
| Latest commit (as of refresh) | **2026-11-24** | `8affda4` — Keep EFFORTS.md current with a refresh script and Cursor rule. |
| Calendar span | **13 days** (2026-11-12 → 2026-11-24) | First → latest commit date |
| Days with commits | **7** | Unique `git log` dates |
| Total commits on `main` | **27** | `git rev-list --count HEAD` |
| Source files counted | **150** | `apps/` + `packages/` |
| Current source LOC | **~32,937** | Line count under `apps/` + `packages/` |
| Git churn (all history) | **+48,124 / -4,557** (net ~**+43,567**) | `git log --numstat` |
| Cursor agent transcripts (local) | **9** chats under this project | Agent transcript folder |

---

## Dates & activity

### Commit days

| Date | Commits | Notes |
|------|--------:|-------|
| 2026-11-12 | 4 | |
| 2026-11-13 | 12 | |
| 2026-11-14 | 4 | |
| 2026-11-21 | 2 | |
| 2026-11-22 | 1 | |
| 2026-11-23 | 1 | |
| 2026-11-24 | 3 | |

_Notes column is manual — keep useful context when editing by hand._

### Authors (commit counts, `git shortlog -sn --all`)

| Author | Commits |
|--------|--------:|
| Cursor Agent | 31 |
| evzipmarketing | 13 |
| itsardnepu | 10 |

\*Author totals can exceed tip commit count when history was rewritten or commits exist on other refs.

---

## Lines of code (measured 2026-11-24)

Counted under `apps/` and `packages/`, excluding `node_modules`, `.next`, `dist`, `build`, `.expo`, `coverage`.

| Area | Approx. lines |
|------|-------------:|
| `apps/web` | 13,593 |
| `apps/mobile` | 10,707 |
| `packages/core` | 5,296 |
| `packages/data` | 3,341 |
| **Total** | **~32,937** |

### By file type

| Extension | Approx. lines |
|-----------|-------------:|
| `.tsx` | 16,912 |
| `.ts` | 11,918 |
| `.css` | 3,726 |
| `.json` | 227 |
| `.md` | 110 |
| `.js` | 44 |

### Tests

| Item | Value |
|------|------:|
| `packages/core/test` files | 6 |
| Test LOC (approx.) | ~1,615 |

### How to re-measure

```powershell
pnpm efforts:refresh
# or: powershell -File scripts/refresh-efforts.ps1
```

**Heuristic estimate (auto):** ~42–84 hours (7 active days × 6–12 h). Replace with your hour log below.
<!-- efforts:measured:end -->

---

## Time spent

| Item | Value | Notes |
|------|-------|-------|
| Your logged hours (manual) | _TBD_ | Calendar / timesheet |
| Pair / review hours (manual) | _TBD_ | Meetings, testing on sky, device QA |

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
| Cursor plan / subscription | _TBD_ | | Cursor Settings ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Account / Billing |
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
- **Shipped (high level):** Tonight shortlist & ranking, gear/setup, altitude/imageable windows, moon/band advice, Profile/lists, sky explorer, Planner hub, multi-target night planner, single-target goal-first planner, multi-rigs night planner, CSV export on target details
- **Still planned:** Mosaic, Collage, Asterisms (see `.cursor/plans/planner_modules_plan_0bfd4930.plan.md`)

---

## How this stays up to date

1. **Script:** `pnpm efforts:refresh` rewrites the measured block from git + LOC.  
2. **Cursor rule:** `.cursor/rules/refresh-efforts.mdc` tells agents to refresh after meaningful commits / milestones.  
3. **Manual:** Keep hour and credit tables yourself (billing is not in git).

### Changelog of this file

| Date | Change |
|------|--------|
| 2026-11-24 | Initial efforts log from git + LOC snapshot |
| 2026-11-24 | Added auto-refresh script + Cursor rule for regular updates |
| 2026-11-24 | Auto-refresh via `scripts/refresh-efforts.ps1` |
