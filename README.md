# orchestr8

A multi-agent workflow framework for automated feature development. Four specialized AI agents collaborate in sequence to take features from specification to implementation, with built-in feedback loops and self-improvement capabilities.

## Agents

| Agent | Role |
|-------|------|
| **Alex** | System Specification & Chief-of-Staff — creates/maintains specs, guards design coherence |
| **Cass** | Story Writer/BA — translates specs into testable user stories |
| **Nigel** | Tester — converts stories into executable tests and test plans |
| **Codey** | Developer — implements code to satisfy tests (test-first) |

## Installation

```bash
npx orchestr8 init
```

This installs the `.blueprint/` directory, `.business_context/`, and the `/implement-feature` skill to `.claude/commands/`. If files already exist, you'll be prompted before overwriting. It also adds the workflow queue to `.gitignore`.

During initialization, orchestr8 **auto-detects your project's tech stack** from manifest files (`package.json`, `pyproject.toml`, `go.mod`, etc.) and writes the result to `.claude/stack-config.json`. The agents (Nigel and Codey) read this file at runtime to adapt their testing and implementation approach to your stack.

```bash
# Review what was detected
npx orchestr8 stack-config

# Adjust if needed
npx orchestr8 stack-config set language TypeScript
npx orchestr8 stack-config set frameworks '["next","react"]'
npx orchestr8 stack-config set testRunner vitest
npx orchestr8 stack-config set testCommand "npx vitest run"
```

If you're working with a non-JavaScript project, set the stack config before running the pipeline:

```bash
# Python/Django example
npx orchestr8 stack-config set language Python
npx orchestr8 stack-config set runtime "Python 3.12"
npx orchestr8 stack-config set packageManager pip
npx orchestr8 stack-config set frameworks '["django"]'
npx orchestr8 stack-config set testRunner pytest
npx orchestr8 stack-config set testCommand "pytest"
npx orchestr8 stack-config set linter ruff
```

## Keeping Up to Date

**Modules** (history, insights, feedback, retry, validate) are part of the npm package and update automatically when you use `npx` - no action needed.

**Project files** (agent specs, templates, skill definition) are copied to your project and need explicit updating:

```bash
npx orchestr8 update
```

This updates `.blueprint/agents/`, `.blueprint/templates/`, `.blueprint/ways_of_working/`, and `.claude/commands/implement-feature.md` while preserving your content in `features/` and `system_specification/`.

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `npx orchestr8 init` | Initialize `.blueprint/`, `.business_context/`, and skill in your project |
| `npx orchestr8 update` | Update agents, templates, and rituals to latest version |
| `npx orchestr8 validate` | Pre-flight checks before running pipeline |
| `npx orchestr8 help` | Show help |

### History & Insights

| Command | Description |
|---------|-------------|
| `npx orchestr8 history` | View recent pipeline runs |
| `npx orchestr8 history --stats` | View aggregate statistics |
| `npx orchestr8 history --all` | View all runs |
| `npx orchestr8 history clear` | Clear history |
| `npx orchestr8 insights` | Analyze patterns and get recommendations |
| `npx orchestr8 insights --feedback` | View feedback correlation analysis |
| `npx orchestr8 insights --bottlenecks` | View bottleneck analysis |
| `npx orchestr8 insights --failures` | View failure pattern analysis |

### Parallel Execution

| Command | Description |
|---------|-------------|
| `npx orchestr8 parallel <slugs...>` | Run multiple features in parallel |
| `npx orchestr8 parallel <slugs...> --dry-run` | Preview execution plan |
| `npx orchestr8 parallel status` | Show status of running pipelines |
| `npx orchestr8 parallel cleanup` | Remove completed worktrees |
| `npx orchestr8 parallel-config` | View parallel configuration |
| `npx orchestr8 parallel-config set <key> <value>` | Modify parallel settings |

### Configuration

| Command | Description |
|---------|-------------|
| `npx orchestr8 stack-config` | View detected tech stack |
| `npx orchestr8 stack-config set <key> <value>` | Modify stack settings (language, frameworks, testRunner, etc.) |
| `npx orchestr8 stack-config reset` | Reset to empty defaults |
| `npx orchestr8 retry-config` | View retry configuration |
| `npx orchestr8 retry-config set <key> <value>` | Modify retry settings |
| `npx orchestr8 retry-config reset` | Reset to defaults |
| `npx orchestr8 feedback-config` | View feedback thresholds |
| `npx orchestr8 feedback-config set <key> <value>` | Modify feedback settings |
| `npx orchestr8 parallel-config` | View parallel pipeline configuration |
| `npx orchestr8 parallel-config set <key> <value>` | Modify parallel settings |

## Usage

Run the pipeline with the `/implement-feature` skill in Claude Code:

```bash
/implement-feature                           # Interactive
/implement-feature "user-auth"               # New feature
/implement-feature "user-auth" --no-feedback # Skip feedback collection
/implement-feature "user-auth" --no-validate # Skip pre-flight validation
/implement-feature "user-auth" --no-history  # Skip history recording
/implement-feature "user-auth" --no-commit   # Skip auto-commit
/implement-feature "user-auth" --pause-after=alex|cass|nigel|codey-plan
/implement-feature "user-auth" --with-stories  # Force include Cass stage
/implement-feature "user-auth" --skip-stories  # Force skip Cass stage
```

## Smart Story Routing (v2.7)

The pipeline automatically classifies features as **technical** or **user-facing** and routes accordingly:

| Feature Type | Cass Stage | Example Features |
|--------------|------------|------------------|
| **Technical** | Skipped | refactoring, optimization, infrastructure, caching |
| **User-facing** | Included | login flows, dashboards, forms, notifications |

This saves ~25-40k tokens per technical feature while preserving story quality for user-facing features.

```bash
# Auto-detection (default)
/implement-feature "token-optimization"  # Detected as technical → skips Cass
/implement-feature "user-dashboard"      # Detected as user-facing → includes Cass

# Manual override
/implement-feature "edge-case" --with-stories   # Force include Cass
/implement-feature "edge-case" --skip-stories   # Force skip Cass
```

## Pipeline Flow

The pipeline includes validation, smart routing, feedback loops, and history tracking:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 0: Pre-flight Validation                                  │
│  • Check directories, specs, Node.js version                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Insights Preview                                               │
│  • "Last 10 runs: 85% success, estimated ~12 min"               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Alex (Feature Spec) + Handoff Summary                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Smart Routing (v2.7)                                           │
│  • Classify feature as technical or user-facing                 │
│  • Technical → skip Cass (saves ~25-40k tokens)                 │
│  • User-facing → include Cass                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Technical Features  │        │  User-Facing Features│
│  Skip to Nigel       │        │  Cass (User Stories) │
└──────────────────────┘        └──────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Nigel (Tests) + Handoff Summary                                │
│         │                                                       │
│         ▼                                                       │
│  Codey rates Nigel → Quality Gate                               │
│         │                                                       │
│         ▼                                                       │
│  Codey (Plan → Implement)                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    On Failure│
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Smart Retry                                                    │
│  • Check feedback chain for root cause                          │
│  • Recommend strategy based on history                          │
│  • Apply: simplify-prompt, add-context, incremental, etc.       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Auto-commit → Record to History                                │
│  • Duration, feedback scores, outcome                           │
└─────────────────────────────────────────────────────────────────┘
```

## Modules

orchestr8 includes these built-in modules for observability and self-improvement:

| Module | Purpose |
|--------|---------|
| **validate** | Pre-flight checks before pipeline runs |
| **history** | Records execution data (timing, status, feedback) |
| **insights** | Analyzes patterns, detects bottlenecks, recommends improvements |
| **retry** | Smart retry strategies based on failure history |
| **feedback** | Agent-to-agent quality assessment with correlation tracking |
| **classifier** | Smart routing — classifies features as technical or user-facing |
| **handoff** | Structured summaries between agents for token efficiency |
| **business-context** | Lazy loading of business context based on feature needs |
| **tools** | Tool schemas and validation for Claude native features |
| **parallel** | Parallel pipeline execution using git worktrees |
| **stack** | Configurable tech stack detection and configuration |

### How They Work Together

```
Pipeline Run
     │
     ├──► history.js records timing at each stage
     │
     ├──► feedback.js collects quality ratings between stages
     │
     └──► On completion/failure, data stored in pipeline-history.json
                              │
                              ▼
                    Future Pipeline Runs
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
     ▼                        ▼                        ▼
insights.js              retry.js               feedback.js
analyzes:               recommends:            calibrates:
• Bottlenecks           • Retry strategies     • Quality thresholds
• Failure patterns      • Based on history     • Agent accuracy
• Trends                • And feedback issues
```

## Directory Structure

```
your-project/
├── .blueprint/
│   ├── agents/                    # Agent specifications
│   │   ├── AGENT_SPECIFICATION_ALEX.md
│   │   ├── AGENT_BA_CASS.md
│   │   ├── AGENT_TESTER_NIGEL.md
│   │   ├── AGENT_DEVELOPER_CODEY.md
│   │   └── GUARDRAILS.md          # Shared guardrails (v2.7)
│   ├── prompts/                   # Slim runtime prompts (v2.7)
│   │   ├── TEMPLATE.md
│   │   ├── alex-runtime.md
│   │   ├── cass-runtime.md
│   │   ├── nigel-runtime.md
│   │   ├── codey-plan-runtime.md
│   │   └── codey-implement-runtime.md
│   ├── templates/                 # Spec and output templates
│   │   ├── SYSTEM_SPEC.md
│   │   ├── FEATURE_SPEC.md
│   │   ├── STORY_TEMPLATE.md      # (v2.7)
│   │   └── TEST_TEMPLATE.md       # (v2.7)
│   ├── ways_of_working/           # Development rituals
│   ├── features/                  # Feature specs (populated per feature)
│   └── system_specification/      # System spec (populated on first run)
├── .business_context/             # Business context documents
│   └── README.md
├── .claude/
│   ├── commands/
│   │   └── implement-feature.md   # The /implement-feature skill
│   ├── worktrees/                 # Git worktrees for parallel execution
│   │   └── feat-{slug}/           # Isolated worktree per feature
│   ├── pipeline-history.json      # Execution history (gitignored)
│   ├── retry-config.json          # Retry configuration (gitignored)
│   ├── feedback-config.json       # Feedback thresholds (gitignored)
│   ├── parallel-config.json       # Parallel execution config (gitignored)
│   ├── parallel-queue.json        # Parallel pipeline state (gitignored)
│   ├── stack-config.json          # Tech stack configuration (gitignored)
│   └── implement-queue.json       # Pipeline queue state (gitignored)
└── test/
    ├── artifacts/                 # Test specs per feature
    └── feature_*.test.js          # Executable tests
```

## Agent Guardrails

All agents follow strict guardrails to ensure quality:

| Guardrail | Description |
|-----------|-------------|
| **Source Restrictions** | Only use provided inputs (specs, code, business_context) |
| **Prohibited Sources** | No social media, forums, external APIs, training data for domain facts |
| **Citation Requirements** | All claims must cite source files |
| **Confidentiality** | Business context treated as confidential |
| **Escalation Protocol** | Clear rules for when to ask vs assume |

## Self-Improvement Loop

The pipeline learns from itself:

1. **Record** — Each run records timing, feedback, and outcomes
2. **Analyze** — `orchestr8 insights` identifies patterns
3. **Adapt** — Future runs use history to:
   - Set dynamic quality thresholds
   - Select optimal retry strategies
   - Predict duration and success rate
4. **Improve** — Feedback patterns suggest prompt improvements

```bash
# Example insights output
$ npx orchestr8 insights

## Pipeline Insights

### Bottlenecks
- nigel averages 4.2 min (42% of pipeline time)
- Recommendation: Consider simplifying test requirements

### Failure Patterns
- codey-implement has 23% failure rate
- Most common issue: "missing-error-handling" (73% correlation)
- Recommendation: Ensure Alex includes error handling in specs

### Trends
- Success rate: 75% → 85% (improving)
- Avg duration: 14 min → 11 min (improving)
```

## Token Efficiency (v2.7)

Version 2.7 introduces several optimizations to reduce token usage:

| Optimization | Savings | Description |
|--------------|---------|-------------|
| **Shared Guardrails** | ~1,200 tokens | Single GUARDRAILS.md instead of duplicated in each agent spec |
| **Slim Runtime Prompts** | ~5,200 tokens | 30-50 line prompts instead of 200-400 line full specs |
| **Upstream Summaries** | ~2,000-4,000 tokens | Handoff summaries between agents instead of full artifacts |
| **Template Extraction** | ~800 tokens | Templates moved to separate files, loaded on demand |
| **Lazy Business Context** | Variable | Only loaded when feature spec references it |
| **Compressed Feedback** | ~400 tokens | 3-line feedback prompts instead of 7-line |
| **Smart Story Routing** | ~25,000-40,000 tokens | Skip Cass for technical features |

**Total estimated savings: 10,000+ tokens per pipeline run** (more for technical features)

## Parallel Execution with Git Worktrees

Run multiple feature pipelines simultaneously using git worktrees for isolation. Each feature gets its own worktree and branch, allowing true parallel development without conflicts.

### How It Works

```
orchestr8 parallel user-auth dashboard notifications
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Pre-flight Validation                │
    │  • Git repository check               │
    │  • Clean working tree required        │
    │  • Git 2.5+ for worktree support      │
    │  • Feature specs exist & complete     │
    │  • File overlap detection             │
    │  • Dependency detection               │
    │  • Scope estimation                   │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Create Isolated Worktrees            │
    │                                       │
    │  .claude/worktrees/feat-user-auth/    │
    │       └─ branch: feature/user-auth    │
    │                                       │
    │  .claude/worktrees/feat-dashboard/    │
    │       └─ branch: feature/dashboard    │
    │                                       │
    │  .claude/worktrees/feat-notifications/│
    │       └─ branch: feature/notifications│
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Spawn Parallel Pipelines             │
    │  (max 3 concurrent by default)        │
    │                                       │
    │  Each runs: Alex → Nigel → Codey      │
    │  in its isolated worktree             │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │  Merge on Completion                  │
    │  • First finished = first merged      │
    │  • Conflicts preserved for resolution │
    │  • Successful worktrees cleaned up    │
    └───────────────────────────────────────┘
```

### Usage

```bash
# Run 3 features in parallel (default concurrency)
npx orchestr8 parallel user-auth dashboard notifications

# Preview what would happen without executing
npx orchestr8 parallel user-auth dashboard --dry-run

# Limit concurrent pipelines
npx orchestr8 parallel feat-a feat-b feat-c feat-d --max-concurrency=2

# Check status of running pipelines
npx orchestr8 parallel status

# Skip pre-flight feature validation
npx orchestr8 parallel user-auth dashboard --skip-preflight

# Clean up completed/aborted worktrees
npx orchestr8 parallel cleanup
```

### Pre-flight Batch Validation (v2.8)

Before parallel execution, the system validates the batch to prevent wasted resources:

```
$ npx orchestr8 parallel feat-a feat-b feat-c --dry-run

Pre-flight Validation
=====================

✓ feat-a: Spec complete, 3 stories, Plan exists
✓ feat-b: Spec complete, 2 stories
✗ feat-c: Not ready
    ✗ Missing FEATURE_SPEC.md

Conflict Analysis
=================

⚠ File overlap detected:
  • src/utils.js: feat-a, feat-b both modify

Scope Estimation
================

  Feature   | Stories | Files | Est. Time
  ----------|---------|-------|----------
  feat-a    |       3 |     4 | ~27 min
  feat-b    |       2 |     2 | ~24 min
  feat-c    |       0 |     0 | ~10 min

Total estimated: ~61 min (parallel: ~27 min)
```

**Validation checks:**
- Feature specs exist and have required sections
- User stories present (warns if missing)
- Implementation plans scanned for file overlap
- Dependencies between features detected
- Scope estimated from story/file counts

**On validation failure:**
```
Cannot proceed. Fix issues above or use --skip-preflight to override.

Suggested commands:
  /implement-feature "feat-c" --pause-after=alex
```

### Configuration

The parallel module is **CLI-agnostic** — configure it to work with different AI coding tools:

```bash
# View current configuration
npx orchestr8 parallel-config

# Output:
#   cli:            npx claude
#   skill:          /implement-feature
#   skillFlags:     --no-commit
#   worktreeDir:    .claude/worktrees
#   maxConcurrency: 3
#   queueFile:      .claude/parallel-queue.json
```

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `cli` | `npx claude` | The CLI tool to invoke |
| `skill` | `/implement-feature` | The command/skill to run |
| `skillFlags` | `--no-commit` | Additional flags for the skill |
| `worktreeDir` | `.claude/worktrees` | Where to create worktrees |
| `maxConcurrency` | `3` | Maximum parallel pipelines |
| `maxFeatures` | `10` | Maximum features per batch |
| `timeout` | `30` | Timeout per pipeline (minutes) |
| `minDiskSpaceMB` | `500` | Minimum disk space warning threshold |
| `queueFile` | `.claude/parallel-queue.json` | State persistence file |

#### Examples for Different CLIs

```bash
# Claude Code (default)
npx orchestr8 parallel-config set cli "npx claude"
npx orchestr8 parallel-config set skill "/implement-feature"

# Cursor
npx orchestr8 parallel-config set cli "cursor"
npx orchestr8 parallel-config set skill "composer"
npx orchestr8 parallel-config set skillFlags ""

# Aider
npx orchestr8 parallel-config set cli "aider"
npx orchestr8 parallel-config set skill "--message"
npx orchestr8 parallel-config set skillFlags "implement feature:"

# Custom agent script
npx orchestr8 parallel-config set cli "./my-agent.sh"
npx orchestr8 parallel-config set skill "run"

# Reset to defaults
npx orchestr8 parallel-config reset
```

### State Management

Each feature progresses through these states:

```
parallel_queued → worktree_created → parallel_running → merge_pending → parallel_complete
                                           │                  │
                                           ▼                  ▼
                                    parallel_failed    merge_conflict
```

- **Successful features**: Merged to main, worktree cleaned up
- **Failed pipelines**: Worktree preserved for debugging
- **Merge conflicts**: Branch preserved, manual resolution required

### Requirements

- **Git 2.5+** (worktree support)
- **Clean working tree** (no uncommitted changes)
- **Sufficient disk space** (each worktree is a full checkout)

## License

MIT
