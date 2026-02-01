const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = process.cwd();

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updateGitignore() {
  const gitignorePath = path.join(TARGET_DIR, '.gitignore');
  const entriesToAdd = [
    '# agent-workflow',
    '.claude/implement-queue.json'
  ];

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  const newEntries = entriesToAdd.filter(entry => !content.includes(entry));

  if (newEntries.length > 0) {
    const addition = '\n' + newEntries.join('\n') + '\n';
    fs.appendFileSync(gitignorePath, addition);
    console.log('Updated .gitignore');
  }
}

async function init() {
  const blueprintSrc = path.join(PACKAGE_ROOT, '.blueprint');
  const blueprintDest = path.join(TARGET_DIR, '.blueprint');
  const skillSrc = path.join(PACKAGE_ROOT, 'SKILL.md');
  const skillDest = path.join(TARGET_DIR, 'SKILL.md');

  // Check if .blueprint already exists
  if (fs.existsSync(blueprintDest)) {
    const answer = await prompt('.blueprint directory already exists. Overwrite? (y/N): ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Aborted. Use "agent-workflow update" to update existing installation.');
      return;
    }
    fs.rmSync(blueprintDest, { recursive: true });
  }

  // Check if SKILL.md already exists
  if (fs.existsSync(skillDest)) {
    const answer = await prompt('SKILL.md already exists. Overwrite? (y/N): ');
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Skipping SKILL.md');
    } else {
      fs.copyFileSync(skillSrc, skillDest);
      console.log('Copied SKILL.md');
    }
  } else {
    fs.copyFileSync(skillSrc, skillDest);
    console.log('Copied SKILL.md');
  }

  // Copy .blueprint directory
  console.log('Copying .blueprint directory...');
  copyDir(blueprintSrc, blueprintDest);
  console.log('Copied .blueprint directory');

  // Update .gitignore
  updateGitignore();

  console.log(`
agent-workflow initialized successfully!

Next steps:
1. Add business context to .blueprint/.business_context/
2. Run /implement-feature in Claude Code to start your first feature
`);
}

module.exports = { init };
