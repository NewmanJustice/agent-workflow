# Feature Specification — Parallel Logging

## 1. Feature Intent

Write each pipeline's output to a dedicated log file instead of interleaving on console. When multiple pipelines run simultaneously, their output becomes unreadable. Logging to files keeps the console clean while preserving full output for debugging.

**Problem:** With 3 pipelines running in parallel, console output is an unreadable mess of interleaved messages from different agents.

**Solution:** Write each pipeline's stdout/stderr to a log file; show only summary status on console.

---

## 2. Scope

### In Scope
- Log file per pipeline: `.claude/worktrees/feat-{slug}/pipeline.log`
- Summary status on console (started, completed, failed)
- `--verbose` flag to also stream to console
- Timestamps on log entries

### Out of Scope
- Log rotation
- Log compression
- Remote log shipping

---

## 3. Behaviour Overview

### Default (Quiet Console)

```
$ murmur8 parallel feat-a feat-b feat-c

Starting parallel pipelines...

[10:30:01] feat-a: Started (log: .claude/worktrees/feat-feat-a/pipeline.log)
[10:30:02] feat-b: Started (log: .claude/worktrees/feat-feat-b/pipeline.log)
[10:30:03] feat-c: Started (log: .claude/worktrees/feat-feat-c/pipeline.log)
[10:35:15] feat-b: Completed ✓
[10:36:22] feat-a: Completed ✓
[10:38:45] feat-c: Failed ✗ (see log for details)

Summary: 2 completed, 1 failed
```

### Verbose Mode

```
$ murmur8 parallel feat-a --verbose

Starting parallel pipelines...

[10:30:01] feat-a: Started
--- feat-a output ---
You are Alex, the System Specification Agent...
[Alex output streams here]
...
--- end feat-a output ---

[10:35:15] feat-a: Completed ✓
```

---

## 4. Log File Format

Location: `.claude/worktrees/feat-{slug}/pipeline.log`

```
[2026-02-25T10:30:01.123Z] Pipeline started for feat-a
[2026-02-25T10:30:01.456Z] [stdout] You are Alex, the System Specification Agent...
[2026-02-25T10:30:02.789Z] [stdout] Reading feature spec...
[2026-02-25T10:35:15.000Z] [stderr] Warning: some warning
[2026-02-25T10:35:15.100Z] Pipeline completed with exit code 0
```

---

## 5. Implementation Notes

- Change `stdio: 'inherit'` to `stdio: 'pipe'`
- Create write stream to log file
- Prefix each line with timestamp and stream type
- On `--verbose`, also pipe to `process.stdout`
- Console shows only status updates (not full output)

---

## 6. Test Themes

- Log file created in worktree directory
- Log contains timestamped output
- Console shows only status by default
- `--verbose` streams output to console
- Log preserved on failure for debugging
- Multiple pipelines don't interleave in logs

---

## 7. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-25 | Initial spec | Parallel safeguards |
