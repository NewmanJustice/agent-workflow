# Story — Display Pipeline History

## User story

As a developer using murmur8, I want to view recent pipeline runs via CLI so that I can review execution history and identify patterns.

---

## Context / scope

- New CLI command: `murmur8 history`
- Displays tabular list of recent pipeline executions
- Per FEATURE_SPEC.md:Section 6 (Rule: Display Limit Default), shows last 10 runs by default
- Requires `.claude/pipeline-history.json` to exist with valid entries

---

## Acceptance criteria

**AC-1 — Display recent runs**
- Given `.claude/pipeline-history.json` contains history entries,
- When I run `murmur8 history`,
- Then I see a list of the 10 most recent runs showing: slug, status, date, total duration.

**AC-2 — Display all runs with flag**
- Given `.claude/pipeline-history.json` contains more than 10 entries,
- When I run `murmur8 history --all`,
- Then I see all history entries (not truncated to 10).

**AC-3 — Empty history message**
- Given `.claude/pipeline-history.json` is empty or does not exist,
- When I run `murmur8 history`,
- Then I see a message: "No pipeline history found."

**AC-4 — Corrupted file handling**
- Given `.claude/pipeline-history.json` contains invalid JSON,
- When I run `murmur8 history`,
- Then I see a warning: "History file is corrupted. Run 'murmur8 history clear' to reset."
- And the command exits with code 0 (non-blocking).

**AC-5 — Status colour coding**
- Given history entries with different statuses,
- When displayed in the terminal,
- Then `success` entries show in green, `failed` in red, `paused` in yellow.

**AC-6 — Most recent first ordering**
- Given multiple history entries,
- When displayed,
- Then entries are ordered by `completedAt` descending (most recent first).

---

## CLI output format

```
Pipeline History (showing 10 of 25 runs)

  SLUG              STATUS    DATE                  DURATION
  user-auth         success   2026-02-24 10:15:00   15m 32s
  payment-flow      failed    2026-02-24 09:45:00   8m 12s (failed at: nigel)
  checkout-page     paused    2026-02-23 16:30:00   5m 00s (paused at: cass)
  ...

Run 'murmur8 history --all' to see all entries.
Run 'murmur8 history --stats' for aggregate statistics.
```

---

## Out of scope

- Filtering by status (e.g., `--status=failed`)
- Filtering by date range
- Pagination beyond simple `--all` flag
- Detailed per-stage breakdown in list view (use `--stats` for that)
