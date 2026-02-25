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

### Configuration

| Command | Description |
|---------|-------------|
| `npx orchestr8 retry-config` | View retry configuration |
| `npx orchestr8 retry-config set <key> <value>` | Modify retry settings |
| `npx orchestr8 retry-config reset` | Reset to defaults |
| `npx orchestr8 feedback-config` | View feedback thresholds |
| `npx orchestr8 feedback-config set <key> <value>` | Modify feedback settings |

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
│   ├── pipeline-history.json      # Execution history (gitignored)
│   ├── retry-config.json          # Retry configuration (gitignored)
│   ├── feedback-config.json       # Feedback thresholds (gitignored)
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

## License

MIT
