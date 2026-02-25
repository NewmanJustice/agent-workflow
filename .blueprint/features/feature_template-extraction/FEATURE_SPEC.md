# Feature Specification — Template Extraction

## 1. Feature Intent
**Why this feature exists.**

- Agent specs contain verbose template sections and examples (~70-100 lines each)
- Templates are reference material, not needed for every invocation
- Extracting templates to separate files reduces base agent spec size
- Agents can read templates only when creating new artifacts

---

## 2. Scope
### In Scope
- Extract user story template from Cass spec → `.blueprint/templates/STORY_TEMPLATE.md`
- Extract test template from Nigel spec → `.blueprint/templates/TEST_TEMPLATE.md`
- Extract interaction templates from agent specs
- Trim workflow sections to concise bullet points
- Update agent specs to reference templates by path

### Out of Scope
- Changing template content
- Removing templates entirely
- Creating new templates

---

## 3. Actors Involved

| Actor | Template Used | When |
|-------|--------------|------|
| Cass | STORY_TEMPLATE.md | When writing new stories |
| Nigel | TEST_TEMPLATE.md | When writing new tests |
| Codey | None extracted | Workflow condensed only |
| Alex | FEATURE_SPEC.md (existing) | When writing feature specs |

---

## 4. Behaviour Overview

**Happy path:**
1. Agent receives task prompt
2. Agent reads slim spec (templates removed)
3. When creating artifact, agent reads relevant template file
4. Agent uses template structure for output

**Content to extract:**

| From | Content | To |
|------|---------|-----|
| AGENT_BA_CASS.md | User story template (~70 lines) | STORY_TEMPLATE.md |
| AGENT_TESTER_NIGEL.md | Test output format (~30 lines) | TEST_TEMPLATE.md |
| All agents | Verbose workflow steps | Condensed to ~10 bullets each |

**Key outcomes:**
- ~800 fewer tokens in agent specs
- Templates still available when needed
- Specs more focused on behaviour, less on format

---

## 5. State & Lifecycle Interactions

- No state changes
- Templates are static reference files
- No pipeline flow changes

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Reference not inline | Agent specs reference templates, don't inline them |
| Read when needed | Agents read templates only when creating that artifact type |
| Templates are examples | Templates show structure, not mandatory content |

---

## 7. Dependencies

- `.blueprint/templates/` directory (already exists)
- Agent spec files updated
- SKILL.md prompts may need to specify "read template from X"

---

## 8. Non-Functional Considerations

- **Performance:** ~800 token reduction in agent specs
- **Maintainability:** Templates can be updated independently of agent specs
- **Clarity:** Agent specs focus on behaviour, templates on format

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Agents can follow references to read template files
- Templates are used infrequently enough that lazy loading is beneficial
- Condensed workflow bullets provide sufficient guidance

**Open Questions:**
- Should templates be versioned separately from agent specs?
- How much can workflow sections be condensed without losing clarity?

---

## 10. Impact on System Specification

- Reinforces separation of concerns (behaviour vs format)
- No contradiction with system spec
- No system spec change required

---

## 11. Handover to BA (Cass)

**Story themes:**
- Extract Cass story template to separate file
- Extract Nigel test template to separate file
- Condense workflow sections in all agent specs
- Update agent specs to reference templates

**Expected story boundaries:**
- One story for template extraction
- One story for workflow condensation

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-02-25 | Initial spec | Token efficiency improvement | Claude |
