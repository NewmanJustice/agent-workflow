# Implementation Plan - Lazy Business Context Loading

## Summary

Implement lazy loading of business context by adding a detection function that scans feature specs for `.business_context` or `business_context/` references. Update the orchestrator to store the detection result in the queue and modify SKILL.md agent prompts to conditionally include the business context directive based on agent name (Alex always gets it) and detection/override flag state.

## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| `src/business-context.js` | Create | Detection logic and context inclusion functions |
| `src/orchestrator.js` | Modify | Integrate detection during queue initialization |
| `SKILL.md` | Modify | Update agent prompts with conditional business context |
| `bin/cli.js` | Modify | Add `--include-business-context` flag parsing |

## Implementation Steps

1. **Create `src/business-context.js` module**
   - Export `needsBusinessContext(featureSpecContent)` - returns boolean based on string matching
   - Export `parseIncludeBusinessContextFlag(args)` - returns boolean for flag presence
   - Export `shouldIncludeBusinessContext(agentName, detected, overrideFlag)` - determines if agent gets context
   - Export `generateBusinessContextDirective(includeContext)` - returns directive string or empty
   - Tests covered: T-DL-1 through T-DL-5, T-OF-1, T-AE-1 through T-AE-5, T-CI-1, T-CI-2

2. **Update `src/orchestrator.js` queue structure**
   - Modify `setCurrent()` to accept optional `needsBusinessContext` parameter
   - Add field to `current` object: `needsBusinessContext: boolean`
   - Tests covered: T-CI-3, T-CI-4

3. **Update `bin/cli.js` argument parsing**
   - Add `--include-business-context` to recognized flags
   - Pass flag value to orchestrator when initializing queue
   - Tests covered: T-OF-1, T-OF-4

4. **Integrate detection in pipeline setup (Step 5)**
   - Read feature spec content when initializing queue
   - Call `needsBusinessContext()` on content
   - Apply override flag if present
   - Store result in queue `current.needsBusinessContext`
   - Tests covered: T-INT-1, T-INT-2, T-INT-3

5. **Update SKILL.md agent prompts conditionally**
   - Add conditional note in Step 6 (Alex): "Business Context: .business_context/" always included
   - Add conditional note in Steps 7-10: "Business Context: .business_context/" only if `needsBusinessContext: true`
   - Document new `--include-business-context` flag in Invocation section
   - Tests covered: T-CI-1, T-CI-2, T-AE-1 through T-AE-3

6. **Add exports to `src/index.js`**
   - Export business-context module functions for external use

## Risks/Questions

- **Risk**: Feature specs that need business context but don't explicitly cite it will miss context. Mitigation: The `--include-business-context` override flag provides escape hatch.
- **Question**: Should detection log when it skips business context for debugging? Recommend: Add optional verbose logging but default to silent.
