# Feature Ideas

Suggested features to implement using the `/implement-feature` pipeline.

## Backlog

### Priority Definitions

| Priority | Meaning |
|----------|---------|
| **P0** | Critical — do before release |
| **P1** | High — do soon |
| **P2** | Medium — nice to have |
| **P3** | Low — future consideration |

### Effort Definitions

| Effort | Meaning |
|--------|---------|
| **S** | Small — <1 hour, <50 lines |
| **M** | Medium — 1-3 hours, 50-200 lines |
| **L** | Large — 3-8 hours, 200-500 lines |
| **XL** | Extra Large — 1+ days, 500+ lines |

### Status Key

- ✅ Done
- 🚧 In Progress
- ⏳ Planned
- 💡 Idea

---

## Parallel Safeguards (P0 — Before Release)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-confirm | S | Confirmation prompt before execution |
| ✅ | parallel-lock | S | Lock file to prevent concurrent runs |
| ✅ | parallel-logging | M | Output to log files per pipeline |
| ✅ | parallel-abort | M | Abort command to stop all and cleanup |

## High Priority (P1)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ⏳ | parallel-timeout | M | Timeout per pipeline to prevent runaway |
| ⏳ | parallel-disk-check | S | Warn if disk space is low |
| ⏳ | parallel-max-limit | S | Cap total features to prevent resource exhaustion |
| ⏳ | cost-tracking | M | Track token usage and estimated costs |
| ⏳ | export-history | S | Export history to CSV/JSON |
| ⏳ | diff-preview | S | Show diff before auto-commit |

## Medium Priority (P2)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| ✅ | parallel-features | L | Run multiple pipelines in parallel (DONE) |
| ⏳ | agent-timeouts | M | Configurable timeouts per stage |
| ⏳ | rollback | M | Revert a feature's commits |
| ⏳ | agent-overrides | M | Per-project agent customization |
| ⏳ | resume-from-stage | M | Resume from specific stage |
| ⏳ | parallel-progress | M | Real-time progress per pipeline |

## Low Priority (P3)

| Status | Feature | Effort | Description |
|--------|---------|--------|-------------|
| 💡 | parallel-rollback | M | Undo failed parallel run |
| 💡 | dry-run-mode | M | Validate without running agents |
| 💡 | feature-dependencies | M | Define execution order |
| 💡 | webhook-notifications | L | Slack/email on completion |
| 💡 | mcp-integration | XL | Expose as MCP tools |

---

## Details

### Parallel Safeguards

#### parallel-confirm
Confirmation prompt before starting parallel execution:
```
This will:
  • Create 3 git worktrees
  • Run 3 parallel pipelines
  • Estimated disk usage: ~150MB

Continue? [y/N]
```
- Skip with `--yes` or `-y` flag
- Prevents accidental execution

#### parallel-lock
Lock file to prevent running parallel twice simultaneously:
- Create `.claude/parallel.lock` with PID on start
- Check if lock exists and process is running before starting
- Clean up lock on completion or abort
- `--force` flag to override (with warning)

#### parallel-logging
Write each pipeline's output to a log file:
- Location: `.claude/worktrees/feat-{slug}/pipeline.log`
- Keeps console clean - only show summary status
- `--verbose` flag to also stream to console
- Timestamps on each line for debugging

#### parallel-abort
Command to stop all running pipelines and clean up:
```bash
orchestr8 parallel abort           # Stop all, preserve worktrees
orchestr8 parallel abort --cleanup # Stop all, remove worktrees
```
- Send SIGTERM to child processes
- Update queue state to 'aborted'
- Option to preserve worktrees for debugging

#### parallel-timeout
Timeout per pipeline to prevent runaway processes:
- Default: 30 minutes per pipeline
- Configure: `parallel-config set timeout 60` (minutes)
- Override: `--timeout=45` flag
- On timeout: kill process, mark as failed, preserve worktree

#### parallel-disk-check
Check available disk space before starting:
- Estimate space needed: ~50MB per worktree
- Warn if less than 500MB available
- `--skip-disk-check` to override
- Show current disk usage in dry-run output

#### parallel-max-limit
Cap total features that can be queued:
- Default: 10 features max
- Configure: `parallel-config set maxFeatures 20`
- Prevents accidentally overwhelming the system
- Error message with current limit if exceeded

### export-history
Complements the existing history/insights modules. Would allow users to:
- Export to CSV for spreadsheet analysis
- Export to JSON for custom dashboards
- Filter by date range (`--since`, `--until`), status, or feature
- `orchestr8 history export --format=csv --since=2024-01-01`
- Useful for team reporting and metrics tracking

### agent-timeouts
Safety feature to prevent runaway agents:
- Configurable timeout per stage (default: 5 min)
- Also support `--timeout=10m` flag for one-off overrides
- Graceful termination with status recording
- Save partial work before termination for recovery
- Integrates with retry logic (timeout = retriable failure)

### dry-run-mode
Validation-only mode (note: true dry-run would require mocking agents):
- Validate all required inputs exist
- Check specs are complete and well-formed
- Estimate token usage based on input sizes
- Show expected output file paths
- `--dry-run` flag on `/implement-feature`

### resume-from-stage
More granular recovery than current queue-based resume:
- `--resume-from=nigel` to skip Alex and Cass
- Primary use case: "I edited Cass's output manually, now run from Nigel"
- Validates required artifacts exist before proceeding
- Warns if artifacts are older than expected (stale detection)

### webhook-notifications
External integrations:
- Slack webhook on completion/failure
- Email notifications
- Custom webhook URLs
- Would need secure credential storage
- **Consider:** Start with simple shell hooks (`on-complete`, `on-failure`) instead

### cost-tracking
Track API usage for budgeting and optimization:
- Record token counts per stage (input/output)
- Calculate estimated cost using model pricing
- Add `--cost` flag to `orchestr8 history`
- Show cost trends in `orchestr8 insights`
- Helps identify expensive stages for optimization

### diff-preview
Safety check before auto-commit:
- Show `git diff` of all changes before committing
- Prompt user to confirm, abort, or edit commit message
- Flag `--no-diff-preview` to skip (for CI/automation)
- Prevents accidental commits of unintended changes

### rollback
Undo a feature implementation:
- `orchestr8 rollback <feature-slug>` reverts commits
- Uses git history to find commits by feature
- Shows preview of what will be reverted
- Supports `--dry-run` to preview without reverting

### agent-overrides
Per-project agent customization:
- Create `.blueprint/agents/overrides/AGENT_*.md` files
- Override content is appended to base agent specs
- Allows project-specific instructions without forking
- Example: Add domain-specific testing requirements for Nigel

### parallel-features ✅ DONE
Implemented in v2.7. See README for documentation.

### feature-dependencies
Define execution order for related features:
- Add `depends_on: [feat-a, feat-b]` to feature spec
- Pipeline refuses to start until dependencies complete
- `orchestr8 deps <slug>` shows dependency graph
- Useful for features that build on each other

### mcp-integration
Expose orchestr8 as MCP tools:
- `implement-feature` as an MCP tool
- `get-pipeline-status` for monitoring
- `get-insights` for analytics
- Enables integration with other AI systems and workflows

---

*To implement any of these, run:*
```bash
/implement-feature "feature-name"
```
