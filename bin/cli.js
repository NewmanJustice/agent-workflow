#!/usr/bin/env node

const { init } = require('../src/init');
const { update } = require('../src/update');
const { displayQueue, resetQueue } = require('../src/orchestrator');
const { validate, formatOutput } = require('../src/validate');
const { displayHistory, showStats, clearHistory } = require('../src/history');
const { displayInsights } = require('../src/insights');
const { displayConfig, setConfigValue, resetConfig } = require('../src/retry');
const {
  displayConfig: displayFeedbackConfig,
  setConfigValue: setFeedbackConfigValue,
  resetConfig: resetFeedbackConfig
} = require('../src/feedback');
const { displayFeedbackInsights } = require('../src/insights');
const {
  formatStatus,
  getDefaultConfig,
  splitByLimit,
  runParallel,
  loadQueue,
  cleanupWorktrees
} = require('../src/parallel');

const args = process.argv.slice(2);
const command = args[0];
const subArg = args[1];

function parseFlags(args) {
  const flags = {};
  for (const arg of args) {
    if (arg === '--all') flags.all = true;
    if (arg === '--stats') flags.stats = true;
    if (arg === '--force') flags.force = true;
    if (arg === '--bottlenecks') flags.bottlenecks = true;
    if (arg === '--failures') flags.failures = true;
    if (arg === '--json') flags.json = true;
    if (arg === '--feedback') flags.feedback = true;
  }
  return flags;
}

const commands = {
  init: {
    fn: init,
    description: 'Initialize .blueprint directory in current project'
  },
  update: {
    fn: update,
    description: 'Update agents, templates, and rituals (preserves your content)'
  },
  queue: {
    fn: () => {
      if (subArg === 'reset') {
        resetQueue();
        console.log('Queue has been reset.');
      } else {
        displayQueue();
      }
    },
    description: 'Show queue status (use "reset" to clear)'
  },
  validate: {
    fn: async () => {
      const result = await validate();
      const useColor = process.stdout.isTTY || false;
      console.log(formatOutput(result, useColor));
      process.exit(result.exitCode);
    },
    description: 'Run pre-flight checks to validate project configuration'
  },
  history: {
    fn: async () => {
      const flags = parseFlags(args);
      if (subArg === 'clear') {
        await clearHistory({ force: flags.force });
      } else if (flags.stats) {
        showStats();
      } else {
        displayHistory({ all: flags.all });
      }
    },
    description: 'View pipeline execution history'
  },
  insights: {
    fn: () => {
      const flags = parseFlags(args);
      if (flags.feedback) {
        displayFeedbackInsights({ json: flags.json });
      } else {
        displayInsights({
          bottlenecks: flags.bottlenecks,
          failures: flags.failures,
          json: flags.json
        });
      }
    },
    description: 'Analyze pipeline history for bottlenecks, failures, and trends'
  },
  'retry-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: retry-config set <key> <value>');
          console.error('Valid keys: maxRetries, windowSize, highFailureThreshold');
          process.exit(1);
        }
        setConfigValue(key, value);
      } else if (subArg === 'reset') {
        resetConfig();
        console.log('Retry configuration reset to defaults.');
      } else {
        displayConfig();
      }
    },
    description: 'Manage retry configuration for adaptive retry logic'
  },
  'feedback-config': {
    fn: () => {
      if (subArg === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || !value) {
          console.error('Usage: feedback-config set <key> <value>');
          console.error('Valid keys: minRatingThreshold, enabled');
          process.exit(1);
        }
        setFeedbackConfigValue(key, value);
      } else if (subArg === 'reset') {
        resetFeedbackConfig();
        console.log('Feedback configuration reset to defaults.');
      } else {
        displayFeedbackConfig();
      }
    },
    description: 'Manage feedback loop configuration'
  },
  parallel: {
    fn: async () => {
      if (subArg === 'status') {
        const queue = loadQueue();
        if (!queue.features || queue.features.length === 0) {
          console.log('No parallel pipelines active.');
          return;
        }
        console.log('Parallel Pipeline Status\n');
        console.log(formatStatus(queue.features));
        const summary = {
          running: queue.features.filter(f => f.status === 'parallel_running').length,
          pending: queue.features.filter(f => f.status === 'parallel_queued').length,
          completed: queue.features.filter(f => f.status === 'parallel_complete').length,
          failed: queue.features.filter(f => f.status === 'parallel_failed').length,
          conflicts: queue.features.filter(f => f.status === 'merge_conflict').length
        };
        console.log(`\nRunning: ${summary.running} | Pending: ${summary.pending} | Completed: ${summary.completed} | Failed: ${summary.failed} | Conflicts: ${summary.conflicts}`);
      } else if (subArg === 'cleanup') {
        const cleaned = await cleanupWorktrees();
        console.log(`Cleaned ${cleaned} worktree(s).`);
      } else {
        const slugs = args.slice(1).filter(a => !a.startsWith('--'));
        if (slugs.length === 0) {
          console.error('Usage: orchestr8 parallel <slug1> <slug2> ... [--max-concurrency=N]');
          console.error('       orchestr8 parallel status');
          console.error('       orchestr8 parallel cleanup');
          process.exit(1);
        }
        const maxFlag = args.find(a => a.startsWith('--max-concurrency='));
        const options = {};
        if (maxFlag) {
          options.maxConcurrency = parseInt(maxFlag.split('=')[1], 10);
        }
        const result = await runParallel(slugs, options);
        process.exit(result.success ? 0 : 1);
      }
    },
    description: 'Run multiple feature pipelines in parallel using git worktrees'
  },
  help: {
    fn: showHelp,
    description: 'Show this help message'
  }
};

function showHelp() {
  console.log(`
orchestr8 - Multi-agent workflow framework

Usage: orchestr8 <command> [options]

Commands:
  init                  Initialize .blueprint directory in current project
  update                Update agents, templates, and rituals (preserves your content)
  validate              Run pre-flight checks to validate project configuration
  queue                 Show current queue state for /implement-feature pipeline
  queue reset           Clear the queue and reset all state
  history               View recent pipeline runs (last 10 by default)
  history --all         View all pipeline runs
  history --stats       View aggregate statistics
  history clear         Clear all pipeline history (with confirmation)
  history clear --force Clear all pipeline history (no confirmation)
  insights              Analyze pipeline for bottlenecks, failures, and trends
  insights --bottlenecks Show only bottleneck analysis
  insights --failures   Show only failure patterns
  insights --feedback   Show feedback loop insights (calibration, correlations)
  insights --json       Output analysis as JSON
  retry-config          View current retry configuration
  retry-config set <key> <value>  Modify a config value (maxRetries, windowSize, highFailureThreshold)
  retry-config reset    Reset retry configuration to defaults
  feedback-config       View current feedback loop configuration
  feedback-config set <key> <value>  Modify a config value (minRatingThreshold, enabled)
  feedback-config reset Reset feedback configuration to defaults
  parallel <slugs...>   Run multiple feature pipelines in parallel
  parallel status       Show status of all parallel pipelines
  parallel cleanup      Remove completed/aborted worktrees
  help                  Show this help message

Examples:
  npx orchestr8 init
  npx orchestr8 update
  npx orchestr8 validate
  npx orchestr8 queue
  npx orchestr8 history
  npx orchestr8 history --stats
  npx orchestr8 insights --feedback
  npx orchestr8 feedback-config
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const cmd = commands[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "agent-workflow help" for usage information.');
    process.exit(1);
  }

  try {
    await cmd.fn();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
