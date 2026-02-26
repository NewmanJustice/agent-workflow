# Implementation Plan: Interactive Alex

## Summary

Create `src/interactive.js` module implementing a state machine for interactive spec creation sessions. The module exports functions for flag parsing, mode detection, session lifecycle management, and pipeline integration. SKILL.md routing logic will be updated to check for `--interactive` flag and missing specs, delegating to the new module.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/interactive.js` | Create | Session state machine and command handlers |
| `SKILL.md` | Modify | Add `--interactive` flag docs, update routing logic |
| `src/orchestrator.js` | Modify | Add interactive mode history fields |
| `src/history.js` | Modify | Support `mode: "interactive"` and session metrics |

## Implementation Steps

1. **Create `src/interactive.js` with core exports**
   - `parseFlags(args)` - Extract `--interactive` and `--pause-after` flags
   - `shouldEnterInteractiveMode(flags, hasSystemSpec, hasFeatureSpec)` - Routing logic
   - Export constants: `SESSION_STATES`, `SECTION_ORDER`, `MIN_REQUIRED_SECTIONS`

2. **Implement session state machine**
   - States: `idle` → `gathering` → `questioning` → `drafting` → `finalizing`
   - `createSession(target)` - Initialize session for 'system' or 'feature' spec
   - `getSessionProgress(session)` - Return complete vs remaining section counts

3. **Implement command handlers**
   - `handleCommand(session, command)` - Route `/approve`, `/change`, `/skip`, `/restart`, `/abort`, `/done`
   - Each handler mutates session state and returns next action indicator
   - `/change <feedback>` increments `revisionCount`, stores feedback

4. **Implement section drafting flow**
   - `getNextSection(session)` - Return next section to draft based on `SECTION_ORDER`
   - `markSectionComplete(session, section)` - Update section status
   - `markSectionTBD(session, section)` - Mark skipped sections

5. **Implement context gathering**
   - `gatherContext(session)` - Read system spec, business context, templates
   - `identifyGaps(session, userDescription)` - Return 2-4 information gaps
   - `generateQuestions(gaps)` - Produce actionable questions

6. **Implement finalization**
   - `canFinalize(session)` - Check if Intent, Scope, Actors are complete/TBD
   - `generateSpec(session)` - Produce spec content with TBD markers and note
   - `writeSpec(session, outputPath)` - Write FEATURE_SPEC.md or SYSTEM_SPEC.md

7. **Implement handoff generation**
   - `generateHandoff(session)` - Produce handoff-alex.md content
   - Include: key decisions, files created, question/revision counts

8. **Update history.js for interactive metrics**
   - Add `mode`, `questionCount`, `revisionCount`, `sessionDurationMs` fields
   - Update `recordEntry()` to accept interactive session data

9. **Update SKILL.md routing logic**
   - Document `--interactive` flag in usage section
   - Add conditional check after system spec gate: if interactive mode, enter session loop
   - On session complete, continue to downstream agents or pause

10. **Wire up orchestrator queue transitions**
    - Ensure `moveToNextStage()` works with interactive completion
    - No structural changes needed, just ensure integration works

## Risks/Questions

- **Token limits**: Interactive session loop may accumulate context. Consider clearing conversation history between sections if Claude context fills up.
- **Testing gaps**: Current tests use inline stubs. After implementation, update tests to import from `src/interactive.js` directly.
- **Word count enforcement**: The 200-word limit for Alex responses is a prompt constraint, not code-enforced. Document this in SKILL.md.
