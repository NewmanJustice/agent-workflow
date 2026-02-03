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
| `{TEST_SPEC}` | `{TEST_DIR}/test-spec.md` |
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

## Output Constraints (CRITICAL)

**All agents MUST follow these rules to avoid token limit errors:**

1. **Write files incrementally** - Write each file separately, never combine multiple files in one response
2. **Keep summaries brief** - Final completion summaries should be 5-10 bullet points max
3. **Reference, don't repeat** - Use file paths instead of quoting content from other artifacts
4. **One concern per file** - Don't merge unrelated content into single large files
5. **Chunk large files** - If a file would exceed ~200 lines, split into logical parts

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

## Output Rules
- Write file incrementally (section by section if large)
- Only include sections relevant to this feature (skip empty/N/A sections)
- Reference system spec by path, don't repeat its content
- Keep Change Log to 1-2 entries max

## Completion
Brief summary (5 bullets max): intent, key behaviours, scope, story themes, tensions
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
- Acceptance criteria (Given/When/Then) - max 5-7 per story
- Out of scope items (brief list)

## Output Rules
- Write ONE story file at a time, then move to next
- Keep each story focused - split large stories into multiple files
- Reference feature spec by path for shared context
- Skip boilerplate sections (session shape only if non-obvious)

## Completion
Brief summary: story count, filenames, behaviours covered (5 bullets max)
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

## Outputs (write these files IN ORDER, one at a time)

Step 1: Write {TEST_DIR}/test-spec.md containing:
- Brief understanding (5-10 lines)
- AC → Test ID mapping table (compact)
- Key assumptions (bullet list)

Step 2: Write {TEST_FILE} containing:
- Executable tests (Jest/Node test runner)
- Group by user story
- One describe block per story, one test per AC

## Output Rules
- Write test-spec.md FIRST, then write test file
- Keep test-spec.md under 100 lines (table format, no prose)
- Tests should be self-documenting - minimal comments
- Reference story files by path in test descriptions

## Completion
Brief summary: test count, AC coverage %, assumptions (5 bullets max)
```

**On completion:**
1. Verify `{TEST_SPEC}` and `{TEST_FILE}` exist
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
- Test Spec: {TEST_DIR}/test-spec.md
- Tests: {TEST_FILE}

## Output (write this file)
Write implementation plan to: {FEAT_DIR}/IMPLEMENTATION_PLAN.md

Plan structure (keep concise - aim for <80 lines total):
## Summary (2-3 sentences)
## Files to Create/Modify (table: path | action | purpose)
## Implementation Steps (numbered, max 10 steps)
## Risks/Questions (bullet list, only if non-obvious)
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
- Tests: {TEST_FILE}

## Process (INCREMENTAL - one file at a time)
1. Run tests: node --test {TEST_FILE}
2. For each failing test group:
   a. Identify the minimal code needed
   b. Write/edit ONE file
   c. Run tests again
   d. Repeat until group passes
3. Move to next test group

## Output Rules
- Write ONE source file at a time
- Run tests after each file write
- Keep functions small (<30 lines)
- No explanatory comments in code - code should be self-documenting

## Important
- Do NOT commit changes
- Do NOT modify test assertions unless they contain bugs

## Completion
Brief summary: files changed (list), test status (X/Y passing), blockers if any
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
