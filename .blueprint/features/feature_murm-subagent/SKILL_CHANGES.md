# SKILL.md Changes for Multi-Feature Support

This document outlines the changes needed to support parallel feature execution via Task sub-agents.

---

## 1. Update Invocation Section (replace lines 28-39)

```markdown
## Invocation

```bash
# Single feature (existing)
/implement-feature                                    # Interactive slug prompt
/implement-feature "user-auth"                        # New feature
/implement-feature "user-auth" --interactive          # Force interactive spec creation
/implement-feature "user-auth" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "user-auth" --no-commit
/implement-feature "user-auth" --no-feedback
/implement-feature "user-auth" --no-validate
/implement-feature "user-auth" --no-history

# Multiple features — parallel execution (NEW)
/implement-feature feat-a feat-b feat-c              # Run 3 features in parallel
/implement-feature feat-a feat-b --max-concurrency=2 # Limit parallelism
/implement-feature feat-a feat-b --sequential        # Run one at a time (no worktrees)
```
```

---

## 2. Add Multi-Feature Paths (insert after line 27)

```markdown
## Multi-Feature Paths (Murmuration Mode)

| Var | Path |
|-----|------|
| `{WORKTREE_DIR}` | `.claude/worktrees` |
| `{WORKTREE_slug}` | `{WORKTREE_DIR}/feat-{slug}` |
| `{MURM_QUEUE}` | `.claude/murm-queue.json` |
| `{MURM_LOCK}` | `.claude/murm.lock` |
```

---

## 3. Add Multi-Feature Pipeline Overview (insert after line 65)

```markdown
## Multi-Feature Pipeline Overview

When multiple slugs are provided, the pipeline uses worktree isolation and parallel Task sub-agents:

```
/implement-feature slug-a slug-b slug-c
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ M0. Detect multi-feature mode                       │
│ M1. Pre-flight validation for ALL features          │
│ M2. Check for file overlap conflicts                │
│ M3. Create git worktrees (one per feature)          │
└─────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ M4. Spawn PARALLEL Task sub-agents                  │
│                                                     │
│   Task(slug-a)  ─┐                                  │
│   Task(slug-b)  ─┼─► Run concurrently               │
│   Task(slug-c)  ─┘                                  │
│                                                     │
│   Each Task runs full pipeline in its worktree:     │
│   Alex → [Cass] → Nigel → Codey                     │
└─────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ M5. Collect results as sub-agents complete          │
│ M6. Merge successful features to main               │
│ M7. Report conflicts/failures                       │
│ M8. Cleanup worktrees                               │
└─────────────────────────────────────────────────────┘
```
```

---

## 4. Add Step M0-M3: Multi-Feature Setup (new section after Step 0)

```markdown
---

## Step M0: Multi-Feature Detection

**Trigger:** More than one slug provided in arguments.

Parse all slugs from arguments:
```
/implement-feature feat-a feat-b feat-c --no-commit
→ slugs = ["feat-a", "feat-b", "feat-c"]
→ flags = { noCommit: true }
```

If `slugs.length > 1`: Enter murmuration mode (Steps M1-M8)
If `slugs.length === 1`: Continue to Step 1 (single-feature mode)

---

## Step M1: Multi-Feature Pre-flight Validation

For EACH slug, verify:
1. Feature spec exists at `.blueprint/features/feature_{slug}/FEATURE_SPEC.md`
2. Spec has required sections (Intent, Scope, Actors)

**Display validation table:**
```
Pre-flight Validation
=====================

✓ feat-a: Spec complete, 3 stories
✓ feat-b: Spec complete, 2 stories
✗ feat-c: Missing FEATURE_SPEC.md
```

**On any failure:**
- Show which features are not ready
- Suggest: `/implement-feature "feat-c" --pause-after=alex` to create spec
- Ask: "Continue with ready features only?" or "Abort"

---

## Step M2: Conflict Detection

Scan implementation plans (if they exist) for file overlap:

```bash
# For each feature with IMPLEMENTATION_PLAN.md, extract "Files to Create/Modify"
grep -h "src/\|lib/\|bin/" .blueprint/features/feature_*/IMPLEMENTATION_PLAN.md
```

**Display if conflicts found:**
```
Conflict Analysis
=================

⚠ File overlap detected:
  • src/utils.js: feat-a, feat-b both modify

Recommendation: Run feat-a and feat-b sequentially, or resolve manually.
```

**On conflict:** Ask user to confirm or adjust feature list.

---

## Step M3: Create Worktrees

For each validated slug, create an isolated git worktree:

```bash
# Ensure clean working tree
git status --porcelain

# Create worktrees
git worktree add .claude/worktrees/feat-{slug-a} -b feature/{slug-a}
git worktree add .claude/worktrees/feat-{slug-b} -b feature/{slug-b}
git worktree add .claude/worktrees/feat-{slug-c} -b feature/{slug-c}
```

**Announce:**
```
Creating worktrees...
  ✓ .claude/worktrees/feat-a → branch feature/feat-a
  ✓ .claude/worktrees/feat-b → branch feature/feat-b
  ✓ .claude/worktrees/feat-c → branch feature/feat-c
```
```

---

## 5. Add Step M4: Parallel Pipeline Execution (the key change)

```markdown
---

## Step M4: Spawn Parallel Feature Pipelines

**CRITICAL:** Use multiple Task tool calls IN THE SAME MESSAGE to run concurrently.

For each feature, spawn a Task sub-agent that runs the COMPLETE pipeline in its worktree.

**Spawn all Task sub-agents in parallel:**

### Task for {slug-a}:
Use the Task tool with `subagent_type="general-purpose"`:

```
You are running the implement-feature pipeline for "{slug-a}".

## Working Directory
All file operations must be relative to: .claude/worktrees/feat-{slug-a}

## Task
Run the complete feature pipeline:

1. **Alex** — Read feature spec, create/verify handoff summary
   - Input: .claude/worktrees/feat-{slug-a}/.blueprint/features/feature_{slug-a}/FEATURE_SPEC.md
   - Output: handoff-alex.md (if missing)

2. **Classify** — Determine if technical or user-facing
   - Technical (refactoring, optimization, infra): Skip to Nigel
   - User-facing: Continue to Cass

3. **Cass** (if user-facing) — Write user stories
   - Output: story-*.md files, handoff-cass.md

4. **Nigel** — Create tests
   - Output: test/artifacts/feature_{slug-a}/test-spec.md
   - Output: test/feature_{slug-a}.test.js
   - Output: handoff-nigel.md

5. **Codey Plan** — Create implementation plan
   - Output: IMPLEMENTATION_PLAN.md

6. **Codey Implement** — Write code to pass tests
   - Run tests: node --test test/feature_{slug-a}.test.js
   - Iterate until tests pass

## Rules
- Work ONLY in .claude/worktrees/feat-{slug-a}
- Do NOT commit changes
- Do NOT modify files outside the worktree
- Report final status: success/failed + summary

## Completion
Return JSON status:
{"slug": "{slug-a}", "status": "success|failed", "tests": "X/Y passing", "files": ["list"]}
```

### Task for {slug-b}:
(Same prompt structure, different slug and worktree path)

### Task for {slug-c}:
(Same prompt structure, different slug and worktree path)

**Key:** All three Task tool calls are made in a SINGLE assistant message, enabling concurrent execution.
```

---

## 6. Add Step M5-M8: Results & Cleanup (new section)

```markdown
---

## Step M5: Collect Results

As each Task sub-agent completes, collect its status:

```javascript
results = [
  { slug: "feat-a", status: "success", tests: "5/5", files: [...] },
  { slug: "feat-b", status: "success", tests: "3/3", files: [...] },
  { slug: "feat-c", status: "failed", error: "Nigel tests failed" }
]
```

---

## Step M6: Merge Successful Features

For each feature with `status: "success"`:

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/{slug} --no-edit

# On success: record merge
# On conflict: preserve branch for manual resolution
```

**Handle merge conflicts:**
- Do NOT force or abort
- Record conflict: `{ slug, status: "conflict", branch: "feature/{slug}" }`
- Worktree preserved for manual resolution

---

## Step M7: Report Summary

**Display murmuration summary:**
```
--- Murmuration Complete ---

## Landed (merged to main)
  ✓ feat-a: 5 tests, 3 files
  ✓ feat-b: 3 tests, 2 files

## Turbulence (merge conflicts)
  ⚠ (none)

## Lost Formation (failed)
  ✗ feat-c: Nigel tests failed
    Worktree preserved: .claude/worktrees/feat-c
    To retry: cd .claude/worktrees/feat-c && /implement-feature feat-c

## Next Steps
- Run `node --test` to verify all tests pass
- Review any preserved worktrees
```

---

## Step M8: Cleanup Worktrees

For successfully merged features:
```bash
git worktree remove .claude/worktrees/feat-{slug} --force
git branch -d feature/{slug}
```

Preserve worktrees for:
- Failed features (for debugging)
- Merge conflicts (for manual resolution)
```

---

## Summary of Changes

| Section | Change Type | Description |
|---------|-------------|-------------|
| Invocation | Modify | Add multi-slug syntax |
| Paths | Add | Worktree path variables |
| Pipeline Overview | Add | Multi-feature flow diagram |
| Step M0 | Add | Multi-feature detection |
| Step M1 | Add | Batch pre-flight validation |
| Step M2 | Add | Conflict detection |
| Step M3 | Add | Worktree creation |
| Step M4 | Add | **Parallel Task spawning** |
| Step M5-M8 | Add | Results, merge, cleanup |
