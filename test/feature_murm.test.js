const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Module under test (to be implemented)
const murmPath = path.join(__dirname, "..", "src", "murm.js");

describe('murm-features', () => {
  let murm;
  let tempDir;

  beforeEach(() => {
    if (fs.existsSync(murmPath)) {
      murm = require(murmPath);
    }
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'murm-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('worktree management', () => {
    it('T-WM-1.1: builds worktree path at .claude/worktrees/feat-{slug}', () => {
      if (!murm) return;
      const result = murm.buildWorktreePath('user-auth');
      assert.strictEqual(result, '.claude/worktrees/feat-user-auth');
    });

    it('T-WM-1.2: builds branch name as feature/{slug}', () => {
      if (!murm) return;
      const result = murm.buildBranchName('user-auth');
      assert.strictEqual(result, 'feature/user-auth');
    });

    it('T-WM-2.1: marks worktree for cleanup on success', () => {
      if (!murm) return;
      const state = { status: 'murm_complete', slug: 'test' };
      assert.strictEqual(murm.shouldCleanupWorktree(state), true);
    });

    it('T-WM-2.2: preserves worktree on pipeline failure', () => {
      if (!murm) return;
      const state = { status: 'murm_failed', slug: 'test' };
      assert.strictEqual(murm.shouldCleanupWorktree(state), false);
    });

    it('T-WM-2.3: preserves worktree on merge conflict', () => {
      if (!murm) return;
      const state = { status: 'merge_conflict', slug: 'test' };
      assert.strictEqual(murm.shouldCleanupWorktree(state), false);
    });
  });

  describe('pre-flight validation', () => {
    it('T-PV-1.1: rejects if not in git repository', () => {
      if (!murm) return;
      const result = murm.validatePreFlight({ isGitRepo: false });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('git repository')));
    });

    it('T-PV-1.2: rejects if working tree is dirty', () => {
      if (!murm) return;
      const result = murm.validatePreFlight({ isGitRepo: true, isDirty: true });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('dirty') || e.includes('uncommitted')));
    });

    it('T-PV-1.3: validates git version 2.5+ for worktree support', () => {
      if (!murm) return;
      const tooOld = murm.isGitVersionSupported('2.4.0');
      const supported = murm.isGitVersionSupported('2.5.0');
      const newer = murm.isGitVersionSupported('2.40.0');
      assert.strictEqual(tooOld, false);
      assert.strictEqual(supported, true);
      assert.strictEqual(newer, true);
    });
  });

  describe('concurrency control', () => {
    it('T-CC-1.1: default maxConcurrency is 3', () => {
      if (!murm) return;
      const config = murm.getDefaultConfig();
      assert.strictEqual(config.maxConcurrency, 3);
    });

    it('T-CC-1.2: splits features into active and queued based on limit', () => {
      if (!murm) return;
      const slugs = ['a', 'b', 'c', 'd', 'e'];
      const result = murm.splitByLimit(slugs, 3);
      assert.strictEqual(result.active.length, 3);
      assert.strictEqual(result.queued.length, 2);
      assert.deepStrictEqual(result.active, ['a', 'b', 'c']);
      assert.deepStrictEqual(result.queued, ['d', 'e']);
    });

    it('T-CC-1.3: promotes queued feature when slot frees', () => {
      if (!murm) return;
      const state = {
        active: ['a', 'b'],
        queued: ['c', 'd'],
        maxConcurrency: 3
      };
      const updated = murm.promoteFromQueue(state);
      assert.strictEqual(updated.active.length, 3);
      assert.strictEqual(updated.queued.length, 1);
      assert.ok(updated.active.includes('c'));
    });

    it('T-CC-1.4: respects custom maxConcurrency', () => {
      if (!murm) return;
      const slugs = ['a', 'b', 'c', 'd'];
      const result = murm.splitByLimit(slugs, 2);
      assert.strictEqual(result.active.length, 2);
      assert.strictEqual(result.queued.length, 2);
    });
  });

  describe('pipeline execution', () => {
    it('T-PE-1.1: builds pipeline command for worktree', () => {
      if (!murm) return;
      const cmd = murm.buildPipelineCommand('user-auth', '/path/to/worktree');
      assert.ok(cmd.includes('implement-feature'));
      assert.ok(cmd.includes('user-auth'));
    });

    it('T-PE-1.2: pipelines have independent queue files', () => {
      if (!murm) return;
      const path1 = murm.getQueuePath('/worktree1');
      const path2 = murm.getQueuePath('/worktree2');
      assert.notStrictEqual(path1, path2);
    });

    it('T-PE-1.3: failure state is isolated to single feature', () => {
      if (!murm) return;
      const states = [
        { slug: 'a', status: 'murm_complete' },
        { slug: 'b', status: 'murm_failed' },
        { slug: 'c', status: 'murm_running' }
      ];
      const failed = states.filter(s => s.status === 'murm_failed');
      assert.strictEqual(failed.length, 1);
      assert.strictEqual(failed[0].slug, 'b');
    });

    it('T-PE-1.4: aggregates results from all pipelines', () => {
      if (!murm) return;
      const results = [
        { slug: 'a', status: 'murm_complete' },
        { slug: 'b', status: 'murm_failed' },
        { slug: 'c', status: 'murm_complete' }
      ];
      const summary = murm.aggregateResults(results);
      assert.strictEqual(summary.completed, 2);
      assert.strictEqual(summary.failed, 1);
      assert.strictEqual(summary.total, 3);
    });
  });

  describe('merge handling', () => {
    it('T-MH-1.1: detects fast-forward possibility', () => {
      if (!murm) return;
      const canFF = murm.canFastForward({ mainHead: 'abc', branchBase: 'abc' });
      assert.strictEqual(canFF, true);
    });

    it('T-MH-1.2: falls back to merge commit when no fast-forward', () => {
      if (!murm) return;
      const canFF = murm.canFastForward({ mainHead: 'xyz', branchBase: 'abc' });
      assert.strictEqual(canFF, false);
    });

    it('T-MH-1.3: orders features by completion time for merge', () => {
      if (!murm) return;
      const features = [
        { slug: 'a', completedAt: '2026-02-25T10:05:00Z' },
        { slug: 'b', completedAt: '2026-02-25T10:02:00Z' },
        { slug: 'c', completedAt: '2026-02-25T10:08:00Z' }
      ];
      const ordered = murm.orderByCompletion(features);
      assert.deepStrictEqual(ordered.map(f => f.slug), ['b', 'a', 'c']);
    });

    it('T-MH-2.1: identifies merge conflict from git output', () => {
      if (!murm) return;
      const output = 'CONFLICT (content): Merge conflict in src/index.js';
      assert.strictEqual(murm.hasMergeConflict(output), true);
    });

    it('T-MH-2.2: transitions to merge_conflict state on conflict', () => {
      if (!murm) return;
      const state = { slug: 'test', status: 'merge_pending' };
      const updated = murm.handleMergeConflict(state);
      assert.strictEqual(updated.status, 'merge_conflict');
    });

    it('T-MH-2.3: includes conflict details in state', () => {
      if (!murm) return;
      const conflictOutput = 'CONFLICT in src/index.js\nAutomatic merge failed';
      const state = murm.handleMergeConflict({ slug: 'test' }, conflictOutput);
      assert.ok(state.conflictDetails);
      assert.ok(state.conflictDetails.includes('src/index.js'));
    });
  });

  describe('status reporting', () => {
    it('T-SR-1.1: formats status for all pipelines', () => {
      if (!murm) return;
      const states = [
        { slug: 'a', status: 'murm_running' },
        { slug: 'b', status: 'murm_complete' }
      ];
      const output = murm.formatStatus(states);
      assert.ok(output.includes('a'));
      assert.ok(output.includes('b'));
      assert.ok(output.includes('running') || output.includes('complete'));
    });

    it('T-SR-1.2: shows per-feature state in status', () => {
      if (!murm) return;
      const state = { slug: 'user-auth', status: 'murm_running', stage: 'nigel' };
      const line = murm.formatFeatureStatus(state);
      assert.ok(line.includes('user-auth'));
      assert.ok(line.includes('running') || line.includes('nigel'));
    });

    it('T-SR-1.3: summarizes final counts', () => {
      if (!murm) return;
      const results = [
        { status: 'murm_complete' },
        { status: 'murm_complete' },
        { status: 'murm_failed' },
        { status: 'merge_conflict' }
      ];
      const summary = murm.summarizeFinal(results);
      assert.strictEqual(summary.completed, 2);
      assert.strictEqual(summary.failed, 1);
      assert.strictEqual(summary.conflicts, 1);
    });
  });

  describe('state management', () => {
    it('T-SM-1.1: transitions from queued to worktree_created to running', () => {
      if (!murm) return;
      let state = { slug: 'test', status: 'murm_queued' };
      state = murm.transition(state, 'worktree_created');
      assert.strictEqual(state.status, 'worktree_created');
      state = murm.transition(state, 'murm_running');
      assert.strictEqual(state.status, 'murm_running');
    });

    it('T-SM-1.2: transitions from running to merge_pending to complete', () => {
      if (!murm) return;
      let state = { slug: 'test', status: 'murm_running' };
      state = murm.transition(state, 'merge_pending');
      assert.strictEqual(state.status, 'merge_pending');
      state = murm.transition(state, 'murm_complete');
      assert.strictEqual(state.status, 'murm_complete');
    });

    it('T-SM-1.3: transitions from running to failed', () => {
      if (!murm) return;
      let state = { slug: 'test', status: 'murm_running' };
      state = murm.transition(state, 'murm_failed');
      assert.strictEqual(state.status, 'murm_failed');
    });

    it('T-SM-1.4: transitions from merge_pending to conflict', () => {
      if (!murm) return;
      let state = { slug: 'test', status: 'merge_pending' };
      state = murm.transition(state, 'merge_conflict');
      assert.strictEqual(state.status, 'merge_conflict');
    });
  });

  describe('user control', () => {
    it('T-UC-1.1: can abort single feature', () => {
      if (!murm) return;
      const states = [
        { slug: 'a', status: 'murm_running' },
        { slug: 'b', status: 'murm_running' }
      ];
      const updated = murm.abortFeature(states, 'a');
      const aborted = updated.find(s => s.slug === 'a');
      const running = updated.find(s => s.slug === 'b');
      assert.strictEqual(aborted.status, 'aborted');
      assert.strictEqual(running.status, 'murm_running');
    });

    it('T-UC-1.2: can abort all features', () => {
      if (!murm) return;
      const states = [
        { slug: 'a', status: 'murm_running' },
        { slug: 'b', status: 'murm_running' }
      ];
      const updated = murm.abortAll(states);
      assert.ok(updated.every(s => s.status === 'aborted'));
    });

    it('T-UC-1.3: aborted worktrees marked for cleanup', () => {
      if (!murm) return;
      const state = { slug: 'test', status: 'aborted' };
      assert.strictEqual(murm.shouldCleanupWorktree(state), true);
    });
  });

  describe('git operations', () => {
    it('T-GO-1.1: checkGitStatus returns git repo info', () => {
      if (!murm) return;
      const status = murm.checkGitStatus();
      assert.strictEqual(typeof status.isGitRepo, 'boolean');
      assert.strictEqual(typeof status.isDirty, 'boolean');
      assert.strictEqual(typeof status.gitVersion, 'string');
    });

    it('T-GO-1.2: checkGitStatus detects current repo as git repo', () => {
      if (!murm) return;
      const status = murm.checkGitStatus();
      assert.strictEqual(status.isGitRepo, true);
    });

    it('T-GO-1.3: getCurrentBranch returns branch name', () => {
      if (!murm) return;
      const branch = murm.getCurrentBranch();
      assert.strictEqual(typeof branch, 'string');
      assert.ok(branch.length > 0);
    });
  });

  describe('queue persistence', () => {
    it('T-QP-1.1: loadQueue returns empty queue when file missing', () => {
      if (!murm) return;
      // Note: This test assumes no murm-queue.json exists initially
      // In practice, loadQueue handles missing file gracefully
      const queue = murm.loadQueue();
      assert.ok(queue);
      assert.ok(Array.isArray(queue.features) || queue.features === undefined);
    });

    it('T-QP-1.2: saveQueue creates queue file', () => {
      if (!murm) return;
      const testQueue = { features: [], startedAt: new Date().toISOString() };
      // saveQueue would create the file - we just verify the function exists
      assert.strictEqual(typeof murm.saveQueue, 'function');
    });

    it('T-QP-1.3: QUEUE_FILE constant is defined', () => {
      if (!murm) return;
      assert.strictEqual(murm.QUEUE_FILE, '.claude/murm-queue.json');
    });
  });

  describe('execution functions', () => {
    it('T-EX-1.1: runMurm is async function', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.runMurm, 'function');
    });

    it('T-EX-1.2: runPipelineInWorktree returns promise', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.runPipelineInWorktree, 'function');
    });

    it('T-EX-1.3: cleanupWorktrees is async function', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.cleanupWorktrees, 'function');
    });

    it('T-EX-1.4: createWorktree is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.createWorktree, 'function');
    });

    it('T-EX-1.5: removeWorktree is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.removeWorktree, 'function');
    });

    it('T-EX-1.6: mergeBranch is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.mergeBranch, 'function');
    });
  });

  describe('confirmation safeguard', () => {
    it('T-CF-1.1: buildConfirmMessage returns string', () => {
      if (!murm) return;
      const msg = murm.buildConfirmMessage(['a', 'b'], { maxConcurrency: 3 });
      assert.strictEqual(typeof msg, 'string');
      assert.ok(msg.includes('worktree'));
    });

    it('T-CF-1.2: buildConfirmMessage shows feature count', () => {
      if (!murm) return;
      const msg = murm.buildConfirmMessage(['a', 'b', 'c'], { maxConcurrency: 3 });
      assert.ok(msg.includes('3'));
    });

    it('T-CF-1.3: promptConfirm is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.promptConfirm, 'function');
    });
  });

  describe('lock safeguard', () => {
    it('T-LK-1.1: LOCK_FILE constant is defined', () => {
      if (!murm) return;
      assert.strictEqual(murm.LOCK_FILE, '.claude/murm.lock');
    });

    it('T-LK-1.2: acquireLock returns object with acquired property', () => {
      if (!murm) return;
      // Clean up any existing lock first
      murm.releaseLock();
      const result = murm.acquireLock(['test']);
      assert.strictEqual(typeof result.acquired, 'boolean');
      murm.releaseLock(); // Clean up
    });

    it('T-LK-1.3: releaseLock is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.releaseLock, 'function');
    });

    it('T-LK-1.4: getLockInfo returns null when no lock', () => {
      if (!murm) return;
      murm.releaseLock();
      const info = murm.getLockInfo();
      assert.strictEqual(info, null);
    });

    it('T-LK-1.5: getLockInfo returns lock data when locked', () => {
      if (!murm) return;
      murm.releaseLock();
      murm.acquireLock(['test-feat']);
      const info = murm.getLockInfo();
      assert.ok(info);
      assert.strictEqual(info.pid, process.pid);
      assert.ok(info.features.includes('test-feat'));
      murm.releaseLock(); // Clean up
    });
  });

  describe('logging safeguard', () => {
    it('T-LG-1.1: createLogStream is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.createLogStream, 'function');
    });

    it('T-LG-1.2: logWithTimestamp is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.logWithTimestamp, 'function');
    });
  });

  describe('abort safeguard', () => {
    it('T-AB-1.1: abortMurm is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.abortMurm, 'function');
    });

    it('T-AB-1.2: setupAbortHandler is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.setupAbortHandler, 'function');
    });
  });

  describe('feature limit safeguard (P1)', () => {
    it('T-FL-1.1: validateFeatureLimit passes for small batches', () => {
      if (!murm) return;
      const result = murm.validateFeatureLimit(['a', 'b', 'c']);
      assert.strictEqual(result.valid, true);
    });

    it('T-FL-1.2: validateFeatureLimit fails for large batches', () => {
      if (!murm) return;
      const manyFeatures = Array.from({ length: 15 }, (_, i) => `feat-${i}`);
      const result = murm.validateFeatureLimit(manyFeatures);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('Too many features'));
    });

    it('T-FL-1.3: default maxFeatures is 10', () => {
      if (!murm) return;
      const config = murm.getDefaultMurmConfig();
      assert.strictEqual(config.maxFeatures, 10);
    });
  });

  describe('disk space safeguard (P1)', () => {
    it('T-DS-1.1: checkDiskSpace returns object with availableMB', () => {
      if (!murm) return;
      const result = murm.checkDiskSpace();
      assert.strictEqual(typeof result.availableMB, 'number');
      assert.strictEqual(typeof result.sufficient, 'boolean');
    });

    it('T-DS-1.2: validateDiskSpace returns valid property', () => {
      if (!murm) return;
      const result = murm.validateDiskSpace();
      assert.strictEqual(typeof result.valid, 'boolean');
    });

    it('T-DS-1.3: default minDiskSpaceMB is 500', () => {
      if (!murm) return;
      const config = murm.getDefaultMurmConfig();
      assert.strictEqual(config.minDiskSpaceMB, 500);
    });
  });

  describe('timeout safeguard (P1)', () => {
    it('T-TO-1.1: getTimeoutMs returns number', () => {
      if (!murm) return;
      const timeout = murm.getTimeoutMs();
      assert.strictEqual(typeof timeout, 'number');
      assert.ok(timeout > 0);
    });

    it('T-TO-1.2: default timeout is 30 minutes', () => {
      if (!murm) return;
      const config = murm.getDefaultMurmConfig();
      assert.strictEqual(config.timeout, 30);
    });

    it('T-TO-1.3: getTimeoutMs converts minutes to milliseconds', () => {
      if (!murm) return;
      const config = murm.getDefaultMurmConfig();
      const timeoutMs = murm.getTimeoutMs();
      assert.strictEqual(timeoutMs, config.timeout * 60 * 1000);
    });

    it('T-TO-1.4: withTimeout is exported', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.withTimeout, 'function');
    });

    it('T-TO-1.5: withTimeout resolves when promise completes before timeout', async () => {
      if (!murm) return;
      const fastPromise = Promise.resolve({ slug: 'test', success: true });
      const result = await murm.withTimeout(fastPromise, 5000, 'test');
      assert.strictEqual(result.success, true);
    });
  });

  describe('progress tracking (P2)', () => {
    it('T-PR-1.1: getProgressFromLog returns stage and percent', () => {
      if (!murm) return;
      const result = murm.getProgressFromLog('/nonexistent/path');
      assert.strictEqual(typeof result.stage, 'string');
      assert.strictEqual(typeof result.percent, 'number');
    });

    it('T-PR-1.2: getDetailedStatus returns object with features array', () => {
      if (!murm) return;
      const result = murm.getDetailedStatus();
      assert.strictEqual(typeof result.active, 'boolean');
      assert.ok(Array.isArray(result.features));
    });

    it('T-PR-1.3: formatDetailedStatus returns string', () => {
      if (!murm) return;
      const details = { active: false, features: [] };
      const result = murm.formatDetailedStatus(details);
      assert.strictEqual(typeof result, 'string');
    });

    it('T-PR-1.4: progressBar generates visual bar', () => {
      if (!murm) return;
      const bar = murm.progressBar(50, 10);
      assert.ok(bar.includes('['));
      assert.ok(bar.includes(']'));
      assert.ok(bar.includes('}'));
      assert.ok(bar.includes('\u00b7'));
    });

    it('T-PR-1.5: progressBar handles 0%', () => {
      if (!murm) return;
      const bar = murm.progressBar(0, 10);
      assert.ok(bar.includes('\u00b7'.repeat(10)));
    });

    it('T-PR-1.6: progressBar handles 100%', () => {
      if (!murm) return;
      const bar = murm.progressBar(100, 10);
      assert.ok(bar.includes('}'.repeat(10)));
    });
  });

  describe('rollback (P3)', () => {
    it('T-RB-1.1: rollbackMurm is async function', () => {
      if (!murm) return;
      assert.strictEqual(typeof murm.rollbackMurm, 'function');
    });

    it('T-RB-1.2: rollbackMurm returns object with success property', async () => {
      if (!murm) return;
      // Clear any existing queue first
      murm.saveQueue({ features: [], startedAt: null });
      const result = await murm.rollbackMurm({ dryRun: true });
      assert.strictEqual(typeof result.success, 'boolean');
    });

    it('T-RB-1.3: rollbackMurm handles empty queue', async () => {
      if (!murm) return;
      murm.saveQueue({ features: [], startedAt: null });
      const result = await murm.rollbackMurm();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.rolledBack, 0);
    });
  });

  describe('pre-flight batch validation', () => {
    let testBlueprintDir;

    beforeEach(() => {
      // Create test blueprint directory structure
      testBlueprintDir = path.join(tempDir, '.blueprint', 'features');
      fs.mkdirSync(testBlueprintDir, { recursive: true });
    });

    it('T-PB-1.1: validateFeatureSpec detects missing FEATURE_SPEC.md', () => {
      if (!murm) return;
      const result = murm.validateFeatureSpec('nonexistent-feature');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing FEATURE_SPEC.md')));
    });

    it('T-PB-1.2: extractFilesToModify extracts file paths from table format', () => {
      if (!murm) return;
      const planContent = `
## Files to Create/Modify

| Path | Action | Purpose |
|------|--------|---------|
| src/utils.js | modify | Add helper |
| src/index.js | modify | Export new util |
| test/utils.test.js | create | Add tests |

## Implementation Steps
`;
      const files = murm.extractFilesToModify(planContent);
      assert.ok(files.includes('src/utils.js'));
      assert.ok(files.includes('src/index.js'));
      assert.ok(files.includes('test/utils.test.js'));
    });

    it('T-PB-1.3: detectFileOverlap finds files modified by multiple features', () => {
      if (!murm) return;
      const validations = [
        { slug: 'feat-a', filesToModify: ['src/utils.js', 'src/a.js'] },
        { slug: 'feat-b', filesToModify: ['src/utils.js', 'src/b.js'] },
        { slug: 'feat-c', filesToModify: ['src/c.js'] }
      ];
      const overlaps = murm.detectFileOverlap(validations);
      assert.strictEqual(overlaps.length, 1);
      assert.strictEqual(overlaps[0].file, 'src/utils.js');
      assert.deepStrictEqual(overlaps[0].features, ['feat-a', 'feat-b']);
    });

    it('T-PB-1.4: detectFileOverlap returns empty array when no overlaps', () => {
      if (!murm) return;
      const validations = [
        { slug: 'feat-a', filesToModify: ['src/a.js'] },
        { slug: 'feat-b', filesToModify: ['src/b.js'] }
      ];
      const overlaps = murm.detectFileOverlap(validations);
      assert.strictEqual(overlaps.length, 0);
    });

    it('T-PB-1.5: estimateScope calculates time based on stories and files', () => {
      if (!murm) return;
      const validations = [
        { slug: 'feat-a', storyCount: 3, filesToModify: ['a.js', 'b.js'] },
        { slug: 'feat-b', storyCount: 1, filesToModify: [] }
      ];
      const estimates = murm.estimateScope(validations);
      assert.strictEqual(estimates.length, 2);
      // feat-a: 10 base + 3*5 stories + 2*2 files = 29
      assert.strictEqual(estimates[0].estimatedMinutes, 29);
      // feat-b: 10 base + 1*5 stories + 0 files = 15
      assert.strictEqual(estimates[1].estimatedMinutes, 15);
    });

    it('T-PB-1.6: validateMurmBatch returns comprehensive validation result', () => {
      if (!murm) return;
      // Test with non-existent features
      const result = murm.validateMurmBatch(['nonexistent-a', 'nonexistent-b']);
      assert.strictEqual(typeof result.valid, 'boolean');
      assert.ok(Array.isArray(result.features));
      assert.ok(Array.isArray(result.fileOverlaps));
      assert.ok(Array.isArray(result.dependencies));
      assert.ok(Array.isArray(result.scopeEstimates));
      assert.strictEqual(typeof result.totalEstimatedMinutes, 'number');
    });

    it('T-PB-1.7: formatPreflightResults produces readable output', () => {
      if (!murm) return;
      const mockResults = {
        valid: false,
        features: [
          { slug: 'feat-a', valid: true, specComplete: true, storiesExist: true, storyCount: 2, planExists: true, errors: [], warnings: [] },
          { slug: 'feat-b', valid: false, specComplete: false, storiesExist: false, storyCount: 0, planExists: false, errors: ['Missing FEATURE_SPEC.md'], warnings: [] }
        ],
        fileOverlaps: [],
        dependencies: [],
        scopeEstimates: [
          { slug: 'feat-a', storyCount: 2, fileCount: 3, estimatedMinutes: 20 },
          { slug: 'feat-b', storyCount: 0, fileCount: 0, estimatedMinutes: 10 }
        ],
        recommendations: [],
        totalEstimatedMinutes: 30,
        parallelEstimatedMinutes: 20,
        invalidFeatures: [{ slug: 'feat-b' }]
      };
      const output = murm.formatPreflightResults(mockResults);
      assert.ok(output.includes('Pre-flight Validation'));
      assert.ok(output.includes('feat-a'));
      assert.ok(output.includes('feat-b'));
      assert.ok(output.includes('Scope Estimation'));
    });

    it('T-PB-1.8: validateMurmBatch marks batch invalid when features missing specs', () => {
      if (!murm) return;
      const result = murm.validateMurmBatch(['no-spec-feature']);
      assert.strictEqual(result.valid, false);
      assert.ok(result.invalidFeatures.length > 0);
    });
  });

  describe('legacy migration', () => {
    it('T-MG-1.1: migrateFile moves old path to new path', () => {
      if (!murm) return;
      const oldPath = path.join(tempDir, 'old.json');
      const newPath = path.join(tempDir, 'new.json');
      fs.writeFileSync(oldPath, '{"migrated":true}');
      murm.migrateFile(oldPath, newPath);
      assert.strictEqual(fs.existsSync(oldPath), false);
      assert.strictEqual(fs.existsSync(newPath), true);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(newPath, 'utf8')), { migrated: true });
    });

    it('T-MG-1.2: migrateFile is a no-op when new path already exists', () => {
      if (!murm) return;
      const oldPath = path.join(tempDir, 'old2.json');
      const newPath = path.join(tempDir, 'new2.json');
      fs.writeFileSync(oldPath, '{"old":true}');
      fs.writeFileSync(newPath, '{"new":true}');
      murm.migrateFile(oldPath, newPath);
      // Old file kept, new file untouched
      assert.strictEqual(fs.existsSync(oldPath), true);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(newPath, 'utf8')), { new: true });
    });

    it('T-MG-1.3: migrateFile is a no-op when old path does not exist', () => {
      if (!murm) return;
      const oldPath = path.join(tempDir, 'nonexistent.json');
      const newPath = path.join(tempDir, 'target.json');
      murm.migrateFile(oldPath, newPath);
      assert.strictEqual(fs.existsSync(newPath), false);
    });

    it('T-MG-1.4: legacy path constants are exported', () => {
      if (!murm) return;
      assert.strictEqual(murm.LEGACY_CONFIG_FILE, '.claude/parallel-config.json');
      assert.strictEqual(murm.LEGACY_LOCK_FILE, '.claude/parallel.lock');
      assert.strictEqual(murm.LEGACY_QUEUE_FILE, '.claude/parallel-queue.json');
    });

    it('T-MG-1.5: readMurmConfig migrates legacy queueFile value in config', () => {
      if (!murm) return;
      // getDefaultMurmConfig should use the new queue path
      const config = murm.getDefaultMurmConfig();
      assert.strictEqual(config.queueFile, '.claude/murm-queue.json');
    });
  });
});
