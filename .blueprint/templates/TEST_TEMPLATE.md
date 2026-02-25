# Test Template

Use this template when writing test specifications and executable tests.

---

## Outputs you must produce

### 1. test-spec.md (write FIRST, keep under 100 lines)
- Brief understanding (5-10 lines max)
- AC to Test ID mapping table (compact format)
- Key assumptions (bullet list)

### 2. Executable test file (write SECOND)
- One `describe` block per user story
- One `it` block per acceptance criterion
- Self-documenting test names with minimal comments

---

## AC to Test ID Mapping Table Format

| AC | Test ID | Scenario |
|----|---------|----------|
| AC-1 | T-1.1 | Valid credentials leads to success |
| AC-1 | T-1.2 | Invalid password leads to error |
| AC-2 | T-2.1 | Missing field shows validation |

---

## Traceability Table Format

| Acceptance Criterion | Test IDs | Notes |
|---------------------|----------|-------|
| AC-1 | T-1.1, T-1.2 | Happy path covered |
| AC-2 | T-2.1 | Edge case pending |

---

## Test Design Principles

- **Clarity over cleverness**: Prioritise readability with explicit steps
- **Determinism**: Avoid flaky patterns and random inputs
- **Coverage with intent**: Focus on behavioural coverage, not test count
- **Boundaries and edge cases**: Consider min/max, empty/null, invalid formats

---

## Test Structure Example

```javascript
describe('Feature: [Feature Name]', () => {
  describe('[User Story Reference]', () => {
    it('T-1.1: [behaviour description]', async () => {
      // Given [precondition]
      // When [action]
      // Then [expected result]
    });

    it('T-1.2: [another behaviour]', () => {
      // Test implementation
    });
  });
});
```

---

## Guidelines

- Make failure states meaningful with expected error messages
- Avoid over-prescribing implementation details
- Focus on externally observable behaviour
- Keep tests small and isolated with one main assertion per test
- Clean up async tasks and resources at test end
- Use `it.skip` or `test.todo` for pending/blocked tests
