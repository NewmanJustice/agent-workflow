'use strict';

const path = require('path');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const QUEUE_FILE = '.claude/parallel-queue.json';

function buildWorktreePath(slug) {
  return `.claude/worktrees/feat-${slug}`;
}

function buildBranchName(slug) {
  return `feature/${slug}`;
}

function getDefaultConfig() {
  return { maxConcurrency: 3 };
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

function buildPipelineCommand(slug, worktreePath) {
  return `claude --cwd ${worktreePath} /implement-feature "${slug}"`;
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

// --- Queue Persistence ---

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    return { features: [], startedAt: null };
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(queue) {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// --- Pipeline Execution ---

function runPipelineInWorktree(slug, worktreePath) {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['claude', '/implement-feature', slug, '--no-commit'], {
      cwd: worktreePath,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      resolve({ slug, success: code === 0, exitCode: code });
    });

    proc.on('error', (err) => {
      resolve({ slug, success: false, error: err.message });
    });
  });
}

// --- Main Orchestration ---

async function runParallel(slugs, options = {}) {
  const config = { ...getDefaultConfig(), ...options };
  const baseBranch = getCurrentBranch();

  // Pre-flight validation
  const gitStatus = checkGitStatus();
  const validation = validatePreFlight(gitStatus);
  if (!validation.valid) {
    console.error('Pre-flight validation failed:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    return { success: false, errors: validation.errors };
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
      completedAt: null
    })),
    startedAt: new Date().toISOString(),
    baseBranch,
    maxConcurrency: config.maxConcurrency
  };
  saveQueue(queue);

  const { active, queued } = splitByLimit(slugs, config.maxConcurrency);
  const running = new Map();
  const completed = [];
  let remaining = [...queued];

  // Start initial batch
  for (const slug of active) {
    await startFeature(slug, queue, running);
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

      if (result.success) {
        feature.status = 'merge_pending';
        console.log(`\n✓ ${result.slug} pipeline completed`);

        // Attempt merge
        const mergeResult = mergeBranch(result.slug);
        if (mergeResult.success) {
          feature.status = 'parallel_complete';
          console.log(`✓ ${result.slug} merged to ${baseBranch}`);
          removeWorktree(result.slug);
        } else if (mergeResult.conflict) {
          feature.status = 'merge_conflict';
          feature.conflictDetails = mergeResult.output;
          console.log(`⚠ ${result.slug} has merge conflicts - branch preserved`);
          execSync('git merge --abort', { stdio: 'pipe' });
        } else {
          feature.status = 'parallel_failed';
          console.log(`✗ ${result.slug} merge failed: ${mergeResult.output}`);
        }
      } else {
        feature.status = 'parallel_failed';
        console.log(`✗ ${result.slug} pipeline failed`);
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
      .forEach(f => console.log(`  - ${f.worktreePath}`));
  }

  return { success: summary.failed === 0 && summary.conflicts === 0, summary };
}

async function startFeature(slug, queue, running) {
  const feature = queue.features.find(f => f.slug === slug);

  console.log(`Creating worktree for ${slug}...`);
  const { worktreePath, branchName } = createWorktree(slug);

  feature.worktreePath = worktreePath;
  feature.branchName = branchName;
  feature.status = 'worktree_created';
  feature.startedAt = new Date().toISOString();
  saveQueue(queue);

  console.log(`Starting pipeline for ${slug} in ${worktreePath}`);
  feature.status = 'parallel_running';
  saveQueue(queue);

  const promise = runPipelineInWorktree(slug, worktreePath);
  running.set(slug, promise);
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
  runPipelineInWorktree,
  runParallel,
  startFeature,
  cleanupWorktrees
};
