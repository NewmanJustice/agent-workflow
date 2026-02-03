---
name: implement-feature
description: Run the Alex → Cass → Nigel → Codey pipeline using Task tool sub-agents
---

# Implement Feature Skill

## Paths

| Var | Path |
|-----|------|
| `{SYS_SPEC}` | `.blueprint/system_specification/SYSTEM_SPEC.md` |
| `{FEAT_DIR}` | `.blueprint/features/feature_{slug}` |
| `{FEAT_SPEC}` | `{FEAT_DIR}/FEATURE_SPEC.md` |
| `{STORIES}` | `{FEAT_DIR}/story-*.md` |
| `{TEST_DIR}` | `./test/artifacts/feature_{slug}` |
| `{TEST_FILE}` | `./test/feature_{slug}.test.js` |
| `{PLAN}` | `{FEAT_DIR}/IMPLEMENTATION_PLAN.md` |
| `{QUEUE}` | `.claude/implement-queue.json` |

## Invocation

```bash
/implement-feature                                    # Interactive
/implement-feature "user-auth"                        # New feature
/implement-feature "user-auth" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "user-auth" --no-commit
```

## Pipeline Overview

```
/implement-feature "slug"
       │
       ▼
┌─────────────────────────────────────────┐
│ 1. Parse args, get slug                 │
│ 2. Check system spec exists (gate)      │
│ 3. Initialize queue                     │
│ 4. Route based on flags/state           │
└─────────────────────────────────────────┘
       │
       ▼
   SPAWN ALEX → SPAWN CASS → SPAWN NIGEL → SPAWN CODEY → AUTO-COMMIT
```

---

## Steps 1-5: Setup

### Step 1: Parse Arguments
Extract: `{slug}`, pause gates (`--pause-after`), `--no-commit`

### Step 2: Get Feature Slug
If not provided: Ask user, convert to slug format (lowercase, hyphens), confirm.

### Step 3: System Spec Gate
Check `{SYS_SPEC}` exists. If not: run Alex to create it, then **stop for review**.

### Step 4: Route
- Slug exists at `{FEAT_DIR}` → ask: continue from last state or restart
- No slug → new feature pipeline

### Step 5: Initialize
Create/read `{QUEUE}`. Ensure dirs exist: `mkdir -p {FEAT_DIR} {TEST_DIR}`

---

## Step 6: Spawn Alex Agent

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Alex, the System Specification & Chief-of-Staff Agent.

Read your full specification from: .blueprint/agents/AGENT_SPECIFICATION_ALEX.md

## Your Task
Create a feature specification for "{slug}".

## Inputs (read these files)
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md
- Template: .blueprint/templates/FEATURE_SPEC.md
- Business Context: .business_context/

## Output (write this file)
Write the feature spec to: {FEAT_DIR}/FEATURE_SPEC.md

## Completion
When done, summarize:
- Feature intent
- Key behaviours
- Scope boundaries
- Story themes you recommend
- Any system spec tensions found
```

**On completion:**
1. Verify `{FEAT_SPEC}` exists
2. Update queue: move feature to `cassQueue`
3. If `--pause-after=alex`: Show output path, ask user to continue

**On failure:** Ask user (retry / skip / abort)

---

## Step 7: Spawn Cass Agent

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Cass, the Story Writer Agent.

Read your full specification from: .blueprint/agents/AGENT_BA_CASS.md

## Your Task
Create user stories for feature "{slug}".

## Inputs (read these files)
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md

## Output (write these files)
Create one markdown file per user story in {FEAT_DIR}/:
- story-{story-slug}.md (e.g., story-login.md, story-logout.md)

Each story must include:
- User story in standard format
- Context/scope
- Acceptance criteria (Given/When/Then)
- Session persistence shape (if relevant)
- Out of scope items

## Completion
When done, summarize:
- Number of stories created
- Story filenames
- Key behaviours covered
```

**On completion:**
1. Verify at least one `story-*.md` exists in `{FEAT_DIR}`
2. Update queue: move feature to `nigelQueue`
3. If `--pause-after=cass`: Show story paths, ask user to continue

**On failure:** Ask user (retry / skip / abort)

---

## Step 8: Spawn Nigel Agent

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Nigel, the Tester Agent.

Read your full specification from: .blueprint/agents/AGENT_TESTER_NIGEL.md

## Your Task
Create tests for feature "{slug}".

## Inputs (read these files)
- Stories: {FEAT_DIR}/story-*.md
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- System Spec: .blueprint/system_specification/SYSTEM_SPEC.md

## Outputs (write these files)
1. Test artifacts in {TEST_DIR}/:
   - understanding.md
   - test-plan.md
   - test-behaviour-matrix.md
   - implementation-guide.md

2. Executable tests:
   - {TEST_FILE}

## Completion
When done, summarize:
- Test count
- Coverage of acceptance criteria
- Key assumptions made
```

**On completion:**
1. Verify `{TEST_FILE}` exists
2. Update queue: move feature to `codeyQueue`
3. If `--pause-after=nigel`: Show test paths, ask user to continue

**On failure:** Ask user (retry / skip / abort)

---

## Step 9: Spawn Codey Agent (Plan)

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

Read your full specification from: .blueprint/agents/AGENT_DEVELOPER_CODEY.md

## Your Task
Create an implementation plan for feature "{slug}". Do NOT implement yet.

## Inputs (read these files)
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- Stories: {FEAT_DIR}/story-*.md
- Test Artifacts: {TEST_DIR}/
- Tests: {TEST_FILE}

## Output (write this file)
Write implementation plan to: {FEAT_DIR}/IMPLEMENTATION_PLAN.md

Plan structure:
## Summary
## Understanding (behaviors, test count)
## Files to Create/Modify
## Implementation Steps
## Data Model (if applicable)
## Validation Rules
## Risks/Questions
## Definition of Done
```

**On completion:**
1. Verify `{PLAN}` exists
2. If `--pause-after=codey-plan`: Show plan path, ask user to continue

**On failure:** Ask user (retry / skip / abort)

---

## Step 10: Spawn Codey Agent (Implement)

Use the Task tool with `subagent_type="general-purpose"`:

**Prompt:**
```
You are Codey, the Developer Agent.

Read your full specification from: .blueprint/agents/AGENT_DEVELOPER_CODEY.md

## Your Task
Implement feature "{slug}" according to the plan.

## Inputs (read these files)
- Implementation Plan: {FEAT_DIR}/IMPLEMENTATION_PLAN.md
- Feature Spec: {FEAT_DIR}/FEATURE_SPEC.md
- Stories: {FEAT_DIR}/story-*.md
- Test Artifacts: {TEST_DIR}/
- Tests: {TEST_FILE}

## Process
1. Run tests to establish baseline: npm test
2. Implement code to make tests pass
3. Run npm test to verify all tests pass
4. Run npm run lint (if available) to verify code quality

## Important
- Do NOT commit changes
- Do NOT modify test assertions unless they contain bugs
- Focus on making tests pass

## Completion
When done, summarize:
- Files created/modified
- Test status (pass/fail count)
- Any issues encountered
```

**On completion:**
1. Run `npm test` to verify
2. Update queue: move feature to `completed`
3. Proceed to auto-commit (unless `--no-commit`)

**On failure:** Ask user (retry / skip / abort)

---

## Step 11: Auto-commit

If not `--no-commit`:

```bash
git add {FEAT_DIR}/ {TEST_DIR}/ {TEST_FILE}
# Add any implementation files created by Codey
git status --short
```

Commit message:
```
feat({slug}): Add {slug} feature

Artifacts:
- Feature spec by Alex
- User stories by Cass
- Tests by Nigel
- Implementation by Codey

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Step 12: Report Status

```
## Completed
- feature_{slug}
  - Stories: N
  - Tests: N (all passing)
  - Commit: {hash}

## Next Action
Pipeline complete. Run `npm test` to verify or `/implement-feature` for next feature.
```

---

## Error Handling

After each agent spawn, if the Task tool returns an error or output validation fails:

**Ask the user:**
1. **Retry** - Re-run the agent with same inputs
2. **Skip** - Move to next stage anyway (with warning about missing artifacts)
3. **Abort** - Stop pipeline, update queue with failure for recovery

**On abort:** Update queue `failed` array with:
```json
{
  "slug": "{slug}",
  "stage": "{stage}",
  "reason": "{error message}",
  "timestamp": "{ISO timestamp}"
}
```

---

## Queue Structure

Location: `.claude/implement-queue.json`

```json
{
  "lastUpdated": "2025-02-01T12:00:00Z",
  "current": {
    "slug": "user-auth",
    "stage": "cass",
    "startedAt": "2025-02-01T11:55:00Z"
  },
  "alexQueue": [],
  "cassQueue": [{ "slug": "user-auth", "featureSpec": "..." }],
  "nigelQueue": [],
  "codeyQueue": [],
  "completed": [{ "slug": "...", "testCount": 5, "commitHash": "abc123" }],
  "failed": []
}
```

---

## Recovery

Run `/implement-feature` again - reads queue and resumes from `current.stage`.

---

## Agent References

| Agent | File |
|-------|------|
| Alex | `.blueprint/agents/AGENT_SPECIFICATION_ALEX.md` |
| Cass | `.blueprint/agents/AGENT_BA_CASS.md` |
| Nigel | `.blueprint/agents/AGENT_TESTER_NIGEL.md` |
| Codey | `.blueprint/agents/AGENT_DEVELOPER_CODEY.md` |
