# Feature Specification — Smart Story Routing

## 1. Feature Intent

The pipeline currently requires manual decision about whether to include the Cass (story writing) step. This feature automates that decision by classifying features as "technical" or "user-facing" based on their content, then routing accordingly.

- Technical features skip Cass (saves ~25-40k tokens)
- User-facing features include Cass (stories add value for user journeys)
- Override flags allow manual control when needed

---

## 2. Scope

### In Scope
- Classify features based on feature spec content
- Route pipeline to include/skip Cass based on classification
- Provide override flags for manual control
- Log classification decision for transparency

### Out of Scope
- Changing Cass's behavior
- ML-based classification (use keyword matching)
- Retroactive classification of completed features

---

## 3. Actors Involved

| Actor | Role |
|-------|------|
| Pipeline orchestrator | Calls classifier, routes accordingly |
| Feature classifier | Analyzes spec, returns classification |
| User | Can override with flags |

---

## 4. Behaviour Overview

### Classification Logic

**Technical indicators** (skip Cass):
- Keywords: refactor, token, performance, module, internal, infrastructure, optimization, extract, compress, cache, schema, validation, helper, utility, config
- Patterns: "reduce.*token", "improve.*efficiency", "extract.*to"

**User-facing indicators** (include Cass):
- Keywords: user, customer, UI, screen, journey, flow, experience, interface, form, button, login, signup, dashboard, notification, email
- Patterns: "user can", "user should", "as a user"

**Decision rules:**
1. Count technical indicators in feature spec
2. Count user-facing indicators in feature spec
3. If user-facing > technical → include Cass
4. If technical > user-facing → skip Cass
5. If tie or unclear → default to include Cass (safer)

### Override Flags

- `--with-stories` - Force include Cass regardless of classification
- `--skip-stories` - Force skip Cass regardless of classification

### Pipeline Integration

```
/implement-feature "slug"
       │
       ▼
  Classify Feature
       │
       ├── Technical → Skip Cass → Nigel
       │
       └── User-facing → Include Cass → Cass → Nigel
```

---

## 5. State & Lifecycle Interactions

- Classification stored in queue: `current.featureType: "technical" | "user-facing"`
- Classification stored in queue: `current.skippedCass: boolean`
- No impact on other pipeline stages

---

## 6. Rules & Decision Logic

| Rule | Description |
|------|-------------|
| Keyword matching | Case-insensitive search in feature spec |
| Threshold | User-facing wins ties (conservative) |
| Override precedence | Flags override classification |
| Logging | Classification reason logged to console |

---

## 7. Dependencies

- Feature spec must exist before classification
- SKILL.md routes based on classification result
- Queue tracks classification for recovery

---

## 8. Non-Functional Considerations

- **Performance**: Classification is fast (string matching)
- **Accuracy**: Keyword-based approach may misclassify edge cases
- **Transparency**: Log why decision was made

---

## 9. Assumptions & Open Questions

**Assumptions:**
- Keyword matching is sufficient for most cases
- Users will use override flags for edge cases
- Technical features don't benefit significantly from stories

**Open Questions:**
- Should we track classification accuracy over time?
- Should confidence score be exposed to user?

---

## 10. Impact on System Specification

- Adds new routing decision point to pipeline
- No breaking changes to existing behavior
- Backward compatible (default is current behavior)

---

## 11. Handover to Nigel

**Test themes:**
- Classification function returns correct type for technical content
- Classification function returns correct type for user-facing content
- Override flags work correctly
- Tie-breaking defaults to user-facing
- Queue state updated with classification

---

## 12. Change Log
| Date | Change | Reason | Raised By |
|------|--------|--------|-----------|
| 2026-02-25 | Initial spec | Optimize pipeline efficiency | User request |
