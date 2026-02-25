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
    console.log("Run 'orchestr8 parallel cleanup' to remove.\n");

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
    console.log("\nTo clean up: orchestr8 parallel cleanup");
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

function dryRun(slugs, config, baseBranch, gitStatus, validation) {
  const parallelCfg = readParallelConfig();
  const { active, queued } = splitByLimit(slugs, config.maxConcurrency);

  console.log('\n=== DRY RUN MODE ===\n');
  console.log('Pre-flight checks:');
  console.log(`  ${gitStatus.isGitRepo ? '✓' : '✗'} Git repository: ${gitStatus.isGitRepo ? 'yes' : 'no'}`);
  console.log(`  ${!gitStatus.isDirty ? '✓' : '✗'} Working tree: ${gitStatus.isDirty ? 'dirty (has uncommitted changes)' : 'clean'}`);
  console.log(`  ✓ Git version: ${gitStatus.gitVersion}`);
  console.log(`  ✓ Base branch: ${baseBranch}`);

  if (!validation.valid) {
    console.log(`\n⚠️  WARNING: Pre-flight checks failed. Real execution would abort.`);
    validation.errors.forEach(e => console.log(`     - ${e}`));
  }

  console.log(`\nConfiguration:`);
  console.log(`  Max concurrency: ${config.maxConcurrency}`);
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

  // Dry run mode - show what would happen without executing
  if (options.dryRun) {
    return dryRun(slugs, config, baseBranch, gitStatus, validation);
  }

  if (!validation.valid) {
    console.error('Pre-flight validation failed:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    return { success: false, errors: validation.errors };
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
      console.error('  • Run: orchestr8 parallel status');
      console.error('  • Force override: orchestr8 parallel ... --force\n');
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
        console.log(`[${timestamp}] ${result.slug}: Failed ✗ (see log: ${feature.logPath})`);
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

  console.log(`[${new Date().toISOString().slice(11, 19)}] ${slug}: Started (log: ${feature.logPath})`);
  feature.status = 'parallel_running';
  saveQueue(queue);

  const promise = runPipelineInWorktree(slug, worktreePath, parallelCfg, options);
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
  // Abort handling
  abortParallel,
  setupAbortHandler,
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
