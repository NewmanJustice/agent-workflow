# Test Specification: Template Extraction

## Understanding

This feature extracts verbose template sections from agent specs into standalone template files in `.blueprint/templates/`. The goal is to reduce agent spec token size (~800 tokens) while keeping templates accessible via file references. Agents read their slim specs by default and load templates only when creating artifacts. Workflow sections are also condensed to ~10 bullet points each.

---

## Derived Acceptance Criteria

| AC ID | Description |
|-------|-------------|
| AC-1 | STORY_TEMPLATE.md exists at `.blueprint/templates/STORY_TEMPLATE.md` |
| AC-2 | TEST_TEMPLATE.md exists at `.blueprint/templates/TEST_TEMPLATE.md` |
| AC-3 | STORY_TEMPLATE.md contains user story structure (~70 lines from Cass) |
| AC-4 | TEST_TEMPLATE.md contains test output format (~30 lines from Nigel) |
| AC-5 | AGENT_BA_CASS.md references STORY_TEMPLATE.md by path |
| AC-6 | AGENT_TESTER_NIGEL.md references TEST_TEMPLATE.md by path |
| AC-7 | Agent specs have condensed workflow sections (~10 bullets max) |
| AC-8 | Template content is not duplicated inline in agent specs |
| AC-9 | Existing templates (FEATURE_SPEC.md, SYSTEM_SPEC.md) are preserved |
| AC-10 | Agent specs remain functional (contain required frontmatter) |

---

## AC to Test ID Mapping

| AC | Test IDs | Scenario |
|----|----------|----------|
| AC-1 | T-1.1 | STORY_TEMPLATE.md file exists |
| AC-2 | T-1.2 | TEST_TEMPLATE.md file exists |
| AC-3 | T-2.1 | STORY_TEMPLATE contains user story structure |
| AC-4 | T-2.2 | TEST_TEMPLATE contains test format sections |
| AC-5 | T-3.1 | Cass spec references STORY_TEMPLATE path |
| AC-6 | T-3.2 | Nigel spec references TEST_TEMPLATE path |
| AC-7 | T-4.1, T-4.2 | Workflow sections are condensed |
| AC-8 | T-5.1, T-5.2 | Template content not duplicated inline |
| AC-9 | T-1.3, T-1.4 | Existing templates preserved |
| AC-10 | T-6.1, T-6.2 | Agent specs have valid frontmatter |

---

## Assumptions

- "~70 lines" for story template means content includes the markdown template block from Cass spec
- "~30 lines" for test template means test output format guidance from Nigel spec
- "Condensed workflow" means workflow section reduced but still present
- References use relative path format like `.blueprint/templates/STORY_TEMPLATE.md`
- Template extraction does not change the semantic meaning of templates
- Agent specs keep their YAML frontmatter intact after extraction
