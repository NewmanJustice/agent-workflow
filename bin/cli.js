#!/usr/bin/env node

const { init } = require('../src/init');
const { update } = require('../src/update');
const { addSkills, listSkills } = require('../src/skills');

const args = process.argv.slice(2);
const command = args[0];
const subArg = args[1];

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
  help                  Show this help message

Examples:
  npx agent-workflow init
  npx agent-workflow update
  npx agent-workflow add-skills all
  npx agent-workflow add-skills codey
  npx agent-workflow skills
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
