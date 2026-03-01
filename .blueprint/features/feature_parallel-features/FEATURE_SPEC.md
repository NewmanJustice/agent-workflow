# Feature Specification — Parallel Features

## 1. Feature Intent

**Why this feature exists.**

murmur8 currently processes features sequentially through the Alex, Cass, Nigel, Codey pipeline. For projects with large backlogs, this creates a bottleneck: only one feature can be in progress at any time. The system specification explicitly notes this as a known limitation: "Pipeline is sequential; no parallel agent execution" and "Single-feature focus; no batch processing" (see `.blueprint/system_specification/SYSTEM_SPEC.md` Section 10).

This feature enables **parallel execution of multiple feature pipelines** using git worktrees for isolation. Each feature runs in its own worktree/branch, allowing simultaneous development. Results are merged back to the main branch when complete.

**Problem being addressed:**
- Sequential processing is slow for large backlogs
- Users with multiple features to implement must wait for each to complete
- Development throughput is constrained by single-feature pipeline design

**User need:**
- Developers want to queue multiple features and have them processed concurrently
- Teams want faster turnaround on feature backlogs

**Alignment with system purpose:**
- Extends the core pipeline without modifying agent behaviour
- Maintains specification-first, test-driven approach per feature
- Preserves traceability and artifact integrity within each worktree

---

## 2. Scope

### In Scope

- New CLI command: `murmur8 parallel <slug1> <slug2> ... <slugN>`
- Git worktree creation per feature (one worktree = one feature)
- Independent pipeline execution in each worktree
- Merge strategy for completed features back to main branch
- Queue management for parallel pipelines
- Status reporting across parallel executions
- Conflict detection and handling on merge

### Out of Scope

- Parallelisation within a single feature pipeline (agents remain sequential per feature)
- Cross-feature dependency resolution during parallel execution
- CI/CD integration for parallel pipelines
- IDE integration for worktree management
- Custom merge strategies beyond standard git merge

---

## 3. Actors Involved

### Human User
- **Can do:** Invoke parallel command with multiple feature slugs, monitor progress, resolve merge conflicts, abort individual pipelines
- **Cannot do:** Run parallel pipelines without git repository, modify running pipeline's worktree directly without risking state corruption

### murmur8 CLI
- **Can do:** Create/manage worktrees, spawn parallel pipelines, merge completed features, report status
- **Cannot do:** Automatically resolve merge conflicts (escalates to user)

### Agent Pipeline (per worktree)
- **Can do:** Execute standard Alex, Cass, Nigel, Codey flow in isolation
- **Cannot do:** Access or modify other worktrees, communicate with parallel pipeline instances

---

## 4. Behaviour Overview

### Happy Path

1. User invokes `murmur8 parallel feat-a feat-b feat-c`
2. System validates git repository state (clean working tree, on main/target branch)
3. For each feature slug:
   - Create git worktree at `.claude/worktrees/feat-{slug}`
   - Create new branch `feature/{slug}` from current HEAD
   - Initialize pipeline queue in worktree
4. Spawn parallel pipeline processes (one per worktree)
5. Each pipeline executes independently: Alex, Cass, Nigel, Codey
6. As each completes:
   - Merge feature branch back to main (fast-forward when possible)
   - Remove worktree
   - Update aggregate status
7. Report final status: completed, failed, merge conflicts

### Key Alternatives

- **Merge conflict:** Pipeline completes but merge fails. Feature branch preserved, user notified, manual resolution required.
- **Pipeline failure:** Individual feature fails. Other pipelines continue. Failed worktree preserved for debugging.
- **User abort:** Single feature or all features can be aborted. Aborted worktrees are cleaned up.

### User-Visible Outcomes

- Multiple features processed simultaneously (wall-clock time reduction)
- Independent commits per feature on main branch
- Clear status reporting per feature
- Preserved worktrees on failure for inspection

---

## 5. State & Lifecycle Interactions

### States Introduced

| State | Description |
|-------|-------------|
| **parallel_queued** | Feature slug accepted for parallel processing |
| **worktree_created** | Git worktree and branch created for feature |
| **parallel_running** | Pipeline executing in worktree |
| **merge_pending** | Pipeline complete, awaiting merge to main |
| **merge_conflict** | Merge attempted but conflicts detected |
| **parallel_complete** | Feature merged successfully |
| **parallel_failed** | Pipeline or merge failed |

### State Transitions

```
parallel_queued → worktree_created → parallel_running → merge_pending
                                           ↓                  ↓
                                    parallel_failed   ┌──────────────┐
                                           ↓          │merge_conflict│
                                    (preserve worktree)└──────────────┘
                                                             ↓
                                                   (user resolves)
                                                             ↓
                                                   parallel_complete
```

### This Feature Is

- **State-creating:** Introduces parallel pipeline state model
- **State-transitioning:** Manages transitions through parallel lifecycle
- **State-constraining:** Enforces clean git state before starting

---

## 6. Rules & Decision Logic

### Rule: Worktree Isolation

- **Description:** Each feature runs in an isolated git worktree
- **Inputs:** Feature slug, current git HEAD
- **Outputs:** Worktree path, branch name
- **Deterministic:** Yes - same slug always produces same paths

### Rule: Concurrency Limit

- **Description:** Maximum number of concurrent pipelines (default: 3, configurable)
- **Inputs:** Requested feature count, `maxConcurrency` setting
- **Outputs:** Number of pipelines to spawn, remaining queued
- **Deterministic:** Yes - capped at limit, overflow queued

### Rule: Merge Order

- **Description:** Features merge in completion order (first finished, first merged)
- **Inputs:** Completion timestamps per feature
- **Outputs:** Merge sequence
- **Deterministic:** No - depends on pipeline execution time

### Rule: Conflict Escalation

- **Description:** Merge conflicts escalate to user rather than auto-resolve
- **Inputs:** Git merge result
- **Outputs:** Success or conflict report with preserved branch
- **Deterministic:** Yes - conflicts always escalate

---

## 7. Dependencies

### System Components

- Git (worktree support requires git 2.5+)
- murmur8 queue management (`src/orchestrator.js`)
- Pipeline execution (`SKILL.md` / implement-feature)
- Node.js child process spawning

### Technical Dependencies

- Clean git working tree (uncommitted changes block parallel start)
- Sufficient disk space for worktrees (each is a full checkout)
- Available system processes for concurrent execution

### Operational Dependencies

- Network access if agents require external resources
- Claude API availability for all parallel pipelines

---

## 8. Non-Functional Considerations

### Performance

- Pipeline execution time reduced by parallelism factor (N features in ~1 pipeline time vs N x pipeline time)
- Disk space increases linearly with concurrent worktrees
- Memory/CPU scales with concurrent agent processes

### Observability

- Aggregate status command: `murmur8 parallel status`
- Per-feature status visible in each worktree's queue file
- Completion/failure notifications per feature

### Error Handling

- Pipeline failures isolated to single worktree
- Failed worktrees preserved for debugging (not auto-cleaned)
- Partial success possible (some features complete, others fail)

### Resource Management

- Worktrees cleaned up on success
- Failed/conflict worktrees require manual cleanup or `--cleanup` flag
- Queue tracks worktree locations for recovery

---

## 9. Assumptions & Open Questions

### Assumptions

- Users have git 2.5+ installed (worktree support)
- Working tree is clean before invoking parallel command
- Sufficient disk space for N concurrent worktrees
- Features are independent (no cross-feature code dependencies)
- Main branch is the merge target (configurable?)

### Open Questions

1. **Merge strategy:** Should we support squash merge, rebase, or merge commit options?
2. **Failure handling:** Should failed features block others from merging, or proceed independently?
3. **Resource limits:** What is a sensible default for maxConcurrency? (Proposed: 3)
4. **Progress reporting:** Real-time progress per worktree, or periodic aggregate status?
5. **Branch naming:** Should branch names be configurable, or always `feature/{slug}`?
6. **Cleanup policy:** Auto-cleanup failed worktrees after N days, or require explicit cleanup?

---

## 10. Impact on System Specification

### Reinforces Existing Assumptions

- Maintains agent role boundaries (each agent behaves identically in worktree)
- Preserves artifact structure (same paths, just in worktree)
- Keeps sequential agent flow per feature

### Stretches Existing Assumptions

- Queue model expands: system-level parallel queue + per-worktree queues
- "Single current feature" invariant becomes "single current feature per worktree"
- Recovery now spans multiple worktrees

### Tensions Requiring Decision

**Tension 1:** System spec states "Single current: Only one feature can be current at a time" (Section 7). This feature introduces multiple concurrent "current" features across worktrees.

**Proposed resolution:** Reframe the invariant: "Only one feature can be current per pipeline instance (worktree)." The parallel orchestrator manages multiple pipeline instances, each respecting the single-current invariant internally.

**Tension 2:** System spec notes "Pipeline is sequential" as a known limitation. This feature partially addresses this at the feature level but not the agent level.

**Proposed resolution:** Update Known Limitations section to distinguish "sequential agents within feature" (unchanged) from "sequential features across pipeline" (now optional via parallel mode).

---

## 11. Handover to BA (Cass)

### Story Themes

1. **Parallel invocation:** User starts multiple features in parallel mode
2. **Worktree lifecycle:** Creation, isolation, and cleanup of worktrees
3. **Status monitoring:** User tracks progress across parallel pipelines
4. **Merge handling:** Successful merges and conflict resolution
5. **Failure recovery:** Handling failed pipelines without blocking others

### Expected Story Boundaries

- Each story should cover one actor's interaction with one lifecycle phase
- Merge conflict story should be separate from happy-path merge
- Status reporting could be its own story

### Areas Needing Careful Story Framing

- **Concurrency limits:** Story should clarify what happens when user requests more features than maxConcurrency
- **Partial failure:** What user actions are available when some features succeed and others fail?
- **Cleanup:** When and how are worktrees removed? Manual vs automatic?

---

## 12. Change Log (Feature-Level)

| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-25 | Initial feature specification | Feature proposed in FEATURE_IDEAS.md | Alex |
