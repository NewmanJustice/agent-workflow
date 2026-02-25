# Test Specification — Smart Story Routing

## 1. Test Overview

This specification defines tests for the smart story routing feature, which automatically classifies features as "technical" or "user-facing" to determine whether to include the Cass (story writing) pipeline step.

## 2. Test Themes

| Theme | Description |
|-------|-------------|
| Classification | Feature classifier correctly identifies technical vs user-facing content |
| Override Flags | Command-line flags correctly override automatic classification |
| Integration | Classification integrates with pipeline decision logic |
| Queue State | Classification persisted correctly in queue for recovery |

## 3. Test Cases

### 3.1 Classification Function

| ID | Description | Expected Outcome |
|----|-------------|------------------|
| T-CF-1.1 | classifyFeature() returns "technical" for refactoring content | Returns `{ type: "technical", ... }` |
| T-CF-1.2 | classifyFeature() returns "technical" for performance content | Returns `{ type: "technical", ... }` |
| T-CF-1.3 | classifyFeature() returns "technical" for infrastructure content | Returns `{ type: "technical", ... }` |
| T-CF-2.1 | classifyFeature() returns "user-facing" for UI content | Returns `{ type: "user-facing", ... }` |
| T-CF-2.2 | classifyFeature() returns "user-facing" for user journey content | Returns `{ type: "user-facing", ... }` |
| T-CF-2.3 | classifyFeature() returns "user-facing" for form/button content | Returns `{ type: "user-facing", ... }` |
| T-CF-3.1 | Tie-breaking defaults to "user-facing" | Equal counts returns "user-facing" |
| T-CF-3.2 | Empty content defaults to "user-facing" | No indicators returns "user-facing" |

### 3.2 Flag Parsing

| ID | Description | Expected Outcome |
|----|-------------|------------------|
| T-FP-1.1 | parseStoryFlags() handles --with-stories flag | Returns `{ override: "include" }` |
| T-FP-1.2 | parseStoryFlags() handles --skip-stories flag | Returns `{ override: "skip" }` |
| T-FP-1.3 | parseStoryFlags() handles no flag | Returns `{ override: null }` |
| T-FP-1.4 | parseStoryFlags() handles conflicting flags | Last flag wins or error |

### 3.3 Story Decision Logic

| ID | Description | Expected Outcome |
|----|-------------|------------------|
| T-SD-1.1 | shouldIncludeStories() includes for user-facing | Returns `true` for user-facing |
| T-SD-1.2 | shouldIncludeStories() skips for technical | Returns `false` for technical |
| T-SD-2.1 | --with-stories overrides technical classification | Returns `true` despite technical |
| T-SD-2.2 | --skip-stories overrides user-facing classification | Returns `false` despite user-facing |

### 3.4 Queue State

| ID | Description | Expected Outcome |
|----|-------------|------------------|
| T-QS-1.1 | Queue includes featureType after classification | `current.featureType` is set |
| T-QS-1.2 | Queue includes skippedCass boolean | `current.skippedCass` is boolean |
| T-QS-1.3 | Queue preserves classification on recovery | Values restored from file |

## 4. Test Data

### Technical Feature Spec Sample
```markdown
# Feature: Token Optimization

Refactor the pipeline to reduce token consumption.
Extract helper functions to utility module.
Improve cache efficiency and compress payloads.
```

### User-Facing Feature Spec Sample
```markdown
# Feature: Login Flow

User can sign in with email and password.
Dashboard shows notifications after login.
Form validates input before submission.
```

## 5. Dependencies

- Node.js test runner (node:test)
- Node.js assert module (node:assert)
- Temporary file system for queue tests
