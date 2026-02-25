# User Story Template

Use this template when writing user stories and acceptance criteria.

---

## Screen [N] — [Title]

### User story
As a [role], I want [capability] so that [benefit].

---

### Context / scope
- Professional user (Solicitor)
- England standard possession claim
- Screen is reached when: [entry condition]
- Route:
  - `GET /claims/[route-name]`
  - `POST /claims/[route-name]`
- This screen captures: [what data]

---

### Acceptance criteria

Write ACs in **Given/When/Then** format (precondition, action, result):

**AC-1 — [Short description]**
- Given [precondition],
- When [action],
- Then [expected result].

**AC-2 — [Short description]**
- Given [precondition],
- When [action],
- Then [expected result].

<!-- Continue with AC-3, AC-4, etc. -->

**AC-N — Previous navigation**
- Given I click Previous,
- Then I am returned to [previous route]
- And any entered data is preserved in session.

**AC-N+1 — Continue navigation**
- Given I click Continue and validation passes,
- Then I am redirected to [next route].

**AC-N+2 — Cancel behaviour**
- Given I click Cancel,
- Then I am returned to /case-list
- And the claim draft remains stored in session.

**AC-N+3 — Accessibility compliance**
- Given validation errors occur,
- Then:
  - a GOV.UK error summary is displayed at the top of the page,
  - errors link to the relevant field,
  - focus moves to the error summary,
  - and all inputs are properly labelled and keyboard accessible.

---

### Session persistence

```js
session.claim.fieldName = {
  property: 'value' | null
}
```

---

### Out of scope
- [Item 1]
- [Item 2]

---

## Guidelines for writing user stories

### Every AC must be:
- Deterministic
- Observable via the UI or session
- Unambiguous

### Routing must be explicit for:
- Previous link
- Continue button
- Cancel link
- Any conditional paths

### Keep stories focused:
- Maximum 5-7 ACs per story
- If more needed, split into multiple story files
