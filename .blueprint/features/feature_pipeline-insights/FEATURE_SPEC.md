# Feature Specification — Pipeline Insights

## 1. Feature Intent

**Why this feature exists.**

- **Problem being addressed:** The pipeline-history feature captures execution data but provides only basic statistics. Users cannot identify optimization opportunities—such as bottleneck stages, failure patterns, or performance trends—without manual analysis of the raw history data.
- **User need:** Developers want actionable recommendations to improve pipeline efficiency. They need to understand which stages are slowest, why failures occur, and whether the pipeline is improving or degrading over time.
- **System purpose alignment:** Per SYSTEM_SPEC.md:Section 8 (Cross-Cutting Concerns:Observability), the system aims for observability via queue status and agent summaries. Per SYSTEM_SPEC.md:Section 2 (Business & Domain Context), murmur8 seeks to provide "structured processes to guide AI-generated code." This feature extends observability into actionable intelligence, enabling users to optimize their development workflow.

> This feature builds upon the existing pipeline-history feature (`.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`) without modifying history recording. It is a read-only analysis layer.

---

## 2. Scope

### In Scope

- New CLI command `murmur8 insights` that analyzes `.claude/pipeline-history.json`
- Bottleneck detection: Identify which stage consistently takes longest
- Failure pattern analysis: Determine which stages fail most and correlate with feature characteristics
- Anomaly detection: Flag runs that deviate significantly from average durations
- Trend analysis: Track whether pipeline performance is improving or degrading over time
- Agent performance comparison: Compare stage durations and success rates across agents
- Flag support for filtering analysis types (`--bottlenecks`, `--failures`, `--json`)
- Human-readable recommendations based on detected patterns

### Out of Scope

- Modifying pipeline-history recording logic (that feature is separate)
- Machine learning or complex statistical models (simple heuristics only)
- Automatic remediation or pipeline configuration changes
- Integration with external analytics platforms
- Predictive modelling of future pipeline performance
- Feature-type classification (assumes slugs are opaque identifiers)

---

## 3. Actors Involved

### Human User

- **Can do:** Invoke `murmur8 insights` to view optimization recommendations; filter by analysis type; export as JSON for programmatic use
- **Cannot do:** Modify the analysis thresholds or algorithms; act on recommendations automatically

### Insights Analyzer (internal component)

- **Can do:** Read history file; compute statistics; generate recommendations; output formatted reports
- **Cannot do:** Write to history file; modify pipeline configuration; alter agent behaviour

---

## 4. Behaviour Overview

### Happy-path behaviour

1. User runs `murmur8 insights` after accumulating several pipeline runs
2. System reads `.claude/pipeline-history.json` and validates data sufficiency
3. System performs analysis across four dimensions: bottlenecks, failures, anomalies, trends
4. System generates human-readable report with recommendations
5. User reviews recommendations and decides which to act upon

### Key alternatives or branches

- **Insufficient data:** If fewer than 3 runs exist, display message: "Insufficient data for insights. Complete at least 3 pipeline runs."
- **No failures:** If all runs succeeded, omit failure analysis section; note "No failures recorded"
- **Filtered analysis:** If `--bottlenecks` or `--failures` flag provided, display only that section
- **JSON output:** If `--json` flag provided, output structured JSON instead of formatted text
- **Corrupted history:** If history file is corrupted, display warning and exit gracefully

### User-visible outcomes

- Identification of the slowest pipeline stage with percentage of total time
- List of stages with high failure rates and potential contributing factors
- Flagged anomalous runs that deviated significantly from norms
- Trend indicators showing improvement or degradation over recent runs
- Actionable recommendations for each identified issue

---

## 5. State & Lifecycle Interactions

### States entered

- None. This feature is stateless and read-only.

### States modified

- None. This feature does not modify any system state.

### This feature is:

- **Not state-creating:** Does not persist analysis results
- **Not state-transitioning:** Does not alter pipeline flow
- **Not state-constraining:** Does not block any operations

This is a pure read-only analysis feature that operates on existing history data.

---

## 6. Rules & Decision Logic

### Rule: Bottleneck Detection

- **Description:** Identify the stage that consumes the largest proportion of total pipeline time
- **Inputs:** Stage durations from successful runs
- **Outputs:** Stage name, average duration, percentage of total pipeline time
- **Algorithm:** Calculate mean duration per stage; identify stage with highest mean; compute as percentage of sum
- **Threshold:** Report as bottleneck if stage accounts for >35% of total pipeline time
- **Deterministic:** Yes

### Rule: Failure Pattern Analysis

- **Description:** Identify stages with disproportionate failure rates and correlate with feature characteristics
- **Inputs:** All history entries with status `failed`; feature slugs
- **Outputs:** Failure rate per stage; most common failure stage; correlation hints
- **Algorithm:** Count failures by stage; compute failure rate as failures/total runs for that stage; identify features with repeated failures
- **Threshold:** Report as concerning if failure rate >15%
- **Deterministic:** Yes

### Rule: Anomaly Detection

- **Description:** Flag individual runs where stage duration deviates significantly from average
- **Inputs:** Stage durations from all runs; calculated means and standard deviations
- **Outputs:** List of anomalous runs with stage, actual duration, expected duration
- **Algorithm:** Calculate mean and standard deviation per stage; flag if duration > mean + 2*stddev
- **Threshold:** 2 standard deviations above mean
- **Scope:** Last 10 runs only (to limit output)
- **Deterministic:** Yes

### Rule: Trend Analysis

- **Description:** Determine if pipeline performance is improving or degrading over time
- **Inputs:** All history entries, sorted chronologically
- **Outputs:** Success rate trend (improving/stable/degrading); duration trend (improving/stable/degrading)
- **Algorithm:** Compare metrics from first half vs second half of history; compute percentage change
- **Thresholds:** Improving if >10% better; degrading if >10% worse; stable otherwise
- **Minimum data:** Requires at least 6 runs to compute trends
- **Deterministic:** Yes

### Rule: Agent Performance Comparison

- **Description:** Compare duration and success metrics across agent stages
- **Inputs:** All history entries with stage data
- **Outputs:** Ranked list of stages by average duration; success rate per stage
- **Algorithm:** Aggregate durations and success/failure counts per stage; rank by mean duration
- **Deterministic:** Yes

### Rule: Recommendation Generation

- **Description:** Generate actionable recommendations based on detected patterns
- **Inputs:** Analysis results from all rules above
- **Outputs:** Human-readable recommendation strings
- **Logic:**
  - If bottleneck stage is >40% of time → "Consider simplifying {stage} requirements or splitting features"
  - If failure rate >20% on a stage → "Review {stage} agent configuration or specification clarity"
  - If anomalies detected → "Investigate flagged runs for unusual feature complexity"
  - If degrading trend → "Review recent changes to agent specifications or system spec"
- **Deterministic:** Yes (same inputs produce same recommendations)

---

## 7. Dependencies

### System components

- `src/history.js` — Must expose `readHistoryFile()` function; currently exports this
- `bin/cli.js` — Must register new `insights` command
- `.claude/pipeline-history.json` — Must exist with entries from pipeline-history feature

### Upstream features

- **pipeline-history** (`.blueprint/features/feature_pipeline-history/`) — This feature depends entirely on history data recorded by pipeline-history. The history entry schema (slug, status, stages, timestamps, durations) must be stable.

### External systems

- None

### Operational dependencies

- File system read access to `.claude/pipeline-history.json`

---

## 8. Non-Functional Considerations

### Performance sensitivity

- Analysis is computed on-demand from full history file
- ASSUMPTION: History files contain <500 entries; O(n) algorithms acceptable
- No caching required; each invocation recomputes from scratch

### Audit/logging needs

- None. This feature is read-only and does not produce persistent outputs.

### Error tolerance

- If history file is missing, display "No history found. Run some pipelines first."
- If history file is corrupted, display warning and exit gracefully
- If insufficient data for specific analysis, skip that section with explanation

### Security implications

- Feature slugs may reveal project information; output to terminal only
- JSON output should not include sensitive data beyond what is already in history file

---

## 9. Assumptions & Open Questions

### Assumptions

- ASSUMPTION: The history entry schema from pipeline-history is stable: `{ slug, status, stages, completedAt, totalDurationMs }`
- ASSUMPTION: Stage names are fixed: `alex`, `cass`, `nigel`, `codey-plan`, `codey-implement`
- ASSUMPTION: 2 standard deviations is an appropriate anomaly threshold for this domain
- ASSUMPTION: 6 runs provides sufficient data for meaningful trend analysis
- ASSUMPTION: Users will act on recommendations manually; no automation required

### Open Questions

- Should anomaly detection consider stage-specific thresholds rather than uniform 2-stddev?
- Should trend analysis use a sliding window rather than first-half/second-half comparison?
- Should there be a `--verbose` flag for more detailed analysis output?
- Should the feature support analysis of a specific time range (e.g., last 30 days)?

---

## 10. Impact on System Specification

### Alignment assessment

This feature **reinforces existing system assumptions**:

- Per SYSTEM_SPEC.md:Section 8 (Observability), the system already aims for visibility into pipeline execution
- Per SYSTEM_SPEC.md:Section 5 (Core Domain Concepts), the queue and pipeline concepts are well-defined
- This feature adds an intelligence layer without altering core pipeline behaviour

### No contradictions identified

The feature does not alter:

- Agent roles or boundaries
- Pipeline flow or stage order
- Artifact structures or handoff mechanisms
- History recording behaviour (defers entirely to pipeline-history feature)

### Minor extension to system spec

The following addition to SYSTEM_SPEC.md:Section 5 (Core Domain Concepts) may be warranted:

> **Pipeline Insights** — An analysis layer that examines historical pipeline data to identify bottlenecks, failure patterns, anomalies, and trends. Provides recommendations for pipeline optimization without modifying pipeline behaviour.

This is flagged as a **non-breaking extension** for consideration.

---

## 11. Handover to BA (Cass)

### Story themes

1. **Bottleneck analysis** — Identifying and reporting the slowest pipeline stages
2. **Failure pattern analysis** — Analyzing failure frequency and generating recommendations
3. **Anomaly detection** — Flagging runs that deviate significantly from averages
4. **Trend analysis** — Computing and displaying performance trends over time
5. **JSON output** — Supporting programmatic consumption of insights data

### Expected story boundaries

- Core insights engine (statistics computation) may be shared across stories
- Each analysis type (bottlenecks, failures, anomalies, trends) is a candidate for separate story
- JSON output support could be combined with any analysis story or kept separate
- CLI command registration is infrastructure supporting all stories

### Areas needing careful story framing

- The threshold values (35% for bottleneck, 15% for failure rate, 2-stddev for anomaly) should be explicitly stated in acceptance criteria
- The minimum data requirements (3 runs for basic insights, 6 runs for trends) need clear edge case handling
- The recommendation text generation needs precise acceptance criteria for consistent output
- Handling of ties in "most common failure stage" should be explicit

---

## 12. Change Log (Feature-Level)

| Date       | Change                                | Reason                                    | Raised By |
|------------|---------------------------------------|-------------------------------------------|-----------|
| 2026-02-24 | Initial feature specification created | Extend pipeline-history with actionable insights | Alex |
