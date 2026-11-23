#Requires -Version 5.1
<#
.SYNOPSIS
  Refresh measured sections in EFFORTS.md from git + LOC counts.
  Preserves manual hour/credit tables outside the auto markers.
#>
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$effortsPath = Join-Path $repoRoot "EFFORTS.md"
if (-not (Test-Path $effortsPath)) {
  throw "EFFORTS.md not found at $effortsPath"
}

function Get-LineCount([string]$Path) {
  try {
    return @(Get-Content -LiteralPath $Path -ErrorAction Stop).Count
  } catch {
    return 0
  }
}

$today = Get-Date -Format "yyyy-MM-dd"
# `-1` before `--reverse` only rewrites one commit; take the first line of a full reverse log.
$firstDate = @(git log --reverse --format="%ad" --date=short)[0].Trim()
$latestLine = (git log -1 --format="%h|%ad|%s" --date=short).Trim()
$latestHash, $latestDate, $latestSubject = $latestLine.Split("|", 3)
$commitCount = [int](git rev-list --count HEAD).Trim()
$activeDays = @(git log --format="%ad" --date=short | Sort-Object -Unique)
$activeDayCount = $activeDays.Count
$spanDays = ([datetime]::ParseExact($latestDate, "yyyy-MM-dd", $null) - [datetime]::ParseExact($firstDate, "yyyy-MM-dd", $null)).Days + 1

$commitDayRows = git log --format="%ad" --date=short |
  Group-Object |
  Sort-Object Name |
  ForEach-Object { "| $($_.Name) | $($_.Count) | |" }

$authorRows = git shortlog -sn --all |
  ForEach-Object {
    if ($_ -match "^\s*(\d+)\s+(.+)$") {
      "| $($Matches[2].Trim()) | $($Matches[1]) |"
    }
  }

$ins = 0
$del = 0
git log --numstat --pretty=format:"" | ForEach-Object {
  if ($_ -match "^(\d+)\s+(\d+)\s+") {
    $ins += [int]$Matches[1]
    $del += [int]$Matches[2]
  }
}
$net = $ins - $del

$excludeDirs = @("node_modules", ".next", "dist", "build", ".expo", "coverage")
$exts = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.json", "*.md")
$byExt = @{}
$byPkg = @{}
$fileCount = 0
$totalLines = 0

Get-ChildItem -Path @("apps", "packages") -Recurse -File -Include $exts -ErrorAction SilentlyContinue |
  Where-Object {
    $full = $_.FullName
    -not ($excludeDirs | Where-Object { $full -like "*\$_\*" -or $full -like "*/$_/*" })
  } |
  ForEach-Object {
    $lines = Get-LineCount $_.FullName
    $ext = $_.Extension.ToLowerInvariant()
    $rel = $_.FullName.Substring($repoRoot.Length).TrimStart("\", "/")
    $parts = $rel -split "[\\/]"
    $pkg = if ($parts.Length -ge 2) { "$($parts[0])/$($parts[1])" } else { $parts[0] }
    $fileCount += 1
    $totalLines += $lines
    if (-not $byExt.ContainsKey($ext)) { $byExt[$ext] = 0 }
    $byExt[$ext] += $lines
    if (-not $byPkg.ContainsKey($pkg)) { $byPkg[$pkg] = 0 }
    $byPkg[$pkg] += $lines
  }

$pkgRows = $byPkg.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
  "| ``$($_.Key)`` | $("{0:N0}" -f $_.Value) |"
}
$extRows = $byExt.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
  "| ``$($_.Key)`` | $("{0:N0}" -f $_.Value) |"
}

$testFiles = @(Get-ChildItem -Path (Join-Path $repoRoot "packages\core\test") -Filter "*.ts" -ErrorAction SilentlyContinue)
$testLines = 0
foreach ($f in $testFiles) { $testLines += Get-LineCount $f.FullName }

$transcriptDir = Join-Path $env:USERPROFILE ".cursor\projects\f-OneDrive-EVZIP-MOBILITY-PRIVATE-LIMITED-Auspico-Apps-deepskymate-DSM-App\agent-transcripts"
$transcriptCount = 0
if (Test-Path $transcriptDir) {
  $transcriptCount = @(Get-ChildItem $transcriptDir -Filter "*.jsonl" -Recurse -ErrorAction SilentlyContinue).Count
}

$hoursLow = [Math]::Max(1, $activeDayCount * 6)
$hoursHigh = [Math]::Max($hoursLow + 1, $activeDayCount * 12)

$measured = @"
_Last refreshed: $today (auto)_

## Snapshot

| Metric | Value | Source |
|--------|-------|--------|
| Project start (first commit) | **$firstDate** | ``git log --reverse`` |
| Latest commit (as of refresh) | **$latestDate** | ``$latestHash`` — $latestSubject |
| Calendar span | **$spanDays days** ($firstDate → $latestDate) | First → latest commit date |
| Days with commits | **$activeDayCount** | Unique ``git log`` dates |
| Total commits on ``main`` | **$commitCount** | ``git rev-list --count HEAD`` |
| Source files counted | **$fileCount** | ``apps/`` + ``packages/`` |
| Current source LOC | **~$("{0:N0}" -f $totalLines)** | Line count under ``apps/`` + ``packages/`` |
| Git churn (all history) | **+$("{0:N0}" -f $ins) / -$("{0:N0}" -f $del)** (net ~**+$("{0:N0}" -f $net)**) | ``git log --numstat`` |
| Cursor agent transcripts (local) | **$transcriptCount** chats under this project | Agent transcript folder |

---

## Dates & activity

### Commit days

| Date | Commits | Notes |
|------|--------:|-------|
$($commitDayRows -join "`n")

_Notes column is manual — keep useful context when editing by hand._

### Authors (commit counts, ``git shortlog -sn --all``)

| Author | Commits |
|--------|--------:|
$($authorRows -join "`n")

\*Author totals can exceed tip commit count when history was rewritten or commits exist on other refs.

---

## Lines of code (measured $today)

Counted under ``apps/`` and ``packages/``, excluding ``node_modules``, ``.next``, ``dist``, ``build``, ``.expo``, ``coverage``.

| Area | Approx. lines |
|------|-------------:|
$($pkgRows -join "`n")
| **Total** | **~$("{0:N0}" -f $totalLines)** |

### By file type

| Extension | Approx. lines |
|-----------|-------------:|
$($extRows -join "`n")

### Tests

| Item | Value |
|------|------:|
| ``packages/core/test`` files | $($testFiles.Count) |
| Test LOC (approx.) | ~$("{0:N0}" -f $testLines) |

### How to re-measure

``````powershell
pnpm efforts:refresh
# or: powershell -File scripts/refresh-efforts.ps1
``````

**Heuristic estimate (auto):** ~$hoursLow–$hoursHigh hours ($activeDayCount active days × 6–12 h). Replace with your hour log below.
"@

$existing = Get-Content -LiteralPath $effortsPath -Raw
$start = "<!-- efforts:measured:start -->"
$end = "<!-- efforts:measured:end -->"
if ($existing -notmatch [regex]::Escape($start) -or $existing -notmatch [regex]::Escape($end)) {
  throw "EFFORTS.md is missing $start / $end markers"
}

$pattern = "(?s)$([regex]::Escape($start)).*?$([regex]::Escape($end))"
$replacement = "$start`n$measured`n$end"
$updated = [regex]::Replace($existing, $pattern, { param($m) $replacement })

# Append changelog row if today's auto refresh isn't listed yet
$autoNote = "| $today | Auto-refresh via ``scripts/refresh-efforts.ps1`` |"
if ($updated -notmatch [regex]::Escape("Auto-refresh via")) {
  $updated = $updated.TrimEnd() + "`n$autoNote`n"
} elseif ($updated -notmatch [regex]::Escape("| $today | Auto-refresh")) {
  # Already has an auto-refresh entry from another day — add today's
  $updated = $updated.TrimEnd() + "`n$autoNote`n"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($effortsPath, ($updated.TrimEnd() + "`n"), $utf8NoBom)
Write-Host "Updated EFFORTS.md ($today) - $commitCount commits, ~$totalLines LOC, $activeDayCount active days."