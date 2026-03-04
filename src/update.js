const fs = require('fs');
const path = require('path');

const { prompt } = require('./utils');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = process.cwd();

// Directories that contain user content and should NOT be overwritten
const USER_CONTENT_DIRS = [
  'features',
  'system_specification'
];

// Directories/files that should be updated
const UPDATABLE = [
  'agents',
  'prompts',
  'templates',
  'ways_of_working'
];

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

  // Check if running in the package source directory (dev mode)
  if (PACKAGE_ROOT === TARGET_DIR) {
    console.log('Cannot run update in the murmur8 source directory.');
    console.log('This command is for updating projects that use murmur8.');
    process.exit(1);
  }

  // Check if .blueprint exists
  if (!fs.existsSync(blueprintDest)) {
    console.log('.blueprint directory not found. Run "agent-workflow init" first.');
    process.exit(1);
  }

  console.log('Updating agent-workflow...');
  console.log('(Preserving: features/, system_specification/)\n');

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

  // Update SKILL.md and .claude/commands/implement-feature.md
  const answer = await prompt('\nUpdate SKILL.md and .claude/commands/implement-feature.md? (Y/n): ');
  if (answer !== 'n' && answer !== 'no') {
    fs.copyFileSync(skillSrc, skillDest);
    console.log('Updated SKILL.md');

    // Also update the Claude Code skill command
    const skillCommandDest = path.join(TARGET_DIR, '.claude', 'commands', 'implement-feature.md');
    if (fs.existsSync(path.dirname(skillCommandDest))) {
      fs.copyFileSync(skillSrc, skillCommandDest);
      console.log('Updated .claude/commands/implement-feature.md');
    }
  }

  console.log(`
Update complete!

Updated:
  - .blueprint/agents/
  - .blueprint/prompts/
  - .blueprint/templates/
  - .blueprint/ways_of_working/
  - SKILL.md
  - .claude/commands/implement-feature.md (if exists)

Preserved:
  - .blueprint/features/
  - .blueprint/system_specification/
  - .business_context/
`);
}

module.exports = { update };
