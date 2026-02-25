# Feature Ideas

Suggested features to implement using the `/implement-feature` pipeline.

## Suggested Backlog Order

Priority based on effort-to-value ratio:

| Priority | Feature | Effort | Value | Rationale |
|----------|---------|--------|-------|-----------|
| 1 | cost-tracking | Low | High | Visibility into API costs; users need this for budgeting |
| 2 | export-history | Low | High | Completes observability story; enables team reporting |
| 3 | diff-preview | Low | Medium | Prevents surprise commits; quick safety win |
| 4 | agent-timeouts | Medium | High | Important safety feature; prevents runaway costs |
| 5 | rollback | Low | Medium | Easy undo for mistakes; builds on git |
| 6 | agent-overrides | Medium | High | Per-project customization without forking |
| 7 | resume-from-stage | Medium | Medium | Enables manual artifact editing workflows |
| 8 | parallel-features | Medium | High | Major productivity boost for large projects |
| 9 | dry-run-mode | Medium | Medium | Useful but hard to implement accurately |
| 10 | feature-dependencies | Medium | Medium | Useful for complex projects with ordered work |
| 11 | webhook-notifications | High | Medium | Start with shell hooks instead; defer full webhooks |
| 12 | mcp-integration | High | High | Ecosystem play; defer until core is stable |

## All Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **cost-tracking** | Track token usage per stage; show estimated cost in insights | Low |
| **export-history** | Export pipeline history to CSV/JSON for external reporting and analysis | Low |
| **diff-preview** | Show git diff before auto-commit with confirm/abort option | Low |
| **rollback** | Revert a feature's commits with `orchestr8 rollback <slug>` | Low |
| **agent-timeouts** | Add configurable timeouts per stage to prevent runaway agents | Medium |
| **agent-overrides** | Per-project agent customization via override files | Medium |
| **resume-from-stage** | Allow resuming from a specific stage (e.g., `--resume-from=nigel`) | Medium |
| **parallel-features** | Run multiple feature pipelines in parallel using git worktrees | Medium |
| **dry-run-mode** | Validate inputs and estimate work without running agents | Medium |
| **feature-dependencies** | Define dependencies between features for ordered execution | Medium |
| **webhook-notifications** | Send notifications (Slack, email) on pipeline completion/failure | High |
| **mcp-integration** | Expose pipeline as MCP tools for integration with other AI systems | High |

## Details

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

### parallel-features
Run multiple features simultaneously:
- `orchestr8 parallel feat-a feat-b feat-c`
- Uses git worktrees for isolation
- Each feature runs in its own worktree/branch
- Merges results back to main branch
- Significantly speeds up large backlogs

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
