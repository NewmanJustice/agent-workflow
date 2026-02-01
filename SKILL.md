---
name: implement-feature
description: Run the Alex → Cass → Nigel → Codey pipeline to implement a feature. Alex gates on system spec and routes to appropriate workflow.
---

# Implement Feature Skill

## Paths (referenced as `{VAR}` throughout)

| Var | Path |
|-----|------|
| `{SYS_SPEC}` | `.blueprint/system_specification/SYSTEM_SPEC.md` |
| `{FEAT_DIR}` | `.blueprint/features/feature_{slug}` |
| `{FEAT_SPEC}` | `{FEAT_DIR}/FEATURE_SPEC.md` |
| `{STORIES}` | `{FEAT_DIR}/*.md` (excluding FEATURE_SPEC.md) |
| `{TEST_DIR}` | `./test/artifacts/feature_{slug}` |
| `{TEST_FILE}` | `./test/feature_{slug}.test.js` |
| `{PLAN}` | `./plans/feature_{slug}-plan.md` |
| `{QUEUE}` | `.claude/implement-queue.json` |

## Invocation

```bash
/implement-feature                                    # Interactive
/implement-feature "user-auth"                        # New feature
/implement-feature "user-auth" --update-feature-spec  # Update spec
/implement-feature "user-auth" --update-story "login" # Update story
/implement-feature --update-system-spec               # Update system
/implement-feature "user-auth" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "user-auth" --no-commit
```

## Pipeline

```
Alex (gate) ─┬─ New feature ──→ Alex → Cass → Nigel → Codey → Commit
             ├─ Update story ─→ Cass → Nigel → Codey → Commit
             ├─ Update feature → Alex → cascade check
             └─ Update system ─→ Alex → cascade check
```

## Steps

### 1. Parse Arguments
Extract: `{slug}`, mode flags (`--update-*`), pause gates, `--no-commit`

### 2. Get Feature Slug
If not provided: Ask user, convert to slug format (lowercase, hyphens), confirm.

### 3. System Spec Gate
Check `{SYS_SPEC}` exists. If not: run Alex to create it, then **stop for review**.

### 4. Route
- Flag provided → use that mode
- Slug exists at `{FEAT_DIR}` → ask: update spec, add story, or continue implementation
- No slug → ask: new feature, update story, update feature spec, update system spec

### 5. Initialize
Create/read `{QUEUE}`. Ensure dirs exist: `plans/`, `test/artifacts/`, `.blueprint/system_specification/`

---

## Agent Steps

**Common pattern for all agent steps:**
- On failure: Ask user (retry / skip / abort)
- On pause gate: Show output path, ask to continue

### 6. Alex: Create Feature Spec
*New features only*

```
mkdir -p {FEAT_DIR}
```

Prompt Alex:
```
Create feature spec for "{slug}".
Inputs: {SYS_SPEC}, template at .blueprint/templates/FEATURE_SPEC.md, .blueprint/.business_context/
Output: {FEAT_SPEC}
Summarize: intent, behaviours, scope, story themes, any system spec tensions
```

On success: move to cassQueue

### 6a. Alex: Update Feature Spec
*--update-feature-spec only*

Prompt Alex to update `{FEAT_SPEC}` based on user input. Cascade check: if stories affected, queue for Cass.

### 4a. Alex: Create/Update System Spec
*Missing system spec or --update-system-spec*

Prompt Alex:
```
[Create] Use template .blueprint/templates/SYSTEM_SPEC.md, context from .blueprint/.business_context/
[Update] Modify {SYS_SPEC} per user request, list affected features
Output: {SYS_SPEC}
```

On create: **stop for review**. On update: cascade check for affected features.

### 7. Cass: Create Stories

Prompt Cass:
```
[New] Create user stories from {FEAT_SPEC}. One .md file per story in {FEAT_DIR}.
[Update] Update {FEAT_DIR}/{story_slug}.md per request.
Inputs: {FEAT_SPEC}, {SYS_SPEC}
Summarize: story count, filenames, key behaviors
```

On success: move to nigelQueue

### 8. Nigel: Create Tests

```
mkdir -p {TEST_DIR}
```

Prompt Nigel:
```
Create tests for "{slug}".
Inputs: {STORIES}, {FEAT_SPEC}, {SYS_SPEC}
Outputs: {TEST_DIR}/ (understanding.md, test-plan.md, test-behaviour-matrix.md, implementation-guide.md), {TEST_FILE}
Summarize: test count, coverage, assumptions
```

On success: move to codeyQueue

### 9. Codey: Create Plan

Prompt Codey:
```
Create implementation plan for "{slug}".
Inputs: {FEAT_SPEC}, {STORIES}, {TEST_DIR}/, {TEST_FILE}
Output: {PLAN}

Plan structure:
## Summary
## Understanding (behaviors, test count)
## Files to Create/Modify
## Implementation Steps
## Data Model
## Validation Rules
## Risks/Questions
## Definition of Done

Do NOT implement yet.
```

### 10. Codey: Implement

Prompt Codey:
```
Implement "{slug}" per {PLAN}.
Inputs: {PLAN}, {FEAT_SPEC}, {STORIES}, {TEST_DIR}/, {TEST_FILE}
Process: baseline tests → implement → tests pass → lint pass
Do NOT commit.
```

Run `npm test`. On success: move to completed, proceed to commit (unless `--no-commit`).

### 11. Auto-commit

```bash
git add {FEAT_DIR}/ {TEST_DIR}/ {TEST_FILE} {PLAN}
# Add implementation files
```

Message:
```
Add feature: {slug}

- Feature spec by Alex
- User stories by Cass
- Tests by Nigel
- Implementation by Codey

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 12. Report Status

```
## Completed
- feature_{slug} (N tests, commit hash)

## In Progress / Queued / Failed
- {status}

## Next Action
Pipeline complete. Run `npm test` or `/implement-feature` for next.
```

---

## Queue Structure

Location: `{QUEUE}`

```json
{
  "lastUpdated": "ISO-timestamp",
  "alexQueue": [{ "featureSlug": "...", "description": "..." }],
  "cassQueue": [{ "featureSlug": "...", "featureDir": "..." }],
  "nigelQueue": [{ "featureSlug": "...", "stories": ["..."] }],
  "codeyQueue": [{ "featureSlug": "...", "testArtifactsPath": "...", "planPath": "..." }],
  "completed": [{ "featureSlug": "...", "testCount": N, "commitHash": "..." }],
  "failed": []
}
```

---

## Error Recovery

Run `/implement-feature` again - reads queue and resumes from last state.

---

## Agent References

| Agent | File |
|-------|------|
| Alex | `.blueprint/agents/AGENT_SPECIFICATION_ALEX.md` |
| Cass | `.blueprint/agents/AGENT_BA_CASS.md` |
| Nigel | `.blueprint/agents/AGENT_TESTER_NIGEL.md` |
| Codey | `.blueprint/agents/AGENT_DEVELOPER_CODEY.md` |
| Ritual | `.blueprint/ways_of_working/DEVELOPMENT_RITUAL.md` |
| Templates | `.blueprint/templates/SYSTEM_SPEC.md`, `.blueprint/templates/FEATURE_SPEC.md` |
