# Feature Specification — Murmuration Sub-Agent Architecture

## 1. Feature Intent
**Why this feature exists.**

- Current murmuration spawns separate CLI processes (`npx claude`) which fails inside existing Claude sessions
- The `/implement-feature` skill already uses Task sub-agents for Alex/Cass/Nigel/Codey
- Extending this pattern to run multiple feature pipelines in parallel is natural and efficient
- Enables true parallel execution without leaving the current Claude Code session

> This feature changes how murmuration works: from process spawning to Task sub-agent orchestration.

---

## 2. Scope
### In Scope
- Modify SKILL.md to accept multiple slugs
- Add worktree creation/cleanup logic to the skill
- Spawn parallel Task sub-agents (one full pipeline per feature)
- Merge results back to main branch
- Handle conflicts and failures gracefully

### Out of Scope
- Changing the single-feature pipeline flow
- Removing CLI process spawning (keep for CI/automation use cases)
- Adding new agent types
- Changing worktree locations or branch naming

---

## 3. Actors Involved

- **User**: Invokes `/implement-feature slug-a slug-b slug-c`
- **Orchestrator (Claude)**: Reads skill, creates worktrees, spawns parallel Tasks
- **Task Sub-agents**: Each runs a complete pipeline in isolation
- **Git**: Provides worktree isolation and branch merging

---

## 4. Behaviour Overview

**Single slug (existing):**
```
/implement-feature "slug"
  → Sequential: Alex → Cass → Nigel → Codey
  → Commit to current branch
```

**Multiple slugs (new):**
```
/implement-feature slug-a slug-b slug-c
  → Create worktrees for isolation
  → Parallel Tasks: each runs full pipeline
  → Merge successful branches to main
  → Cleanup worktrees
```

---

## 5. State & Lifecycle Interactions

- **Worktree creation**: New state - `.claude/worktrees/feat-{slug}/`
- **Branch creation**: New branches `feature/{slug}` per feature
- **Merge state**: Successful features merged to main
- **Conflict state**: Failed merges preserved for manual resolution

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Multi-feature detection | `slugs.length > 1` triggers murmuration mode |
| Worktree isolation | Each feature gets dedicated worktree |
| Parallel execution | All Task sub-agents spawned in single message |
| No cross-contamination | Sub-agents work only in their worktree |
| Merge order | First-completed = first-merged |
| Conflict handling | Preserve branch, don't force |

---

## 7. Dependencies

- Git 2.5+ (worktree support)
- Clean working tree before starting
- Task tool supports concurrent invocations
- Sufficient context window for multiple sub-agent prompts

---

## 8. Non-Functional Considerations

- **Context usage**: Each parallel Task adds ~2-3k tokens to the prompt
- **Parallelism limit**: Recommend max 3-5 concurrent features
- **Failure isolation**: One feature's failure doesn't affect others
- **Recovery**: Failed worktrees preserved for debugging/retry

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Task tool executes concurrent calls truly in parallel
- Sub-agents can write to worktree paths
- Git merge from worktree branches works as expected

**Open Questions:**
- What's the practical limit on concurrent Task sub-agents?
- Should there be a `--max-concurrency` flag?
- How to handle partial success (some merge, some conflict)?

---

## 10. Impact on System Specification

- Extends the skill's capabilities without changing core agent behavior
- Murmuration becomes an in-session feature rather than external process
- CLI `murm` command could detect in-session mode and delegate to skill

---

## 11. Handover to BA (Cass)

**Skip Cass stage** — this is a technical/infrastructure feature.

Direct handover to Nigel:
- Test multi-slug parsing
- Test worktree creation/cleanup
- Test parallel execution (mock Task tool)
- Test merge success/conflict handling

---

## 12. Change Log
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-03-03 | Initial spec | Enable parallel features via sub-agents | Alex |
