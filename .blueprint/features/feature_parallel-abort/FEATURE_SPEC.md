# Feature Specification — Parallel Abort

## 1. Feature Intent

Provide a way to stop all running parallel pipelines and optionally clean up worktrees. Users need an escape hatch if something goes wrong or they need to stop execution mid-way.

**Problem:** Once parallel pipelines start, there's no clean way to stop them. Users would have to manually find and kill processes, then clean up worktrees.

**Solution:** `murmur8 parallel abort` command that gracefully stops all pipelines and handles cleanup.

---

## 2. Scope

### In Scope
- Stop all running pipeline processes
- Update queue state to 'aborted'
- Option to preserve or remove worktrees
- Handle Ctrl+C in main process
- Clear status reporting

### Out of Scope
- Selective abort (single feature) — future enhancement
- Rollback of completed merges

---

## 3. Behaviour Overview

### Abort (Preserve Worktrees)

```
$ murmur8 parallel abort

Stopping parallel pipelines...

[10:35:01] feat-a: Stopping process (PID: 12345)
[10:35:01] feat-b: Stopping process (PID: 12346)
[10:35:02] feat-a: Stopped
[10:35:02] feat-b: Stopped

Aborted 2 pipelines. Worktrees preserved for debugging:
  • .claude/worktrees/feat-feat-a/
  • .claude/worktrees/feat-feat-b/

To clean up: murmur8 parallel cleanup
```

### Abort with Cleanup

```
$ murmur8 parallel abort --cleanup

Stopping parallel pipelines...

[10:35:01] feat-a: Stopping process (PID: 12345)
[10:35:02] feat-a: Stopped
[10:35:02] feat-a: Removing worktree

Aborted 1 pipeline. Worktrees removed.
```

### Ctrl+C Handling

```
$ murmur8 parallel feat-a feat-b feat-c

Starting parallel pipelines...
[10:30:01] feat-a: Started
[10:30:02] feat-b: Started

^C
Received interrupt signal. Stopping pipelines...

[10:31:15] feat-a: Stopped
[10:31:15] feat-b: Stopped

Aborted. Worktrees preserved. Run 'murmur8 parallel cleanup' to remove.
```

### Nothing Running

```
$ murmur8 parallel abort

No parallel pipelines are currently running.
```

---

## 4. Implementation Notes

- Read PIDs from queue file or lock file
- Send SIGTERM first, then SIGKILL after timeout
- Update queue state for each feature to 'aborted'
- Register handler for SIGINT (Ctrl+C) in main process
- `--cleanup` flag triggers worktree removal after abort

---

## 5. Test Themes

- Abort stops running processes
- Queue state updated to 'aborted'
- Worktrees preserved by default
- `--cleanup` removes worktrees
- Ctrl+C triggers graceful shutdown
- No-op when nothing running
- Lock file removed after abort

---

## 6. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-25 | Initial spec | Parallel safeguards |
