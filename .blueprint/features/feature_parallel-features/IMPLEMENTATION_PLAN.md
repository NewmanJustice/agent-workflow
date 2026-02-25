# Implementation Plan - Parallel Features

## Summary

Implement a new `src/parallel.js` module that enables concurrent execution of multiple feature pipelines using git worktrees for isolation. The module provides functions for worktree management, pre-flight validation, concurrency control, merge handling, status reporting, and state management. CLI integration adds `parallel` and `parallel status` commands to `bin/cli.js`.

---

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/parallel.js` | Create | Core parallel execution module with all exported functions |
| `bin/cli.js` | Modify | Add `parallel` and `parallel status` command routing |
| `.claude/parallel-queue.json` | Runtime | State persistence for parallel pipelines (auto-created) |

---

## Implementation Steps

1. **Create `src/parallel.js` with utility functions**
   - `buildWorktreePath(slug)` - returns `.claude/worktrees/feat-{slug}`
   - `buildBranchName(slug)` - returns `feature/{slug}`
   - `getDefaultConfig()` - returns `{ maxConcurrency: 3 }`
   - `getQueuePath(worktreePath)` - returns worktree-specific queue file path

2. **Add pre-flight validation functions**
   - `validatePreFlight({ isGitRepo, isDirty, gitVersion })` - returns `{ valid, errors }`
   - `isGitVersionSupported(versionString)` - parses version, returns true if >= 2.5.0

3. **Implement concurrency control**
   - `splitByLimit(slugs, maxConcurrency)` - returns `{ active, queued }`
   - `promoteFromQueue(state)` - moves first queued item to active when below limit

4. **Add worktree lifecycle helpers**
   - `shouldCleanupWorktree(state)` - returns true for `parallel_complete` or `aborted`, false for `parallel_failed` or `merge_conflict`

5. **Implement merge handling functions**
   - `canFastForward({ mainHead, branchBase })` - returns boolean
   - `hasMergeConflict(gitOutput)` - detects "CONFLICT" in output
   - `handleMergeConflict(state, conflictOutput?)` - transitions to `merge_conflict` status
   - `orderByCompletion(features)` - sorts by `completedAt` timestamp

6. **Add state management**
   - `transition(state, newStatus)` - validates and applies state transitions
   - Valid transitions: queued->worktree_created->running->merge_pending->complete
   - Error transitions: running->failed, merge_pending->conflict

7. **Implement status reporting**
   - `formatStatus(states)` - multi-line status output
   - `formatFeatureStatus(state)` - single feature line
   - `summarizeFinal(results)` - returns `{ completed, failed, conflicts }`
   - `aggregateResults(results)` - returns `{ completed, failed, total }`

8. **Add user control functions**
   - `abortFeature(states, slug)` - sets single feature to `aborted`
   - `abortAll(states)` - sets all features to `aborted`

9. **Implement pipeline execution helpers**
   - `buildPipelineCommand(slug, worktreePath)` - constructs claude command string

10. **Integrate with CLI in `bin/cli.js`**
    - Add `parallel` command: parse slugs and flags, invoke parallel execution
    - Add `parallel status` subcommand: invoke `formatStatus` with current state

---

## Risks/Questions

- **Git availability**: Functions assume synchronous git operations via `child_process.execSync`; actual git calls deferred to integration phase
- **Queue path collision**: Per-worktree queues use existing `QUEUE_PATH` pattern; ensure no conflicts with main queue
- **Process spawning**: Actual concurrent pipeline spawning not covered by unit tests; requires integration testing
- **Merge ordering**: First-completed-first-merged may cause conflicts; document as expected behavior
