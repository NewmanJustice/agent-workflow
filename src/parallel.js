'use strict';

const path = require('path');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const CONFIG_FILE = '.claude/parallel-config.json';
const LOCK_FILE = '.claude/parallel.lock';

// Track running processes for abort handling
let runningProcesses = new Map();
let isAborting = false;

function getDefaultParallelConfig() {
  return {
    maxConcurrency: 3,
    maxFeatures: 10,
    timeout: 30,  // minutes per pipeline
    minDiskSpaceMB: 500,
    cli: 'npx claude',
    skill: '/implement-feature',
    skillFlags: '--no-commit',
    worktreeDir: '.claude/worktrees',
    queueFile: '.claude/parallel-queue.json'
  };
}

function readParallelConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return getDefaultParallelConfig();
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...getDefaultParallelConfig(), ...JSON.parse(content) };
  } catch {
    return getDefaultParallelConfig();
  }
}

function writeParallelConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getQueueFile() {
  return readParallelConfig().queueFile;
}

const QUEUE_FILE = '.claude/parallel-queue.json'; // Legacy reference

function buildWorktreePath(slug, config = null) {
  const cfg = config || readParallelConfig();
  return `${cfg.worktreeDir}/feat-${slug}`;
}

function buildBranchName(slug) {
  return `feature/${slug}`;
}

function getDefaultConfig() {
  const cfg = readParallelConfig();
  return { maxConcurrency: cfg.maxConcurrency };
}

function getQueuePath(worktreePath) {
  return path.join(worktreePath, '.claude', 'implement-queue.json');
}

function shouldCleanupWorktree(state) {
  return state.status === 'parallel_complete' || state.status === 'aborted';
}

function validatePreFlight({ isGitRepo, isDirty, gitVersion }) {
  const errors = [];

  if (!isGitRepo) {
    errors.push('Not in a git repository');
  }

  if (isDirty) {
    errors.push('Working tree has uncommitted changes');
  }

  if (gitVersion && !isGitVersionSupported(gitVersion)) {
    errors.push('Git version 2.5+ required for worktree support');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isGitVersionSupported(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)/);
  if (!match) return false;

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);

  if (major > 2) return true;
  if (major === 2 && minor >= 5) return true;
  return false;
}

function splitByLimit(slugs, maxConcurrency) {
  return {
    active: slugs.slice(0, maxConcurrency),
    queued: slugs.slice(maxConcurrency)
  };
}

function promoteFromQueue(state) {
  const { active, queued, maxConcurrency } = state;
  const newActive = [...active];
  const newQueued = [...queued];

  while (newActive.length < maxConcurrency && newQueued.length > 0) {
    newActive.push(newQueued.shift());
  }

  return {
    ...state,
    active: newActive,
    queued: newQueued
  };
}

function buildPipelineCommand(slug, worktreePath, config = null) {
  const cfg = config || readParallelConfig();
  const flags = cfg.skillFlags ? ` ${cfg.skillFlags}` : '';
  return `${cfg.cli} --cwd ${worktreePath} ${cfg.skill} "${slug}"${flags}`;
}

function canFastForward({ mainHead, branchBase }) {
  return mainHead === branchBase;
}

function hasMergeConflict(gitOutput) {
  return gitOutput.includes('CONFLICT');
}

function handleMergeConflict(state, conflictOutput) {
  return {
    ...state,
    status: 'merge_conflict',
    conflictDetails: conflictOutput || null
  };
}

function orderByCompletion(features) {
  return [...features].sort((a, b) => {
    const timeA = new Date(a.completedAt).getTime();
    const timeB = new Date(b.completedAt).getTime();
    return timeA - timeB;
  });
}

const VALID_TRANSITIONS = {
  parallel_queued: ['worktree_created', 'aborted'],
  worktree_created: ['parallel_running', 'parallel_failed', 'aborted'],
  parallel_running: ['merge_pending', 'parallel_failed', 'aborted'],
  merge_pending: ['parallel_complete', 'merge_conflict', 'aborted'],
  parallel_failed: [],
  parallel_complete: [],
  merge_conflict: [],
  aborted: []
};

function transition(state, newStatus) {
  return {
    ...state,
    status: newStatus
  };
}

function formatStatus(states) {
  return states.map(s => formatFeatureStatus(s)).join('\n');
}

function formatFeatureStatus(state) {
  const statusDisplay = state.status.replace('parallel_', '');
  const stage = state.stage ? ` (${state.stage})` : '';
  return `${state.slug}: ${statusDisplay}${stage}`;
}

function summarizeFinal(results) {
  return {
    completed: results.filter(r => r.status === 'parallel_complete').length,
    failed: results.filter(r => r.status === 'parallel_failed').length,
    conflicts: results.filter(r => r.status === 'merge_conflict').length
  };
}

function aggregateResults(results) {
  return {
    completed: results.filter(r => r.status === 'parallel_complete').length,
    failed: results.filter(r => r.status === 'parallel_failed').length,
    total: results.length
  };
}

function abortFeature(states, slug) {
  return states.map(s => {
    if (s.slug === slug) {
      return { ...s, status: 'aborted' };
    }
    return s;
  });
}

function abortAll(states) {
  return states.map(s => ({ ...s, status: 'aborted' }));
}

// --- Git Operations ---

function checkGitStatus() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    const isGitRepo = true;
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const isDirty = status.trim().length > 0;
    const versionOutput = execSync('git --version', { encoding: 'utf8' });
    const gitVersion = versionOutput.match(/(\d+\.\d+\.\d+)/)?.[1] || '0.0.0';
    return { isGitRepo, isDirty, gitVersion };
  } catch {
    return { isGitRepo: false, isDirty: false, gitVersion: '0.0.0' };
  }
}

function createWorktree(slug) {
  const worktreePath = buildWorktreePath(slug);
  const branchName = buildBranchName(slug);

  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, { stdio: 'pipe' });

  return { worktreePath, branchName };
}

function removeWorktree(slug) {
  const worktreePath = buildWorktreePath(slug);
  const branchName = buildBranchName(slug);

  try {
    execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
  } catch {
    // Worktree may already be removed
  }

  try {
    execSync(`git branch -D "${branchName}"`, { stdio: 'pipe' });
  } catch {
    // Branch may already be deleted
  }
}

function mergeBranch(slug) {
  const branchName = buildBranchName(slug);

  try {
    const output = execSync(`git merge "${branchName}" --no-edit`, { encoding: 'utf8' });
    return { success: true, output };
  } catch (err) {
    const output = err.stdout || err.message;
    if (hasMergeConflict(output)) {
      return { success: false, conflict: true, output };
    }
    return { success: false, conflict: false, output };
  }
}

function getCurrentBranch() {
  return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
}

// --- Confirmation Prompt ---

function promptConfirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function buildConfirmMessage(slugs, config) {
  const parallelCfg = readParallelConfig();
  const { active, queued } = splitByLimit(slugs, config.maxConcurrency);

  let msg = '\nThis will:\n';
  msg += `  • Create ${slugs.length} git worktree(s) in ${parallelCfg.worktreeDir}/\n`;
  msg += `  • Start ${active.length} parallel pipeline(s) (max concurrent: ${config.maxConcurrency})\n`;
  if (queued.length > 0) {
    msg += `  • Queue ${queued.length} additional feature(s)\n`;
  }
  msg += `  • Branches: ${slugs.map(s => `feature/${s}`).join(', ')}\n`;
  msg += '\nContinue?';
  return msg;
}

// --- Lock File ---

function acquireLock(slugs) {
  if (fs.existsSync(LOCK_FILE)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));

    // Check if process is still running
    try {
      process.kill(lock.pid, 0);
      // Process exists, lock is valid
      return {
        acquired: false,
        existingLock: lock
      };
    } catch {
      // Process doesn't exist, stale lock
      console.log(`Warning: Found stale lock file (PID ${lock.pid} not running)`);
      console.log('Removing stale lock and continuing...\n');
    }
  }

  const lock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    features: slugs
  };

  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));

  return { acquired: true };
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

function getLockInfo() {
  if (!fs.existsSync(LOCK_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// --- Feature Limit ---

function validateFeatureLimit(slugs) {
  const config = readParallelConfig();
  if (slugs.length > config.maxFeatures) {
    return {
      valid: false,
      error: `Too many features: ${slugs.length} requested, max is ${config.maxFeatures}`,
      requested: slugs.length,
      max: config.maxFeatures
    };
  }
  return { valid: true };
}

// --- Disk Space Check ---

function checkDiskSpace() {
  const config = readParallelConfig();
  try {
    // Get available space on current filesystem
    const output = execSync('df -m . | tail -1', { encoding: 'utf8' });
    const parts = output.trim().split(/\s+/);
    const availableMB = parseInt(parts[3], 10);

    return {
      availableMB,
      requiredMB: config.minDiskSpaceMB,
      sufficient: availableMB >= config.minDiskSpaceMB
    };
  } catch {
    // Can't check disk space, assume it's fine
    return { availableMB: -1, requiredMB: config.minDiskSpaceMB, sufficient: true };
  }
}

function validateDiskSpace() {
  const space = checkDiskSpace();
  if (!space.sufficient && space.availableMB > 0) {
    return {
      valid: false,
      error: `Low disk space: ${space.availableMB}MB available, ${space.requiredMB}MB recommended`,
      availableMB: space.availableMB,
      requiredMB: space.requiredMB
    };
  }
  return { valid: true, availableMB: space.availableMB };
}

// --- Logging ---

function createLogStream(slug, config) {
  const parallelCfg = config || readParallelConfig();
  const worktreePath = buildWorktreePath(slug, parallelCfg);
  const logPath = path.join(worktreePath, 'pipeline.log');

  // Ensure directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return {
    path: logPath,
    stream: fs.createWriteStream(logPath, { flags: 'a' })
  };
}

function logWithTimestamp(stream, prefix, data) {
  const timestamp = new Date().toISOString();
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      stream.write(`[${timestamp}] [${prefix}] ${line}\n`);
    }
  });
}

// --- Pre-flight Feature Validation ---

function validateFeatureSpec(slug) {
  const featDir = `.blueprint/features/feature_${slug}`;
  const specPath = path.join(featDir, 'FEATURE_SPEC.md');
  const planPath = path.join(featDir, 'IMPLEMENTATION_PLAN.md');

  const result = {
    slug,
    valid: true,
    specExists: false,
    specComplete: false,
    storiesExist: false,
    storyCount: 0,
    planExists: false,
    filesToModify: [],
    errors: [],
    warnings: []
  };

  // Check feature spec exists
  if (!fs.existsSync(specPath)) {
    result.errors.push('Missing FEATURE_SPEC.md');
    result.valid = false;
  } else {
    result.specExists = true;
    // Check if spec has required sections
    const specContent = fs.readFileSync(specPath, 'utf8');
    const hasIntent = specContent.includes('## 1. Feature Intent') || specContent.includes('# Feature Intent');
    const hasScope = specContent.includes('## 2. Scope') || specContent.includes('# Scope');
    const hasBehaviour = specContent.includes('## 3. Behaviour') || specContent.includes('Behaviour Overview');

    if (!hasIntent || !hasScope || !hasBehaviour) {
      result.warnings.push('Spec may be incomplete (missing required sections)');
    } else {
      result.specComplete = true;
    }
  }

  // Check for stories
  if (fs.existsSync(featDir)) {
    const files = fs.readdirSync(featDir);
    const stories = files.filter(f => f.startsWith('story-') && f.endsWith('.md'));
    result.storyCount = stories.length;
    result.storiesExist = stories.length > 0;

    if (!result.storiesExist) {
      result.warnings.push('No user stories found (story-*.md)');
    }
  }

  // Check for implementation plan and extract files to modify
  if (fs.existsSync(planPath)) {
    result.planExists = true;
    const planContent = fs.readFileSync(planPath, 'utf8');
    result.filesToModify = extractFilesToModify(planContent);
  }

  return result;
}

function extractFilesToModify(planContent) {
  const files = [];
  const lines = planContent.split('\n');
  let inFilesSection = false;

  for (const line of lines) {
    // Detect "Files to Create/Modify" section
    if (line.includes('Files to Create') || line.includes('Files to Modify')) {
      inFilesSection = true;
      continue;
    }

    // Stop at next section
    if (inFilesSection && line.startsWith('## ')) {
      break;
    }

    // Extract file paths from table rows or bullet points
    if (inFilesSection) {
      // Match table format: | path | action | purpose |
      const tableMatch = line.match(/\|\s*`?([^|`]+)`?\s*\|/);
      if (tableMatch && tableMatch[1].includes('/') || tableMatch && tableMatch[1].includes('.')) {
        const filePath = tableMatch[1].trim();
        if (filePath && !filePath.includes('---') && !filePath.toLowerCase().includes('path')) {
          files.push(filePath);
        }
      }

      // Match bullet point format: - path/to/file
      const bulletMatch = line.match(/^[\s*-]+\s*`?([^\s`]+\.[a-z]+)`?/i);
      if (bulletMatch) {
        files.push(bulletMatch[1].trim());
      }
    }
  }

  return [...new Set(files)]; // Dedupe
}

function detectFileOverlap(featureValidations) {
  const fileToFeatures = new Map();

  for (const fv of featureValidations) {
    for (const file of fv.filesToModify) {
      if (!fileToFeatures.has(file)) {
        fileToFeatures.set(file, []);
      }
      fileToFeatures.get(file).push(fv.slug);
    }
  }

  const overlaps = [];
  for (const [file, features] of fileToFeatures) {
    if (features.length > 1) {
      overlaps.push({ file, features });
    }
  }

  return overlaps;
}

function detectDependencies(featureValidations) {
  const dependencies = [];
  const slugs = featureValidations.map(fv => fv.slug);

  for (const fv of featureValidations) {
    if (!fv.specExists) continue;

    const specPath = `.blueprint/features/feature_${fv.slug}/FEATURE_SPEC.md`;
    try {
      const content = fs.readFileSync(specPath, 'utf8').toLowerCase();

      // Check if spec references other features in the batch
      for (const otherSlug of slugs) {
        if (otherSlug !== fv.slug) {
          if (content.includes(otherSlug) || content.includes(`depends on ${otherSlug}`) || content.includes(`requires ${otherSlug}`)) {
            dependencies.push({ feature: fv.slug, dependsOn: otherSlug });
          }
        }
      }
    } catch {
      // Skip if can't read
    }
  }

  return dependencies;
}

function estimateScope(featureValidations) {
  return featureValidations.map(fv => {
    // Estimate based on story count and files to modify
    let estimatedMinutes = 10; // Base time
    estimatedMinutes += fv.storyCount * 5; // 5 min per story
    estimatedMinutes += fv.filesToModify.length * 2; // 2 min per file

    return {
      slug: fv.slug,
      storyCount: fv.storyCount,
      fileCount: fv.filesToModify.length,
      estimatedMinutes
    };
  });
}

function validateParallelBatch(slugs) {
  const featureValidations = slugs.map(validateFeatureSpec);
  const fileOverlaps = detectFileOverlap(featureValidations);
  const dependencies = detectDependencies(featureValidations);
  const scopeEstimates = estimateScope(featureValidations);

  // Check for blocking errors
  const invalidFeatures = featureValidations.filter(fv => !fv.valid);
  const hasBlockingErrors = invalidFeatures.length > 0;

  // Determine overall validity
  const canProceed = !hasBlockingErrors;

  // Build recommendations
  const recommendations = [];

  if (fileOverlaps.length > 0) {
    // Suggest running features with overlaps sequentially
    const overlappingFeatures = new Set();
    fileOverlaps.forEach(o => o.features.forEach(f => overlappingFeatures.add(f)));
    const nonOverlapping = slugs.filter(s => !overlappingFeatures.has(s));

    if (nonOverlapping.length > 0) {
      recommendations.push(`Consider running ${[...overlappingFeatures].join(', ')} sequentially due to file overlap`);
    }
  }

  if (dependencies.length > 0) {
    recommendations.push(`Dependency detected: ${dependencies.map(d => `${d.feature} → ${d.dependsOn}`).join(', ')}`);
  }

  // Calculate totals
  const totalEstimatedMinutes = scopeEstimates.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const maxEstimatedMinutes = Math.max(...scopeEstimates.map(s => s.estimatedMinutes));

  return {
    valid: canProceed,
    features: featureValidations,
    fileOverlaps,
    dependencies,
    scopeEstimates,
    recommendations,
    totalEstimatedMinutes,
    parallelEstimatedMinutes: maxEstimatedMinutes, // Time if run in parallel
    invalidFeatures
  };
}

function formatPreflightResults(results, options = {}) {
  let output = '\nPre-flight Validation\n=====================\n\n';

  // Feature status
  for (const fv of results.features) {
    const icon = fv.valid ? '✓' : '✗';
    let status = [];
    if (fv.specComplete) status.push('Spec complete');
    if (fv.storiesExist) status.push(`${fv.storyCount} stories`);
    if (fv.planExists) status.push('Plan exists');

    output += `${icon} ${fv.slug}: ${status.length > 0 ? status.join(', ') : 'Not ready'}\n`;

    for (const err of fv.errors) {
      output += `    ✗ ${err}\n`;
    }
    for (const warn of fv.warnings) {
      output += `    ⚠ ${warn}\n`;
    }
  }

  // File overlap
  if (results.fileOverlaps.length > 0) {
    output += '\nConflict Analysis\n=================\n\n';
    output += '⚠ File overlap detected:\n';
    for (const overlap of results.fileOverlaps) {
      output += `  • ${overlap.file}: ${overlap.features.join(', ')} both modify\n`;
    }
  }

  // Dependencies
  if (results.dependencies.length > 0) {
    output += '\n⚠ Dependencies detected:\n';
    for (const dep of results.dependencies) {
      output += `  • ${dep.feature} depends on ${dep.dependsOn}\n`;
    }
  }

  // Scope estimation
  output += '\nScope Estimation\n================\n\n';
  output += '  Feature         | Stories | Files | Est. Time\n';
  output += '  ----------------|---------|-------|----------\n';
  for (const scope of results.scopeEstimates) {
    const slugPad = scope.slug.padEnd(15);
    const storiesPad = String(scope.storyCount).padStart(7);
    const filesPad = String(scope.fileCount).padStart(5);
    output += `  ${slugPad} |${storiesPad} |${filesPad} | ~${scope.estimatedMinutes} min\n`;
  }

  output += `\nTotal estimated: ~${results.totalEstimatedMinutes} min (parallel: ~${results.parallelEstimatedMinutes} min)\n`;

  // Recommendations
  if (results.recommendations.length > 0) {
    output += '\nRecommendations\n===============\n';
    for (const rec of results.recommendations) {
      output += `  • ${rec}\n`;
    }
  }

  return output;
}

// --- Timeout ---

function withTimeout(promise, timeoutMs, slug) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        slug,
        success: false,
        timedOut: true,
        error: `Pipeline timed out after ${timeoutMs / 60000} minutes`
      });
    }, timeoutMs);

    promise.then((result) => {
      clearTimeout(timer);
      resolve(result);
    }).catch((err) => {
      clearTimeout(timer);
      resolve({ slug, success: false, error: err.message });
    });
  });
}

function getTimeoutMs() {
  const config = readParallelConfig();
  return config.timeout * 60 * 1000; // Convert minutes to ms
}

// --- Progress Tracking ---

function getProgressFromLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return { stage: 'starting', percent: 0 };
  }

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.toLowerCase();

    // Detect stage based on log content
    if (lines.includes('codey') && lines.includes('implement')) {
      return { stage: 'codey-implement', percent: 90 };
    }
    if (lines.includes('codey') && lines.includes('plan')) {
      return { stage: 'codey-plan', percent: 75 };
    }
    if (lines.includes('nigel')) {
      return { stage: 'nigel', percent: 50 };
    }
    if (lines.includes('cass')) {
      return { stage: 'cass', percent: 35 };
    }
    if (lines.includes('alex')) {
      return { stage: 'alex', percent: 20 };
    }

    return { stage: 'running', percent: 10 };
  } catch {
    return { stage: 'unknown', percent: 0 };
  }
}

function getDetailedStatus() {
  const queue = loadQueue();
  if (!queue.features || queue.features.length === 0) {
    return { active: false, features: [] };
  }

  const features = queue.features.map(f => {
    const progress = f.logPath ? getProgressFromLog(f.logPath) : { stage: 'pending', percent: 0 };
    const elapsed = f.startedAt
      ? Math.round((Date.now() - new Date(f.startedAt).getTime()) / 1000)
      : 0;

    return {
      slug: f.slug,
      status: f.status,
      stage: progress.stage,
      percent: progress.percent,
      elapsedSeconds: elapsed,
      logPath: f.logPath,
      worktreePath: f.worktreePath,
      branchName: f.branchName
    };
  });

  return {
    active: features.some(f => f.status === 'parallel_running'),
    features
  };
}

function formatDetailedStatus(details) {
  if (!details.active && details.features.length === 0) {
    return 'No parallel pipelines active.';
  }

  let output = 'Parallel Pipeline Status\n\n';

  for (const f of details.features) {
    const statusIcon = {
      'parallel_queued': '⏳',
      'worktree_created': '📁',
      'parallel_running': '🔄',
      'merge_pending': '🔀',
      'parallel_complete': '✅',
      'parallel_failed': '❌',
      'merge_conflict': '⚠️',
      'aborted': '🛑'
    }[f.status] || '❓';

    const elapsed = f.elapsedSeconds > 0
      ? ` (${Math.floor(f.elapsedSeconds / 60)}m ${f.elapsedSeconds % 60}s)`
      : '';

    output += `${statusIcon} ${f.slug}${elapsed}\n`;

    if (f.status === 'parallel_running') {
      const bar = progressBar(f.percent);
      output += `   ${bar} ${f.percent}% - ${f.stage}\n`;
    }
  }

  return output;
}

function progressBar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// --- Abort Handling ---

function setupAbortHandler(queue) {
  const handler = async () => {
    if (isAborting) return;
    isAborting = true;

    console.log('\n\nReceived interrupt signal. Stopping pipelines...\n');

    // Kill all running processes
    for (const [slug, procInfo] of runningProcesses) {
      console.log(`Stopping ${slug} (PID: ${procInfo.pid})...`);
      try {
        process.kill(procInfo.pid, 'SIGTERM');
      } catch {
        // Process may already be dead
      }
    }

    // Update queue state
    if (queue && queue.features) {
      queue.features.forEach(f => {
        if (f.status === 'parallel_running' || f.status === 'worktree_created') {
          f.status = 'aborted';
        }
      });
      saveQueue(queue);
    }

    releaseLock();

    console.log('\nAborted. Worktrees preserved for debugging.');
    console.log("Run 'murmur8 parallel cleanup' to remove.\n");

    process.exit(130); // Standard exit code for Ctrl+C
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);

  return handler;
}

async function abortParallel(options = {}) {
  const lock = getLockInfo();
  const queue = loadQueue();

  if (!lock && (!queue.features || queue.features.length === 0)) {
    console.log('No parallel pipelines are currently running.');
    return { success: true };
  }

  console.log('Stopping parallel pipelines...\n');

  // Try to kill the main process if we have lock info
  if (lock && lock.pid !== process.pid) {
    console.log(`Sending stop signal to main process (PID: ${lock.pid})...`);
    try {
      process.kill(lock.pid, 'SIGTERM');
    } catch {
      console.log('Main process not running.');
    }
  }

  // Update queue state
  let abortedCount = 0;
  if (queue.features) {
    queue.features.forEach(f => {
      if (f.status === 'parallel_running' || f.status === 'worktree_created' || f.status === 'parallel_queued') {
        f.status = 'aborted';
        abortedCount++;
        console.log(`${f.slug}: Marked as aborted`);
      }
    });
    saveQueue(queue);
  }

  releaseLock();

  if (options.cleanup) {
    console.log('\nCleaning up worktrees...');
    await cleanupWorktrees();
  } else {
    console.log('\nWorktrees preserved for debugging.');
    if (queue.features) {
      const worktrees = queue.features
        .filter(f => f.worktreePath)
        .map(f => f.worktreePath);
      if (worktrees.length > 0) {
        console.log('Locations:');
        worktrees.forEach(w => console.log(`  • ${w}`));
      }
    }
    console.log("\nTo clean up: murmur8 parallel cleanup");
  }

  return { success: true, abortedCount };
}

// --- Queue Persistence ---

function loadQueue() {
  const queueFile = getQueueFile();
  if (!fs.existsSync(queueFile)) {
    return { features: [], startedAt: null };
  }
  return JSON.parse(fs.readFileSync(queueFile, 'utf8'));
}

function saveQueue(queue) {
  const queueFile = getQueueFile();
  fs.mkdirSync(path.dirname(queueFile), { recursive: true });
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
}

// --- Pipeline Execution ---

function runPipelineInWorktree(slug, worktreePath, config = null, options = {}) {
  const cfg = config || readParallelConfig();
  const cliParts = cfg.cli.split(' ');
  const skillParts = cfg.skill.split(' ');
  const flagParts = cfg.skillFlags ? cfg.skillFlags.split(' ') : [];
  const allArgs = [...cliParts.slice(1), ...skillParts, slug, ...flagParts];

  // Create log stream
  const log = createLogStream(slug, cfg);
  log.stream.write(`[${new Date().toISOString()}] Pipeline started for ${slug}\n`);
  log.stream.write(`[${new Date().toISOString()}] Command: ${cliParts[0]} ${allArgs.join(' ')}\n`);
  log.stream.write(`[${new Date().toISOString()}] Working directory: ${worktreePath}\n\n`);

  return new Promise((resolve) => {
    const proc = spawn(cliParts[0], allArgs, {
      cwd: worktreePath,
      stdio: options.verbose ? 'inherit' : ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    // Track process for abort handling
    runningProcesses.set(slug, { pid: proc.pid, process: proc });

    if (!options.verbose) {
      // Log stdout
      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          logWithTimestamp(log.stream, 'stdout', data);
        });
      }

      // Log stderr
      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          logWithTimestamp(log.stream, 'stderr', data);
        });
      }
    }

    proc.on('close', (code) => {
      runningProcesses.delete(slug);
      log.stream.write(`\n[${new Date().toISOString()}] Pipeline completed with exit code ${code}\n`);
      log.stream.end();
      resolve({ slug, success: code === 0, exitCode: code, logPath: log.path });
    });

    proc.on('error', (err) => {
      runningProcesses.delete(slug);
      log.stream.write(`\n[${new Date().toISOString()}] Pipeline error: ${err.message}\n`);
      log.stream.end();
      resolve({ slug, success: false, error: err.message, logPath: log.path });
    });
  });
}

// --- Main Orchestration ---

function dryRun(slugs, config, baseBranch, gitStatus, validation, batchValidation = null) {
  const parallelCfg = readParallelConfig();
  const { active, queued } = splitByLimit(slugs, config.maxConcurrency);

  console.log('\n=== DRY RUN MODE ===\n');
  console.log('Git Checks:');
  console.log(`  ${gitStatus.isGitRepo ? '✓' : '✗'} Git repository: ${gitStatus.isGitRepo ? 'yes' : 'no'}`);
  console.log(`  ${!gitStatus.isDirty ? '✓' : '✗'} Working tree: ${gitStatus.isDirty ? 'dirty (has uncommitted changes)' : 'clean'}`);
  console.log(`  ✓ Git version: ${gitStatus.gitVersion}`);
  console.log(`  ✓ Base branch: ${baseBranch}`);

  if (!validation.valid) {
    console.log(`\n⚠️  WARNING: Git checks failed. Real execution would abort.`);
    validation.errors.forEach(e => console.log(`     - ${e}`));
  }

  // Show batch validation results (already printed in runParallel if issues found)
  if (batchValidation && !batchValidation.valid) {
    console.log(`\n⚠️  WARNING: Feature validation failed. Real execution would abort.`);
  }

  console.log(`\nConfiguration:`);
  console.log(`  Max concurrency: ${config.maxConcurrency}`);
  console.log(`  Max features: ${parallelCfg.maxFeatures}`);
  console.log(`  Timeout: ${parallelCfg.timeout} min per pipeline`);
  console.log(`  Min disk space: ${parallelCfg.minDiskSpaceMB} MB`);
  console.log(`  CLI: ${parallelCfg.cli}`);
  console.log(`  Skill: ${parallelCfg.skill}`);
  console.log(`  Flags: ${parallelCfg.skillFlags || '(none)'}`);
  console.log(`  Worktree dir: ${parallelCfg.worktreeDir}`);
  console.log(`  Total features: ${slugs.length}`);

  console.log(`\nInitial batch (${active.length} features):`);
  active.forEach(slug => {
    console.log(`  → ${slug}`);
    console.log(`      Worktree: ${buildWorktreePath(slug, parallelCfg)}`);
    console.log(`      Branch:   ${buildBranchName(slug)}`);
    console.log(`      Command:  ${buildPipelineCommand(slug, buildWorktreePath(slug, parallelCfg), parallelCfg)}`);
  });

  if (queued.length > 0) {
    console.log(`\nQueued (${queued.length} features, will start as slots free):`);
    queued.forEach(slug => {
      console.log(`  ⏳ ${slug}`);
    });
  }

  console.log(`\nExecution plan:`);
  console.log(`  1. Create ${active.length} git worktrees`);
  console.log(`  2. Spawn ${active.length} parallel pipeline processes`);
  console.log(`  3. As each completes: merge to ${baseBranch}, cleanup worktree`);
  if (queued.length > 0) {
    console.log(`  4. Promote queued features as slots free`);
  }
  console.log(`  5. Report final summary`);

  console.log(`\nTo execute for real, run without --dry-run`);
  console.log('===================\n');

  return { success: true, dryRun: true };
}

async function runParallel(slugs, options = {}) {
  const config = { ...getDefaultConfig(), ...options };
  const baseBranch = getCurrentBranch();

  // Pre-flight validation
  const gitStatus = checkGitStatus();
  const validation = validatePreFlight(gitStatus);

  // Batch validation (unless skipped)
  let batchValidation = null;
  if (!options.skipPreflight) {
    batchValidation = validateParallelBatch(slugs);

    // Show pre-flight results in dry-run or if there are issues
    if (options.dryRun || !batchValidation.valid || batchValidation.fileOverlaps.length > 0 || batchValidation.dependencies.length > 0) {
      console.log(formatPreflightResults(batchValidation));
    }

    // Block if there are invalid features
    if (!batchValidation.valid && !options.dryRun) {
      console.error('\nCannot proceed. Fix issues above or use --skip-preflight to override.\n');
      console.error('Suggested commands:');
      for (const inv of batchValidation.invalidFeatures) {
        if (!inv.specExists) {
          console.error(`  /implement-feature "${inv.slug}" --pause-after=alex`);
        } else if (!inv.storiesExist) {
          console.error(`  /implement-feature "${inv.slug}" --pause-after=cass`);
        }
      }
      return { success: false, error: 'preflight-failed', validation: batchValidation };
    }

    // Warn about conflicts but allow proceeding with confirmation
    if (batchValidation.fileOverlaps.length > 0 && !options.dryRun && !options.yes) {
      console.warn('\n⚠ File overlaps detected - merge conflicts are likely.\n');
    }
  }

  // Dry run mode - show what would happen without executing
  if (options.dryRun) {
    return dryRun(slugs, config, baseBranch, gitStatus, validation, batchValidation);
  }

  if (!validation.valid) {
    console.error('Pre-flight validation failed:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    return { success: false, errors: validation.errors };
  }

  // Check feature limit
  const limitCheck = validateFeatureLimit(slugs);
  if (!limitCheck.valid) {
    console.error(`\nError: ${limitCheck.error}`);
    console.error(`\nTo increase limit: murmur8 parallel-config set maxFeatures <N>\n`);
    return { success: false, error: 'feature-limit-exceeded' };
  }

  // Check disk space (warn but don't block unless --strict)
  const diskCheck = validateDiskSpace();
  if (!diskCheck.valid) {
    console.warn(`\nWarning: ${diskCheck.error}`);
    if (options.strict) {
      console.error('Use --skip-disk-check to proceed anyway.\n');
      return { success: false, error: 'low-disk-space' };
    }
    console.warn('Proceeding anyway...\n');
  }

  // Check lock (unless forcing)
  if (!options.force) {
    const lockResult = acquireLock(slugs);
    if (!lockResult.acquired) {
      const lock = lockResult.existingLock;
      console.error('\nError: Another parallel execution is in progress');
      console.error(`  PID: ${lock.pid}`);
      console.error(`  Started: ${lock.startedAt}`);
      console.error(`  Features: ${lock.features.join(', ')}`);
      console.error('\nOptions:');
      console.error('  • Wait for it to complete');
      console.error('  • Run: murmur8 parallel status');
      console.error('  • Force override: murmur8 parallel ... --force\n');
      return { success: false, error: 'locked' };
    }
  } else {
    // Force mode - acquire lock anyway
    const lock = getLockInfo();
    if (lock) {
      console.log(`Warning: Overriding existing lock (PID: ${lock.pid})\n`);
    }
    acquireLock(slugs);
  }

  // Confirmation prompt (unless --yes flag)
  if (!options.yes) {
    const confirmMsg = buildConfirmMessage(slugs, config);
    const confirmed = await promptConfirm(confirmMsg);
    if (!confirmed) {
      releaseLock();
      console.log('\nAborted.\n');
      return { success: true, aborted: true };
    }
  }

  console.log(`\nStarting parallel pipelines for ${slugs.length} features`);
  console.log(`Base branch: ${baseBranch}`);
  console.log(`Max concurrency: ${config.maxConcurrency}\n`);

  // Initialize queue
  const queue = {
    features: slugs.map(slug => ({
      slug,
      status: 'parallel_queued',
      worktreePath: null,
      branchName: null,
      startedAt: null,
      completedAt: null,
      logPath: null
    })),
    startedAt: new Date().toISOString(),
    baseBranch,
    maxConcurrency: config.maxConcurrency
  };
  saveQueue(queue);

  // Setup abort handler for Ctrl+C
  setupAbortHandler(queue);

  const { active, queued } = splitByLimit(slugs, config.maxConcurrency);
  const running = new Map();
  const completed = [];
  let remaining = [...queued];

  try {
    // Start initial batch
    for (const slug of active) {
      await startFeature(slug, queue, running, options);
    }

  // Process until all complete
  while (running.size > 0 || remaining.length > 0) {
    // Wait for any running pipeline to complete
    if (running.size > 0) {
      const result = await Promise.race(running.values());
      running.delete(result.slug);

      // Update feature state
      const feature = queue.features.find(f => f.slug === result.slug);
      feature.completedAt = new Date().toISOString();

      // Update log path from result
      if (result.logPath) {
        feature.logPath = result.logPath;
      }

      const timestamp = new Date().toISOString().slice(11, 19);

      if (result.success) {
        feature.status = 'merge_pending';
        console.log(`[${timestamp}] ${result.slug}: Completed ✓`);

        // Attempt merge
        const mergeResult = mergeBranch(result.slug);
        if (mergeResult.success) {
          feature.status = 'parallel_complete';
          console.log(`[${timestamp}] ${result.slug}: Merged to ${baseBranch} ✓`);
          removeWorktree(result.slug);
        } else if (mergeResult.conflict) {
          feature.status = 'merge_conflict';
          feature.conflictDetails = mergeResult.output;
          console.log(`[${timestamp}] ${result.slug}: Merge conflict ⚠ (branch preserved)`);
          execSync('git merge --abort', { stdio: 'pipe' });
        } else {
          feature.status = 'parallel_failed';
          console.log(`[${timestamp}] ${result.slug}: Merge failed ✗`);
        }
      } else {
        feature.status = 'parallel_failed';
        if (result.timedOut) {
          console.log(`[${timestamp}] ${result.slug}: Timed out ⏱ (see log: ${feature.logPath})`);
          feature.timedOut = true;
        } else {
          console.log(`[${timestamp}] ${result.slug}: Failed ✗ (see log: ${feature.logPath})`);
        }
        // Preserve worktree for debugging
      }

      completed.push(feature);
      saveQueue(queue);

      // Promote from queue if slots available
      if (remaining.length > 0 && running.size < config.maxConcurrency) {
        const nextSlug = remaining.shift();
        await startFeature(nextSlug, queue, running);
      }
    }
  }

  // Final summary
  const summary = summarizeFinal(queue.features);
  console.log('\n--- Parallel Execution Complete ---');
  console.log(`Completed: ${summary.completed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Conflicts: ${summary.conflicts}`);

  if (summary.conflicts > 0) {
    console.log('\nFeatures with conflicts (branches preserved):');
    queue.features
      .filter(f => f.status === 'merge_conflict')
      .forEach(f => console.log(`  - ${f.branchName}`));
  }

  if (summary.failed > 0) {
    console.log('\nFailed features (worktrees preserved for debugging):');
    queue.features
      .filter(f => f.status === 'parallel_failed')
      .forEach(f => {
        console.log(`  - ${f.worktreePath}`);
        if (f.logPath) {
          console.log(`    Log: ${f.logPath}`);
        }
      });
  }

    return { success: summary.failed === 0 && summary.conflicts === 0, summary };
  } finally {
    // Always release lock when done
    releaseLock();
  }
}

async function startFeature(slug, queue, running, options = {}) {
  const feature = queue.features.find(f => f.slug === slug);
  const parallelCfg = readParallelConfig();

  console.log(`[${new Date().toISOString().slice(11, 19)}] ${slug}: Creating worktree...`);
  const { worktreePath, branchName } = createWorktree(slug);

  feature.worktreePath = worktreePath;
  feature.branchName = branchName;
  feature.status = 'worktree_created';
  feature.startedAt = new Date().toISOString();

  // Set log path
  feature.logPath = path.join(worktreePath, 'pipeline.log');

  saveQueue(queue);

  const timeoutMs = getTimeoutMs();
  const timeoutMin = timeoutMs / 60000;
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${slug}: Started (log: ${feature.logPath}, timeout: ${timeoutMin}min)`);
  feature.status = 'parallel_running';
  saveQueue(queue);

  const pipelinePromise = runPipelineInWorktree(slug, worktreePath, parallelCfg, options);
  const promise = withTimeout(pipelinePromise, timeoutMs, slug);
  running.set(slug, promise);
}

// --- Rollback ---

async function rollbackParallel(options = {}) {
  const queue = loadQueue();

  if (!queue.features || queue.features.length === 0) {
    console.log('No parallel run to rollback.');
    return { success: true, rolledBack: 0 };
  }

  const completedFeatures = queue.features.filter(f => f.status === 'parallel_complete');
  const failedFeatures = queue.features.filter(f =>
    f.status === 'parallel_failed' || f.status === 'merge_conflict'
  );

  if (completedFeatures.length === 0 && failedFeatures.length === 0) {
    console.log('No completed or failed features to rollback.');
    return { success: true, rolledBack: 0 };
  }

  console.log('\nParallel Run Rollback\n');

  if (options.dryRun) {
    console.log('DRY RUN - No changes will be made\n');
  }

  let rolledBack = 0;

  // Rollback completed features (revert merges)
  for (const f of completedFeatures) {
    console.log(`Rolling back ${f.slug}...`);
    if (!options.dryRun) {
      try {
        // Find and revert the merge commit
        const branchName = f.branchName || `feature/${f.slug}`;
        const logOutput = execSync(
          `git log --oneline --grep="${f.slug}" -n 1`,
          { encoding: 'utf8' }
        ).trim();

        if (logOutput) {
          const commitHash = logOutput.split(' ')[0];
          execSync(`git revert --no-commit ${commitHash}`, { stdio: 'pipe' });
          execSync(`git commit -m "Revert: ${f.slug} (parallel rollback)"`, { stdio: 'pipe' });
          console.log(`  ✓ Reverted commit ${commitHash}`);
          rolledBack++;
        } else {
          console.log(`  ⚠ Could not find merge commit for ${f.slug}`);
        }
      } catch (err) {
        console.log(`  ✗ Failed to rollback: ${err.message}`);
        if (!options.force) {
          execSync('git revert --abort', { stdio: 'pipe' }).catch(() => {});
        }
      }
    } else {
      console.log(`  Would revert merge for ${f.slug}`);
      rolledBack++;
    }
  }

  // Clean up failed/conflict worktrees
  for (const f of failedFeatures) {
    if (f.worktreePath) {
      console.log(`Cleaning up ${f.slug}...`);
      if (!options.dryRun) {
        try {
          removeWorktree(f.slug);
          console.log(`  ✓ Removed worktree`);
          rolledBack++;
        } catch {
          console.log(`  ⚠ Could not remove worktree`);
        }
      } else {
        console.log(`  Would remove worktree: ${f.worktreePath}`);
        rolledBack++;
      }
    }
  }

  // Clear the queue
  if (!options.dryRun && !options.preserveQueue) {
    saveQueue({ features: [], startedAt: null });
    console.log('\n✓ Queue cleared');
  }

  console.log(`\nRollback complete: ${rolledBack} item(s) processed`);

  return { success: true, rolledBack };
}

async function cleanupWorktrees() {
  const queue = loadQueue();
  let cleaned = 0;

  for (const feature of queue.features) {
    if (shouldCleanupWorktree(feature) && feature.worktreePath) {
      try {
        removeWorktree(feature.slug);
        console.log(`Cleaned up: ${feature.worktreePath}`);
        cleaned++;
      } catch {
        console.log(`Could not clean: ${feature.worktreePath}`);
      }
    }
  }

  if (cleaned === 0) {
    console.log('No worktrees to clean up.');
  }

  return cleaned;
}

module.exports = {
  // Configuration
  CONFIG_FILE,
  LOCK_FILE,
  getDefaultParallelConfig,
  readParallelConfig,
  writeParallelConfig,
  getQueueFile,
  // Utility functions
  buildWorktreePath,
  buildBranchName,
  getDefaultConfig,
  getQueuePath,
  shouldCleanupWorktree,
  validatePreFlight,
  isGitVersionSupported,
  splitByLimit,
  promoteFromQueue,
  buildPipelineCommand,
  canFastForward,
  hasMergeConflict,
  handleMergeConflict,
  orderByCompletion,
  transition,
  formatStatus,
  formatFeatureStatus,
  summarizeFinal,
  aggregateResults,
  abortFeature,
  abortAll,
  // Confirmation & Lock
  promptConfirm,
  buildConfirmMessage,
  acquireLock,
  releaseLock,
  getLockInfo,
  // Logging
  createLogStream,
  logWithTimestamp,
  // Feature limit
  validateFeatureLimit,
  // Disk space
  checkDiskSpace,
  validateDiskSpace,
  // Pre-flight batch validation
  validateFeatureSpec,
  extractFilesToModify,
  detectFileOverlap,
  detectDependencies,
  estimateScope,
  validateParallelBatch,
  formatPreflightResults,
  // Timeout
  withTimeout,
  getTimeoutMs,
  // Progress tracking
  getProgressFromLog,
  getDetailedStatus,
  formatDetailedStatus,
  progressBar,
  // Abort handling
  abortParallel,
  setupAbortHandler,
  // Rollback
  rollbackParallel,
  // Git operations
  checkGitStatus,
  createWorktree,
  removeWorktree,
  mergeBranch,
  getCurrentBranch,
  // Queue management
  loadQueue,
  saveQueue,
  QUEUE_FILE,
  // Execution
  dryRun,
  runPipelineInWorktree,
  runParallel,
  startFeature,
  cleanupWorktrees
};
