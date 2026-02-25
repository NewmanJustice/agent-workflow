# Feature Specification — Lazy Business Context Loading

## 1. Feature Intent
**Why this feature exists.**

- Currently all agents are told to read `.business_context/*` directory
- Many features don't require business context
- Reading unnecessary files wastes tokens and processing time
- Lazy loading reads business context only when the feature spec references it

---

## 2. Scope
### In Scope
- Detect whether feature spec cites `.business_context/` files
- Include business context in agent prompt only if referenced
- Provide mechanism for agents to request business context if needed mid-task

### Out of Scope
- Changing business context structure
- Removing business context capability
- Automatic business context summarization

---

## 3. Actors Involved

| Actor | Business Context Usage |
|-------|----------------------|
| Alex | Primary consumer — grounds feature specs in domain context |
| Cass | Secondary — references for domain terminology |
| Nigel | Rare — may need for domain-specific test data |
| Codey | Rare — may need for domain-specific implementation |

---

## 4. Behaviour Overview

**Happy path (context needed):**
1. Feature spec contains citation: "Per business_context/domain.md: ..."
2. Pipeline detects citation during setup
3. Agent prompt includes: "Business Context: .business_context/"
4. Agent reads and applies business context

**Happy path (context not needed):**
1. Feature spec has no business context citations
2. Pipeline skips business context directive
3. Agent prompt omits business context reference
4. Tokens saved

**Detection logic:**
```javascript
const featureSpecContent = readFile(FEAT_SPEC);
const needsBusinessContext = featureSpecContent.includes('.business_context')
  || featureSpecContent.includes('business_context/');
```

**Key outcomes:**
- Variable token savings (depends on business context size)
- Faster processing for simple features
- Business context still available when needed

---

## 5. State & Lifecycle Interactions

- No persistent state changes
- Detection happens at pipeline setup (Step 5)
- Flag stored in queue: `current.needsBusinessContext: boolean`

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Citation detection | Scan feature spec for business_context references |
| Default to exclude | If no citation found, don't include business context |
| Alex exception | Alex always has access (creates feature specs from business context) |
| Explicit include | `--include-business-context` flag overrides detection |

---

## 7. Dependencies

- SKILL.md updated with conditional business context inclusion
- Pipeline setup (Step 5) performs detection
- Queue stores detection result for downstream agents

---

## 8. Non-Functional Considerations

- **Performance:** Token savings proportional to business context size
- **Correctness:** Risk of missing needed context if detection fails
- **Flexibility:** Override flag provides escape hatch

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Feature specs reliably cite business context when it's used
- Detection can be simple string matching
- Alex stage always needs business context access

**Open Questions:**
- Should detection be more sophisticated (AST parsing)?
- What if an agent needs business context mid-task but it wasn't loaded?
- Should there be a "request context" mechanism for agents?

---

## 10. Impact on System Specification

- Reinforces efficiency goals
- Adds conditional loading pattern to pipeline
- No contradiction with system spec

---

## 11. Handover to BA (Cass)

**Story themes:**
- Implement business context citation detection
- Update pipeline setup to conditionally include context
- Add override flag for explicit inclusion
- Ensure Alex always has business context access

**Expected story boundaries:**
- One story for detection logic
- One story for pipeline integration
- One story for override flag

---

## 12. Change Log (Feature-Level)
| Date | Change | Reason | Raised By |
|-----|------|--------|-----------|
| 2026-02-25 | Initial spec | Token efficiency improvement | Claude |
