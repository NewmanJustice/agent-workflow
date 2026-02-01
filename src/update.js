const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = process.cwd();

// Directories that contain user content and should NOT be overwritten
const USER_CONTENT_DIRS = [
  'features',
  'system_specification',
  '.business_context'
];

// Directories/files that should be updated
const UPDATABLE = [
  'agents',
  'templates',
  'ways_of_working'
];

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

async function update() {
  const blueprintDest = path.join(TARGET_DIR, '.blueprint');
  const blueprintSrc = path.join(PACKAGE_ROOT, '.blueprint');
  const skillSrc = path.join(PACKAGE_ROOT, 'SKILL.md');
  const skillDest = path.join(TARGET_DIR, 'SKILL.md');

  // Check if .blueprint exists
  if (!fs.existsSync(blueprintDest)) {
    console.log('.blueprint directory not found. Run "agent-workflow init" first.');
    process.exit(1);
  }

  console.log('Updating agent-workflow...');
  console.log('(Preserving: features/, system_specification/, .business_context/)\n');

  // Update each updatable directory
  for (const dir of UPDATABLE) {
    const srcDir = path.join(blueprintSrc, dir);
    const destDir = path.join(blueprintDest, dir);

    if (fs.existsSync(srcDir)) {
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true });
      }
      copyDir(srcDir, destDir);
      console.log(`Updated .blueprint/${dir}/`);
    }
  }

  // Update SKILL.md
  const answer = await prompt('\nUpdate SKILL.md? (Y/n): ');
  if (answer !== 'n' && answer !== 'no') {
    fs.copyFileSync(skillSrc, skillDest);
    console.log('Updated SKILL.md');
  }

  console.log(`
Update complete!

Updated:
  - .blueprint/agents/
  - .blueprint/templates/
  - .blueprint/ways_of_working/
  - SKILL.md

Preserved:
  - .blueprint/features/
  - .blueprint/system_specification/
  - .blueprint/.business_context/
`);
}

module.exports = { update };
