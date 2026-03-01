# Feature Specification — Parallel Confirm

## 1. Feature Intent

Prevent accidental execution of parallel pipelines by requiring user confirmation before starting. Users should see exactly what will happen (worktrees created, pipelines spawned, estimated resources) and explicitly confirm they want to proceed.

**Problem:** Running `murmur8 parallel feat-a feat-b feat-c` immediately starts creating worktrees and spawning processes. Users might run this accidentally or without understanding the impact.

**Solution:** Show a summary and prompt for confirmation before execution.

---

## 2. Scope

### In Scope
- Confirmation prompt showing execution plan
- `--yes` / `-y` flag to skip confirmation (for automation)
- Clear summary of what will happen

### Out of Scope
- Interactive editing of the plan
- Cost estimation (separate feature)

---

## 3. Behaviour Overview

### Happy Path

```
$ murmur8 parallel user-auth dashboard notifications

This will:
  • Create 3 git worktrees in .claude/worktrees/
  • Start 3 parallel pipelines (max concurrent: 3)
  • Branches: feature/user-auth, feature/dashboard, feature/notifications

Continue? [y/N] y

Starting parallel pipelines...
```

### Skip Confirmation

```
$ murmur8 parallel user-auth dashboard --yes
Starting parallel pipelines...
```

### User Declines

```
$ murmur8 parallel user-auth dashboard

This will:
  • Create 2 git worktrees in .claude/worktrees/
  • Start 2 parallel pipelines (max concurrent: 3)

Continue? [y/N] n

Aborted.
```

---

## 4. Implementation Notes

- Add confirmation logic after dry-run check, before actual execution
- Use `readline` for prompt in Node.js
- Check `options.yes` flag to skip
- Exit with code 0 on user abort (not an error)

---

## 5. Test Themes

- Confirmation shown by default
- `--yes` flag skips confirmation
- `-y` shorthand works
- User typing 'n' or Enter aborts
- User typing 'y' or 'Y' proceeds
- Abort exits cleanly (code 0)

---

## 6. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-25 | Initial spec | Parallel safeguards |
