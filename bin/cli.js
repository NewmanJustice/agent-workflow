#!/usr/bin/env node

const { init } = require('../src/init');
const { update } = require('../src/update');
const { addSkills, listSkills } = require('../src/skills');
const { displayQueue, resetQueue } = require('../src/orchestrator');
const { validate, formatOutput } = require('../src/validate');
const { displayHistory, showStats, clearHistory } = require('../src/history');
const { displayInsights } = require('../src/insights');

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
  'add-skills': {
    fn: () => addSkills(subArg || 'all'),
    description: 'Install recommended skills for an agent (or all)'
  },
  skills: {
    fn: () => listSkills(subArg),
    description: 'List recommended skills for agents'
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
      displayInsights({
        bottlenecks: flags.bottlenecks,
        failures: flags.failures,
        json: flags.json
      });
    },
    description: 'Analyze pipeline history for bottlenecks, failures, and trends'
  },
  help: {
    fn: showHelp,
    description: 'Show this help message'
  }
};

function showHelp() {
  console.log(`
agent-workflow - Multi-agent workflow framework

Usage: agent-workflow <command> [options]

Commands:
  init                  Initialize .blueprint directory in current project
  update                Update agents, templates, and rituals (preserves your content)
  add-skills [agent]    Install recommended skills for an agent (alex, cass, nigel, codey, all)
  skills [agent]        List recommended skills for agents
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
  insights --json       Output analysis as JSON
  validate              Run pre-flight checks to validate project configuration
  help                  Show this help message

Examples:
  npx agent-workflow init
  npx agent-workflow update
  npx agent-workflow add-skills all
  npx agent-workflow add-skills codey
  npx agent-workflow skills
  npx agent-workflow queue
  npx agent-workflow queue reset
  npx agent-workflow history
  npx agent-workflow history --stats
  npx agent-workflow history clear --force
  npx agent-workflow validate
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
