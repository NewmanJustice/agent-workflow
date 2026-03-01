# Feature Specification — Agent Feedback Loop

## 1. Feature Intent
**Why this feature exists.**

- **Problem being addressed:** The murmur8 pipeline executes sequentially but lacks intra-stage feedback. Agents cannot assess the quality of upstream artifacts, leading to silent propagation of poor-quality specifications, stories, or tests through the pipeline.
- **User need:** Developers want visibility into how each agent perceives the quality of inputs from previous stages. When quality is low, the pipeline should pause for human review rather than proceeding with flawed inputs.
- **System alignment:** Per SYSTEM_SPEC.md:Section 7 (Governing Rules), agents are expected to "flag deviations" and "not silently alter specifications". This feature operationalises that principle by requiring explicit quality assessment at each stage boundary.

> This feature introduces a quality feedback mechanism that integrates with existing history, insights, and retry modules to create a closed-loop quality system.

---

## 2. Scope

### In Scope

- Feedback collection schema and data structure for agent assessments
- Feedback capture at each stage boundary (Cass on Alex, Nigel on Cass, Codey on Nigel)
- Quality gate logic: pause pipeline if feedback rating falls below threshold
- Configuration management for feedback thresholds (`.claude/feedback-config.json`)
- Storage of feedback in pipeline history entries
- Insights extension: correlation analysis between feedback scores and outcomes
- Retry integration: mapping feedback issues to retry strategies
- CLI commands for feedback configuration and analysis

### Out of Scope

- Feedback from Alex (no prior stage to assess within the pipeline)
- Automatic remediation based on feedback (human review required)
- Cross-pipeline feedback aggregation (each run is independent)
- Natural language feedback parsing (structured schema only)
- Feedback on auto-commit stage (no agent assessment)

---

## 3. Actors Involved

### Human User

- **Can do:** View feedback thresholds; modify threshold configuration; view feedback correlation insights; review and approve paused pipelines
- **Cannot do:** Directly inject feedback into history; bypass quality gates without explicit action

### Cass (Story Writer Agent)

- **Can do:** Provide feedback on Alex's feature specification before writing stories
- **Feedback target:** Feature specification quality, completeness, clarity

### Nigel (Tester Agent)

- **Can do:** Provide feedback on Cass's user stories before writing tests
- **Feedback target:** Story quality, acceptance criteria testability, scope clarity

### Codey (Developer Agent)

- **Can do:** Provide feedback on Nigel's test specification before planning/implementing
- **Feedback target:** Test coverage, implementation feasibility, specification clarity

### Pipeline Orchestrator (SKILL.md implementation)

- **Can do:** Collect feedback from agents; evaluate against thresholds; persist to history; trigger quality gates
- **Cannot do:** Override human decisions on paused pipelines

### History Module (src/history.js)

- **Extended by:** New `feedback` field in stage entries
- **Maintains:** Backward compatibility with existing entries (no feedback = null)

### Insights Module (src/insights.js)

- **Extended by:** New `--feedback` analysis mode
- **Provides:** Calibration scoring, issue pattern correlation

### Retry Module (src/retry.js)

- **Extended by:** Feedback-informed strategy selection
- **Consumes:** Issue patterns from feedback to recommend targeted strategies

---

## 4. Behaviour Overview

### Happy Path: Feedback Collection and Proceeding

1. Alex completes feature specification
2. Orchestrator spawns Cass with explicit instruction to provide feedback on Alex's output
3. Cass writes feedback object (rating, confidence, issues, recommendation) to designated output
4. Orchestrator reads feedback and evaluates against configured threshold (default: 3.0)
5. Rating >= threshold: pipeline proceeds, feedback stored in history
6. Cass proceeds to write user stories
7. Pattern repeats for Nigel (feedback on Cass) and Codey (feedback on Nigel)
8. On completion, all feedback is persisted in history entry

### Alternative: Quality Gate Triggers Pause

1. Agent provides feedback with rating < configured threshold
2. Agent's recommendation is "pause" or "revise"
3. Orchestrator pauses pipeline before current agent's main work
4. User is prompted: "Quality gate triggered. {Agent} rated previous stage {rating}/5. Issues: {issues}. (review/proceed/abort)"
5. User can review upstream artifacts, request revision, or proceed anyway
6. Decision and feedback are recorded in history

### Alternative: Dynamic Threshold Adjustment

1. User runs `murmur8 insights --feedback` after sufficient runs
2. Insights module calculates agent calibration (how predictive is their feedback of actual outcomes)
3. User runs `murmur8 feedback-config set minRating 3.5` to adjust threshold based on data
4. Future runs use updated threshold

### Alternative: Retry with Feedback-Informed Strategy

1. Pipeline fails at a stage (e.g., Codey cannot implement)
2. Retry module examines feedback chain for the failed run
3. Feedback issues are mapped to strategies:
   - "missing-error-handling" → `add-context`
   - "too-complex" → `simplify-prompt`
   - "too-many-stories" → `reduce-stories`
4. Recommended strategy reflects feedback analysis
5. User accepts or chooses alternative

---

## 5. State & Lifecycle Interactions

### States Entered

- **feedback_pending:** After upstream agent completes, before downstream agent provides feedback
- **quality_gate_paused:** When feedback triggers quality gate (rating < threshold)

### States Exited

- **feedback_pending → in_progress:** When feedback is recorded and threshold is met
- **quality_gate_paused → in_progress:** When user chooses to proceed
- **quality_gate_paused → paused:** When user requests review/revision

### States Modified

- Pipeline history entries gain `stages[].feedback` field
- Queue entries may include temporary feedback data during execution

### Lifecycle Classification

- **State-creating:** Creates feedback_pending state at each stage boundary
- **State-constraining:** Quality gates can block progression
- **State-transitioning:** Moves between feedback states based on ratings

---

## 6. Rules & Decision Logic

### Rule 1: Feedback Schema Validation

- **Description:** All feedback must conform to the defined schema
- **Inputs:** Agent feedback output
- **Outputs:** Validated feedback object or validation error
- **Type:** Deterministic

```json
{
  "about": "alex|cass|nigel",
  "rating": 1-5,
  "confidence": 0.0-1.0,
  "issues": ["issue-code", ...],
  "recommendation": "proceed|pause|revise"
}
```

### Rule 2: Quality Gate Evaluation

- **Description:** Compare feedback rating against threshold to determine if pipeline should pause
- **Inputs:** Feedback rating, configured threshold, recommendation
- **Outputs:** Boolean (shouldPause)
- **Type:** Deterministic

```
shouldPause = (rating < minRatingThreshold) OR (recommendation === "pause")
```

### Rule 3: Issue-to-Strategy Mapping

- **Description:** Map feedback issue codes to retry strategies
- **Inputs:** List of issue codes from feedback chain
- **Outputs:** Prioritised list of recommended strategies
- **Type:** Deterministic with configurable mappings

Default mappings:
| Issue Code | Strategy |
|------------|----------|
| `missing-error-handling` | `add-context` |
| `unclear-scope` | `simplify-prompt` |
| `too-complex` | `simplify-prompt` |
| `too-many-stories` | `reduce-stories` |
| `untestable-criteria` | `simplify-tests` |
| `missing-edge-cases` | `add-context` |

### Rule 4: Agent Calibration Calculation

- **Description:** Measure correlation between agent feedback and eventual pipeline outcomes
- **Inputs:** Historical feedback ratings, pipeline outcomes (success/failed)
- **Outputs:** Calibration score per agent (0.0 = uncorrelated, 1.0 = perfect predictor)
- **Type:** Deterministic (statistical calculation)

```
calibration[agent] = correlation(feedback_ratings[agent], outcome_success_binary)
```

### Rule 5: Threshold Recommendation

- **Description:** Suggest optimal threshold based on historical data
- **Inputs:** All feedback/outcome pairs, desired false positive/negative balance
- **Outputs:** Recommended minRating threshold
- **Type:** Deterministic

---

## 7. Dependencies

### System Components

- **src/history.js:** Extended to store feedback in history entries
  - New field: `stages[stage].feedback` containing feedback object
  - Backward compatible: existing entries without feedback are valid

- **src/insights.js:** Extended with feedback analysis functions
  - New function: `analyzeFeedbackCorrelation(history)`
  - New CLI flag: `--feedback` for feedback-specific analysis

- **src/retry.js:** Extended with feedback-informed strategy selection
  - New function: `mapIssuesToStrategies(issues, config)`
  - Modified: `shouldRetry()` to consider feedback chain

- **bin/cli.js:** New command registration
  - `murmur8 feedback-config` (view)
  - `murmur8 feedback-config set <key> <value>`
  - `murmur8 insights --feedback`

### File Dependencies

- **`.claude/feedback-config.json`:** Configuration storage
- **`.claude/pipeline-history.json`:** Extended schema for feedback storage

### Agent Specification Dependencies

- Agent prompts (in SKILL.md or agent specs) must include feedback collection instructions
- Feedback schema must be communicated to agents in their task prompts

---

## 8. Non-Functional Considerations

### Performance

- Feedback collection adds one structured output per stage (minimal overhead)
- Quality gate evaluation is O(1) comparison
- Calibration calculation is O(n) over history entries

### Resilience

- If feedback collection fails, pipeline proceeds with warning (degraded mode)
- Missing feedback in history is treated as neutral (no quality gate effect)
- Invalid feedback schema triggers warning but does not block pipeline

### Audit/Logging

- All feedback is persisted in history for retrospective analysis
- Quality gate decisions are logged with timestamp and user action

### Security

- Feedback file is gitignored (contains project-specific assessments)
- No sensitive data expected in feedback (ratings, codes, recommendations only)

---

## 9. Assumptions & Open Questions

### Assumptions

- ASSUMPTION: Agents can reliably produce structured feedback in the specified schema
- ASSUMPTION: Feedback ratings are comparable across agents and runs
- ASSUMPTION: Issue codes will emerge from practice and can be standardised iteratively
- ASSUMPTION: Correlation analysis requires 10+ completed runs for meaningful results

### Open Questions

- Should feedback influence agent prompts proactively (not just on retry)?
- How should conflicting feedback (high rating but "pause" recommendation) be handled?
- Should there be feedback severity levels (blocking vs advisory)?
- What feedback should Codey provide about Codey-plan (within same agent)?

---

## 10. Impact on System Specification

### Reinforces Existing Assumptions

- Per SYSTEM_SPEC.md:Section 7, agents must "flag deviations" - feedback formalises this
- Per SYSTEM_SPEC.md:Section 8, failure handling already supports pause/review - quality gates extend this

### Stretches Existing Assumptions

- History module shifts from pure observability to operational dependency (also noted in adaptive-retry)
- Agent boundaries are subtly extended: agents now assess peer outputs, not just produce artifacts
- Pipeline flow gains conditional branches (quality gates) beyond explicit `--pause-after`

### Potential Contradiction

The system spec states pipelines are "sequential" (Section 7). Quality gates introduce conditional pauses that may feel like interruptions. However, this is consistent with the existing `--pause-after` mechanism and does not fundamentally alter sequence.

**Flagged for consideration:** Should SYSTEM_SPEC.md:Section 6 be updated to explicitly acknowledge quality gates as a pipeline flow modifier?

---

## 11. Handover to BA (Cass)

### Story Themes

1. **Feedback Collection:** Agents provide structured feedback on upstream artifacts
2. **Quality Gates:** Pipeline pauses when feedback indicates quality concerns
3. **Configuration Management:** User can view and modify feedback thresholds
4. **History Integration:** Feedback is stored in pipeline history entries
5. **Insights Extension:** Feedback correlation analysis and calibration scoring
6. **Retry Integration:** Feedback issues inform retry strategy selection

### Expected Story Boundaries

- Feedback schema definition and validation as foundational story
- Quality gate logic as separate story (depends on schema)
- CLI configuration commands as separate story (parallel track)
- History integration as separate story (depends on schema)
- Insights extension as separate story (depends on history integration)
- Retry integration as separate story (depends on insights correlation)

### Areas Needing Careful Story Framing

- Feedback collection happens *within* agent execution; must not disrupt agent focus
- Quality gate UX: user prompt must clearly explain situation and options
- Issue code taxonomy: start with small set, plan for iterative expansion
- Calibration display: statistical concepts must be presented accessibly

---

## 12. Change Log (Feature-Level)

| Date       | Change                                | Reason                          | Raised By |
|------------|---------------------------------------|---------------------------------|-----------|
| 2026-02-24 | Initial feature specification created | Feature request for agent feedback system | Alex |
