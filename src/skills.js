const { execSync } = require('child_process');

const AGENT_SKILLS = {
  alex: {
    name: 'Alex',
    role: 'System Specification & Chief-of-Staff',
    skills: [
      { repo: 'https://github.com/waynesutton/convexskills', skill: 'avoid-feature-creep' },
      { repo: 'https://github.com/pproenca/dot-skills', skill: 'feature-spec' }
    ]
  },
  cass: {
    name: 'Cass',
    role: 'Story Writer / BA',
    skills: [
      { repo: 'https://github.com/aj-geddes/useful-ai-prompts', skill: 'user-story-writing' }
    ]
  },
  nigel: {
    name: 'Nigel',
    role: 'Tester',
    skills: [
      { repo: 'https://github.com/wshobson/agents', skill: 'javascript-testing-patterns' },
      { repo: 'https://github.com/wshobson/agents', skill: 'modern-javascript-patterns' }
    ]
  },
  codey: {
    name: 'Codey',
    role: 'Developer',
    skills: [
      { repo: 'https://github.com/martinholovsky/claude-skills-generator', skill: 'javascript-expert' },
      { repo: 'https://github.com/wshobson/agents', skill: 'modern-javascript-patterns' }
    ]
  }
};

function installSkill(repo, skill) {
  const cmd = `npx skills add ${repo} --skill ${skill}`;
  console.log(`  Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`  Failed to install ${skill}`);
    return false;
  }
}

async function addSkills(agent) {
  const agents = agent === 'all' ? Object.keys(AGENT_SKILLS) : [agent.toLowerCase()];

  for (const agentKey of agents) {
    const agentConfig = AGENT_SKILLS[agentKey];

    if (!agentConfig) {
      console.error(`Unknown agent: ${agentKey}`);
      console.error(`Available agents: ${Object.keys(AGENT_SKILLS).join(', ')}, all`);
      process.exit(1);
    }

    console.log(`\nInstalling skills for ${agentConfig.name} (${agentConfig.role}):`);

    for (const { repo, skill } of agentConfig.skills) {
      installSkill(repo, skill);
    }
  }

  console.log('\nSkills installation complete.');
}

function listSkills(agent) {
  const agents = agent ? [agent.toLowerCase()] : Object.keys(AGENT_SKILLS);

  console.log('\nAgent Workflow - Recommended Skills\n');

  for (const agentKey of agents) {
    const agentConfig = AGENT_SKILLS[agentKey];

    if (!agentConfig) {
      console.error(`Unknown agent: ${agentKey}`);
      process.exit(1);
    }

    console.log(`${agentConfig.name} (${agentConfig.role}):`);
    for (const { repo, skill } of agentConfig.skills) {
      console.log(`  - ${skill}`);
      console.log(`    ${repo}`);
    }
    console.log('');
  }
}

module.exports = { addSkills, listSkills, AGENT_SKILLS };
