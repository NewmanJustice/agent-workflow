# Story — JSON Output

## User story

As a developer, I want to export pipeline insights as structured JSON so that I can integrate the analysis with other tools or process the data programmatically.

---

## Context / scope

- User wants machine-readable output instead of human-readable text
- JSON output contains all the same analysis data as text output
- Enables integration with CI/CD pipelines, dashboards, or custom tooling
- This is a read-only analysis; no pipeline state is modified
- Route: `murmur8 insights --json`

Per FEATURE_SPEC.md:Section 4 (Key alternatives or branches):
- `--json` flag produces structured JSON instead of formatted text

---

## Acceptance criteria

**AC-1 — Output JSON when flag provided**
- Given the history file contains valid pipeline data,
- When the user runs `murmur8 insights --json`,
- Then the output is valid JSON (parseable by `JSON.parse()`).

**AC-2 — Include bottleneck data in JSON**
- Given bottleneck analysis completes successfully,
- When `--json` flag is provided,
- Then the JSON output includes a `bottlenecks` object with: `stage`, `averageDurationMs`, `percentageOfTotal`, `isBottleneck`, `recommendation` (if applicable).

**AC-3 — Include failure data in JSON**
- Given failure analysis completes successfully,
- When `--json` flag is provided,
- Then the JSON output includes a `failures` object with: `failuresByStage` (array), `mostCommonFailureStage`, `featuresWithRepeatedFailures` (array), `recommendation` (if applicable).

**AC-4 — Include anomaly data in JSON**
- Given anomaly detection completes successfully,
- When `--json` flag is provided,
- Then the JSON output includes an `anomalies` object with: `detected` (array of anomalous runs), `recommendation` (if applicable).

**AC-5 — Include trend data in JSON**
- Given trend analysis completes successfully,
- When `--json` flag is provided,
- Then the JSON output includes a `trends` object with: `successRate` (trend + percentage), `duration` (trend + percentage), `recommendation` (if applicable).

**AC-6 — Combine JSON with filter flags**
- Given the user runs `murmur8 insights --json --bottlenecks`,
- When the analysis completes,
- Then the JSON output includes only the `bottlenecks` section (other analysis types are omitted).

**AC-7 — Handle insufficient data in JSON**
- Given there is insufficient data for analysis,
- When `--json` flag is provided,
- Then the JSON output includes an `error` field with the appropriate message (e.g., `{"error": "Insufficient data for insights. Complete at least 3 pipeline runs."}`).

---

## Out of scope

- Exporting JSON to a file (output to stdout only)
- JSON schema validation or versioning
- Compressed or minified JSON output options
- Integration with specific external platforms
- Historical JSON output comparison

---

## References

- Feature spec: `.blueprint/features/feature_pipeline-insights/FEATURE_SPEC.md`
- Upstream dependency: `.blueprint/features/feature_pipeline-history/FEATURE_SPEC.md`
- System spec: `.blueprint/system_specification/SYSTEM_SPEC.md`
