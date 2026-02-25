# Implementation Plan: Template Extraction

## Summary

Extract verbose template sections from AGENT_BA_CASS.md and AGENT_TESTER_NIGEL.md into standalone template files (STORY_TEMPLATE.md and TEST_TEMPLATE.md) in `.blueprint/templates/`. Update agent specs to reference templates by path and condense workflow sections to ~10 bullet points each. This reduces agent spec token count by ~800 tokens while keeping templates accessible when needed.

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Create | `.blueprint/templates/STORY_TEMPLATE.md` | User story template extracted from Cass spec (lines 180-252) |
| Create | `.blueprint/templates/TEST_TEMPLATE.md` | Test output format guidance extracted from Nigel spec |
| Modify | `.blueprint/agents/AGENT_BA_CASS.md` | Remove inline template, add reference, condense workflow |
| Modify | `.blueprint/agents/AGENT_TESTER_NIGEL.md` | Add template reference, condense workflow section |

## Implementation Steps

1. **Create STORY_TEMPLATE.md** - Extract the user story template block (lines 180-252) from AGENT_BA_CASS.md into `.blueprint/templates/STORY_TEMPLATE.md`. Include the full markdown template with Screen [N], User story, Context/scope, Acceptance criteria, Session persistence, and Out of scope sections.

2. **Create TEST_TEMPLATE.md** - Extract test output format guidance from AGENT_TESTER_NIGEL.md sections 3-5 (test design principles, AC mapping table format, traceability table format) into a standalone template.

3. **Update Cass spec - Remove template** - Replace the inline user story template (lines 180-252) with a reference: `Read the user story template from: .blueprint/templates/STORY_TEMPLATE.md`

4. **Update Cass spec - Condense workflow** - Simplify "Standard workflow" section (lines 127-177) from 5 detailed steps with sub-bullets to ~10 concise top-level bullets covering: understand, clarify, write story, document session, flag deferrals.

5. **Update Nigel spec - Add template reference** - Add reference to TEST_TEMPLATE.md in the "Outputs you must produce" section for detailed format guidance.

6. **Update Nigel spec - Condense workflow** - Simplify section 3 "Standard workflow" (lines 69-109) to ~10 concise bullets covering: understand, map ACs, write spec, write tests, traceability.

7. **Preserve required sections** - Ensure both specs retain: YAML frontmatter, identity sections, job descriptions, input/output sections, collaboration notes, anti-patterns, GUARDRAILS.md reference.

8. **Verify existing templates preserved** - Confirm FEATURE_SPEC.md and SYSTEM_SPEC.md remain unchanged in `.blueprint/templates/`.

9. **Run tests** - Execute `node --test test/feature_template-extraction.test.js` to verify all 16 tests pass.

10. **Manual verification** - Check that condensed workflow sections remain actionable and template references are clear paths.

## Risks/Questions

| Risk | Mitigation |
|------|------------|
| Condensed workflows lose critical guidance | Keep essential steps, move details to templates |
| Test regex patterns may be too strict | Review test patterns if failures occur, adjust template content to match expected patterns |
| Token savings may vary | Actual reduction depends on final content; ~800 is estimate |

**Open question from spec:** Should templates be versioned separately? Recommendation: No, keep in same repo for now. Templates change rarely and should stay in sync with agent specs.
