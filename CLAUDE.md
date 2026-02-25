# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests (Node.js built-in test runner, requires Node.js >=18)
node --test

# Run a single test file
node --test test/feature_pipeline-history.test.js

# Run CLI locally during development
node bin/cli.js <command>

# Test initialization in another directory
cd /tmp/test-project && node /workspaces/agent-workflow/bin/cli.js init

# Pre-flight validation
node bin/cli.js validate

# View/reset the pipeline queue
node bin/cli.js queue
node bin/cli.js queue reset

# Pipeline history and insights
node bin/cli.js history             # View recent runs
node bin/cli.js history --stats     # Aggregate statistics
node bin/cli.js history --all       # All runs
node bin/cli.js history clear       # Clear history
node bin/cli.js insights            # Analyze patterns
node bin/cli.js insights --feedback # Feedback correlation

# Configuration
node bin/cli.js retry-config        # View retry settings
node bin/cli.js feedback-config     # View feedback thresholds
```

## Architecture

orchestr8 is a multi-agent workflow framework that coordinates four AI agents (Alex, Cass, Nigel, Codey) to automate feature development from specification to implementation.

### Source Structure

- `bin/cli.js` - CLI entry point, routes commands to `src/` modules
- `src/index.js` - Main exports for programmatic use
- `src/init.js` - Copies `.blueprint/`, `.business_context/`, and SKILL.md to target project
- `src/update.js` - Updates framework files while preserving user content in `features/` and `system_specification/`
- `src/orchestrator.js` - Queue management for the pipeline (`.claude/implement-queue.json`)
- `src/validate.js` - Pre-flight checks (directories, specs, Node.js version)
- `src/history.js` - Records execution data (timing, status, feedback)
- `src/insights.js` - Analyzes patterns, detects bottlenecks, recommends improvements
- `src/retry.js` - Smart retry strategies based on failure history
- `src/feedback.js` - Agent-to-agent quality assessment with thresholds

### Bundled Assets

- `.blueprint/agents/` - Agent specifications (AGENT_*.md) defining each agent's role and behavior
- `.blueprint/templates/` - SYSTEM_SPEC.md and FEATURE_SPEC.md templates
- `.blueprint/ways_of_working/` - Development rituals
- `.business_context/` - Placeholder for business context documents
- `SKILL.md` - The `/implement-feature` skill definition (copied to `.claude/commands/` on init)

### Pipeline Flow

The `/implement-feature` skill spawns agents sequentially via Task tool sub-agents:

```
Alex (feature spec) → Cass (user stories) → Nigel (tests) → Codey (plan → implement) → Auto-commit
```

Invocation options:
- `/implement-feature "slug"` - Run full pipeline
- `/implement-feature "slug" --pause-after=alex|cass|nigel|codey-plan` - Pause at stage for review
- `/implement-feature "slug" --no-commit` - Skip auto-commit at end
- `/implement-feature "slug" --no-feedback` - Skip feedback collection
- `/implement-feature "slug" --no-validate` - Skip pre-flight validation
- `/implement-feature "slug" --no-history` - Skip history recording

Queue state is persisted to `.claude/implement-queue.json` for recovery on failure. The skill reads the queue on invocation and resumes from `current.stage`.

## Key Patterns

- User content directories (`features/`, `system_specification/`) are preserved during `update`
- Framework directories (`agents/`, `templates/`, `ways_of_working/`) are replaced during `update`
- State files are gitignored: `implement-queue.json`, `pipeline-history.json`, `retry-config.json`, `feedback-config.json`

## Token Limit Handling

The pipeline is optimized to avoid Claude's 4096 output token limit:

- **Incremental file writes** - Agents write one file at a time, not all at once
- **Consolidated artifacts** - Nigel produces 2 files (test-spec.md + test file) instead of 4
- **Brief summaries** - Completion messages are 5 bullets max
- **Reference by path** - Agents reference other artifacts by path rather than quoting content

If token errors occur, set `CLAUDE_CODE_MAX_OUTPUT_TOKENS` environment variable higher.
