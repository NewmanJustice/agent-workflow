# Feature Specification — Parallel Pre-flight Validation

## 1. Feature Intent

Validate that a batch of features is safe to run in parallel before execution begins. This prevents wasted resources from features that would fail due to conflicts, missing specs, or dependencies.

**Problem:** Users can queue features for parallel execution without knowing if they'll conflict. Discovering issues mid-execution wastes time and creates cleanup work.

**Solution:** Pre-flight validation that checks feature readiness, detects conflicts, and estimates scope before any worktrees are created.

---

## 2. Scope

### In Scope
- Check feature specs exist and are complete
- Detect dependencies between features in batch
- Detect file overlap from implementation plans
- Estimate scope and warn about timeout risk
- Integrate with existing dry-run flow

### Out of Scope
- Automatic dependency resolution
- Automatic batching suggestions
- Cross-repo validation

---

## 3. Behaviour Overview

### Pre-flight Check Output

```
$ orchestr8 parallel feat-a feat-b feat-c --dry-run

Pre-flight Validation
=====================

✓ feat-a: Spec complete, plan exists
✓ feat-b: Spec complete, plan exists
✗ feat-c: Missing FEATURE_SPEC.md

Conflict Analysis
=================

⚠ File overlap detected:
  • src/utils.js: feat-a, feat-b both modify
  • bin/cli.js: feat-a, feat-c both modify

Recommendation: Run feat-a alone, then feat-b + feat-c

Scope Estimation
================

  Feature   | Stories | Tests | Est. Time
  ----------|---------|-------|----------
  feat-a    | 3       | 12    | ~15 min
  feat-b    | 2       | 8     | ~10 min
  feat-c    | 1       | 4     | ~5 min

Total estimated: ~30 min (parallel: ~15 min)

Proceed? [y/N]
```

### Validation Failures Block Execution

```
$ orchestr8 parallel feat-a feat-b

Pre-flight Validation
=====================

✗ feat-a: Missing FEATURE_SPEC.md
✗ feat-b: Missing user stories

Cannot proceed. Run these commands first:
  /implement-feature feat-a --pause-after=alex
  /implement-feature feat-b --pause-after=cass
```

### Override with --skip-preflight

```
$ orchestr8 parallel feat-a feat-b --skip-preflight

⚠ Skipping pre-flight validation (not recommended)

Starting parallel pipelines...
```

---

## 4. Implementation Notes

### Validation Checks

1. **Spec Completeness**
   - FEATURE_SPEC.md exists and has required sections
   - At least one story-*.md file exists
   - Test file exists (optional - may be created by pipeline)

2. **Dependency Detection**
   - Parse feature specs for "depends_on" or similar markers
   - Scan for references to other feature slugs
   - Warn if features reference each other

3. **File Overlap Detection**
   - Parse IMPLEMENTATION_PLAN.md for "Files to Create/Modify" section
   - Extract file paths from each feature's plan
   - Flag any files that appear in multiple features

4. **Scope Estimation**
   - Count stories and acceptance criteria
   - Count existing tests
   - Use history averages to estimate duration

### Integration Points

- Called from `runParallel()` before worktree creation
- Results displayed in dry-run output
- Blocking by default, override with `--skip-preflight`

---

## 5. Test Themes

- Detects missing feature specs
- Detects missing stories
- Detects file overlap from plans
- Allows override with flag
- Integrates with dry-run
- Scope estimation uses history

---

## 6. Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-25 | Initial spec | Upfront validation for parallel safety |
