# Feature Specification — Parallel Lock

## 1. Feature Intent

Prevent running multiple parallel executions simultaneously by using a lock file. If a user accidentally runs `murmur8 parallel` twice, the second invocation should fail with a clear message rather than creating chaos.

**Problem:** Without locking, two parallel runs could create conflicting worktrees, compete for resources, and produce unpredictable results.

**Solution:** Create a lock file on start, check for existing lock, clean up on completion.

---

## 2. Scope

### In Scope
- Create lock file with PID on start
- Check if lock exists and process is running
- Clean up lock on completion (success or failure)
- `--force` flag to override lock (with warning)
- Clear error message when locked

### Out of Scope
- Distributed locking (multiple machines)
- Queue management for sequential runs

---

## 3. Behaviour Overview

### First Run (No Lock)

```
$ murmur8 parallel feat-a feat-b

[Creates .claude/parallel.lock]
Starting parallel pipelines...
...
[Removes .claude/parallel.lock on completion]
```

### Second Run (Locked)

```
$ murmur8 parallel feat-c feat-d

Error: Another parallel execution is in progress (PID: 12345)
Started at: 2026-02-25T10:30:00Z

Options:
  • Wait for it to complete
  • Run: murmur8 parallel status
  • Force override: murmur8 parallel feat-c feat-d --force
```

### Force Override

```
$ murmur8 parallel feat-c feat-d --force

Warning: Overriding existing lock (PID: 12345)
This may cause conflicts if another execution is still running.

Continue? [y/N] y
```

### Stale Lock (Process Dead)

```
$ murmur8 parallel feat-a feat-b

Warning: Found stale lock file (PID 12345 not running)
Removing stale lock and continuing...

Starting parallel pipelines...
```

---

## 4. Lock File Format

Location: `.claude/parallel.lock`

```json
{
  "pid": 12345,
  "startedAt": "2026-02-25T10:30:00Z",
  "features": ["feat-a", "feat-b"],
  "maxConcurrency": 3
}
```

---

## 5. Implementation Notes

- Check if PID is running: `process.kill(pid, 0)` returns without error if alive
- Lock created after confirmation, before worktree creation
- Lock removed in `finally` block to ensure cleanup
- `--force` bypasses lock check but still creates new lock

---

## 6. Test Themes

- Lock file created on start
- Lock file removed on success
- Lock file removed on failure
- Error when lock exists with running PID
- Stale lock detected and removed
- `--force` flag overrides lock
- Lock contains correct metadata

---

## 7. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-25 | Initial spec | Parallel safeguards |
