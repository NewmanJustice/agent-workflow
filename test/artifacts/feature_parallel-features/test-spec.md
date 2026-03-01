# Test Specification - Parallel Features

## Understanding

The parallel features capability enables concurrent execution of multiple feature pipelines using git worktrees for isolation. Users invoke `murmur8 parallel <slug1> <slug2> ... <slugN>` to process multiple features simultaneously. Each feature runs in its own worktree/branch, with results merged back to main on completion.

Key behaviors: git worktree creation per feature, independent pipeline execution, merge-on-completion strategy, concurrency limiting (default 3), conflict escalation to user, and status reporting across parallel executions. Failed worktrees are preserved for debugging; successful ones are cleaned up.

---

## Feature Requirement to Test ID Mapping

### Worktree Management

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-1 | T-WM-1.1 | Worktree created at `.claude/worktrees/feat-{slug}` |
| R-1 | T-WM-1.2 | Branch `feature/{slug}` created from current HEAD |
| R-2 | T-WM-2.1 | Worktree removed after successful merge |
| R-2 | T-WM-2.2 | Worktree preserved on pipeline failure |
| R-2 | T-WM-2.3 | Worktree preserved on merge conflict |

### Pre-flight Validation

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-3 | T-PV-1.1 | Rejects if not in git repository |
| R-3 | T-PV-1.2 | Rejects if working tree is dirty |
| R-3 | T-PV-1.3 | Validates git version 2.5+ for worktree support |

### Concurrency Control

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-4 | T-CC-1.1 | Default maxConcurrency is 3 |
| R-4 | T-CC-1.2 | Excess features queued when limit exceeded |
| R-4 | T-CC-1.3 | Queued features start as slots free up |
| R-4 | T-CC-1.4 | Custom maxConcurrency respected |

### Pipeline Execution

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-5 | T-PE-1.1 | Pipeline initialized in worktree |
| R-5 | T-PE-1.2 | Each pipeline runs independently |
| R-5 | T-PE-1.3 | Pipeline failure isolated to single worktree |
| R-5 | T-PE-1.4 | Other pipelines continue on single failure |

### Merge Handling

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-6 | T-MH-1.1 | Fast-forward merge when possible |
| R-6 | T-MH-1.2 | Regular merge commit when no fast-forward |
| R-6 | T-MH-1.3 | Features merge in completion order |
| R-7 | T-MH-2.1 | Conflict detected and escalated |
| R-7 | T-MH-2.2 | Branch preserved on conflict |
| R-7 | T-MH-2.3 | User notification on conflict |

### Status Reporting

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-8 | T-SR-1.1 | `parallel status` shows all pipelines |
| R-8 | T-SR-1.2 | Per-feature state visible |
| R-8 | T-SR-1.3 | Final summary shows completed/failed/conflict counts |

### State Management

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-9 | T-SM-1.1 | State transitions: queued -> worktree_created -> running |
| R-9 | T-SM-1.2 | State transitions: running -> merge_pending -> complete |
| R-9 | T-SM-1.3 | State transitions: running -> failed (preserved) |
| R-9 | T-SM-1.4 | State transitions: merge_pending -> conflict |

### User Control

| Req | Test ID | Scenario |
|-----|---------|----------|
| R-10 | T-UC-1.1 | Single feature can be aborted |
| R-10 | T-UC-1.2 | All features can be aborted |
| R-10 | T-UC-1.3 | Aborted worktrees cleaned up |

---

## Key Assumptions

- Parallel module will be at `src/parallel.js` exporting `parallel()` and `parallelStatus()` functions
- CLI routing added to `bin/cli.js` for `parallel` and `parallel status` commands
- Git operations use child_process.execSync or similar synchronous calls
- Worktree paths follow pattern `.claude/worktrees/feat-{slug}`
- Branch names follow pattern `feature/{slug}`
- Concurrency limit configurable via `--max-concurrency=N` flag or config
- Queue state persisted to `.claude/parallel-queue.json` for recovery
- Git version check uses `git --version` output parsing
