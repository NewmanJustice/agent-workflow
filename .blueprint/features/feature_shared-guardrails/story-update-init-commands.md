# Story — Update Init/Update Commands for Shared Guardrails

## User story
As a user installing or updating murmur8, I want the init and update commands to correctly handle the new GUARDRAILS.md file so that the shared guardrails are properly distributed to target projects.

---

## Context / scope
- Affects `src/init.js` (initialization command)
- Affects `src/update.js` (update command)
- New file `.blueprint/agents/GUARDRAILS.md` must be included in both operations
- Existing behaviour for other files remains unchanged

Per FEATURE_SPEC.md:Section 7: "src/init.js and src/update.js must handle the new file during init/update"

---

## Acceptance criteria

**AC-1 — Init copies GUARDRAILS.md**
- Given a user runs `murmur8 init` in a new project,
- When the `.blueprint/agents/` directory is copied,
- Then the `GUARDRAILS.md` file is included in the copied content
- And the file is placed at `.blueprint/agents/GUARDRAILS.md` in the target project.

**AC-2 — Update replaces GUARDRAILS.md**
- Given a user runs `murmur8 update` in an existing project,
- When the `.blueprint/agents/` directory is updated,
- Then the `GUARDRAILS.md` file is replaced with the latest version from the package
- And the file is placed at `.blueprint/agents/GUARDRAILS.md` in the target project.

**AC-3 — Update preserves user content directories**
- Given a user runs `murmur8 update`,
- When the update process completes,
- Then `features/` and `system_specification/` directories remain untouched
- And only `agents/`, `templates/`, and `ways_of_working/` are replaced.

**AC-4 — Agent specs with references are copied**
- Given the agent specification files now reference `GUARDRAILS.md`,
- When init or update copies the agent specs,
- Then all agent specs (AGENT_*.md) are copied with their guardrails references intact
- And no orphaned guardrails references exist (GUARDRAILS.md is always present when agent specs reference it).

**AC-5 — Backward compatibility**
- Given an existing project with old agent specs (containing inline guardrails),
- When a user runs `murmur8 update`,
- Then the old agent specs are replaced with new specs referencing GUARDRAILS.md
- And the new GUARDRAILS.md file is added to the project.

---

## Out of scope
- Changes to the guardrails content itself
- Changes to SKILL.md agent prompts
- Changes to queue management or pipeline flow
- User content migration (users do not have custom guardrails)

---

## Notes
- Per SYSTEM_SPEC.md:Section 8, the update command replaces framework directories while preserving user content
- The `agents/` directory is listed in UPDATABLE array in `src/update.js`, so GUARDRAILS.md will be handled automatically once it exists in the source
- No code changes are expected in init.js or update.js since they copy entire directories; the change is purely in the source assets
