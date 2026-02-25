const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Module under test (to be implemented)
const parallelPath = path.join(__dirname, '..', 'src', 'parallel.js');

describe('parallel-features', () => {
  let parallel;
  let tempDir;

  beforeEach(() => {
    if (fs.existsSync(parallelPath)) {
      parallel = require(parallelPath);
    }
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parallel-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('worktree management', () => {
    it('T-WM-1.1: builds worktree path at .claude/worktrees/feat-{slug}', () => {
      if (!parallel) return;
      const result = parallel.buildWorktreePath('user-auth');
      assert.strictEqual(result, '.claude/worktrees/feat-user-auth');
    });

    it('T-WM-1.2: builds branch name as feature/{slug}', () => {
      if (!parallel) return;
      const result = parallel.buildBranchName('user-auth');
      assert.strictEqual(result, 'feature/user-auth');
    });

    it('T-WM-2.1: marks worktree for cleanup on success', () => {
      if (!parallel) return;
      const state = { status: 'parallel_complete', slug: 'test' };
      assert.strictEqual(parallel.shouldCleanupWorktree(state), true);
    });

    it('T-WM-2.2: preserves worktree on pipeline failure', () => {
      if (!parallel) return;
      const state = { status: 'parallel_failed', slug: 'test' };
      assert.strictEqual(parallel.shouldCleanupWorktree(state), false);
    });

    it('T-WM-2.3: preserves worktree on merge conflict', () => {
      if (!parallel) return;
      const state = { status: 'merge_conflict', slug: 'test' };
      assert.strictEqual(parallel.shouldCleanupWorktree(state), false);
    });
  });

  describe('pre-flight validation', () => {
    it('T-PV-1.1: rejects if not in git repository', () => {
      if (!parallel) return;
      const result = parallel.validatePreFlight({ isGitRepo: false });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('git repository')));
    });

    it('T-PV-1.2: rejects if working tree is dirty', () => {
      if (!parallel) return;
      const result = parallel.validatePreFlight({ isGitRepo: true, isDirty: true });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('dirty') || e.includes('uncommitted')));
    });

    it('T-PV-1.3: validates git version 2.5+ for worktree support', () => {
      if (!parallel) return;
      const tooOld = parallel.isGitVersionSupported('2.4.0');
      const supported = parallel.isGitVersionSupported('2.5.0');
      const newer = parallel.isGitVersionSupported('2.40.0');
      assert.strictEqual(tooOld, false);
      assert.strictEqual(supported, true);
      assert.strictEqual(newer, true);
    });
  });

  describe('concurrency control', () => {
    it('T-CC-1.1: default maxConcurrency is 3', () => {
      if (!parallel) return;
      const config = parallel.getDefaultConfig();
      assert.strictEqual(config.maxConcurrency, 3);
    });

    it('T-CC-1.2: splits features into active and queued based on limit', () => {
      if (!parallel) return;
      const slugs = ['a', 'b', 'c', 'd', 'e'];
      const result = parallel.splitByLimit(slugs, 3);
      assert.strictEqual(result.active.length, 3);
      assert.strictEqual(result.queued.length, 2);
      assert.deepStrictEqual(result.active, ['a', 'b', 'c']);
      assert.deepStrictEqual(result.queued, ['d', 'e']);
    });

    it('T-CC-1.3: promotes queued feature when slot frees', () => {
      if (!parallel) return;
      const state = {
        active: ['a', 'b'],
        queued: ['c', 'd'],
        maxConcurrency: 3
      };
      const updated = parallel.promoteFromQueue(state);
      assert.strictEqual(updated.active.length, 3);
      assert.strictEqual(updated.queued.length, 1);
      assert.ok(updated.active.includes('c'));
    });

    it('T-CC-1.4: respects custom maxConcurrency', () => {
      if (!parallel) return;
      const slugs = ['a', 'b', 'c', 'd'];
      const result = parallel.splitByLimit(slugs, 2);
      assert.strictEqual(result.active.length, 2);
      assert.strictEqual(result.queued.length, 2);
    });
  });

  describe('pipeline execution', () => {
    it('T-PE-1.1: builds pipeline command for worktree', () => {
      if (!parallel) return;
      const cmd = parallel.buildPipelineCommand('user-auth', '/path/to/worktree');
      assert.ok(cmd.includes('implement-feature'));
      assert.ok(cmd.includes('user-auth'));
    });

    it('T-PE-1.2: pipelines have independent queue files', () => {
      if (!parallel) return;
      const path1 = parallel.getQueuePath('/worktree1');
      const path2 = parallel.getQueuePath('/worktree2');
      assert.notStrictEqual(path1, path2);
    });

    it('T-PE-1.3: failure state is isolated to single feature', () => {
      if (!parallel) return;
      const states = [
        { slug: 'a', status: 'parallel_complete' },
        { slug: 'b', status: 'parallel_failed' },
        { slug: 'c', status: 'parallel_running' }
      ];
      const failed = states.filter(s => s.status === 'parallel_failed');
      assert.strictEqual(failed.length, 1);
      assert.strictEqual(failed[0].slug, 'b');
    });

    it('T-PE-1.4: aggregates results from all pipelines', () => {
      if (!parallel) return;
      const results = [
        { slug: 'a', status: 'parallel_complete' },
        { slug: 'b', status: 'parallel_failed' },
        { slug: 'c', status: 'parallel_complete' }
      ];
      const summary = parallel.aggregateResults(results);
      assert.strictEqual(summary.completed, 2);
      assert.strictEqual(summary.failed, 1);
      assert.strictEqual(summary.total, 3);
    });
  });

  describe('merge handling', () => {
    it('T-MH-1.1: detects fast-forward possibility', () => {
      if (!parallel) return;
      const canFF = parallel.canFastForward({ mainHead: 'abc', branchBase: 'abc' });
      assert.strictEqual(canFF, true);
    });

    it('T-MH-1.2: falls back to merge commit when no fast-forward', () => {
      if (!parallel) return;
      const canFF = parallel.canFastForward({ mainHead: 'xyz', branchBase: 'abc' });
      assert.strictEqual(canFF, false);
    });

    it('T-MH-1.3: orders features by completion time for merge', () => {
      if (!parallel) return;
      const features = [
        { slug: 'a', completedAt: '2026-02-25T10:05:00Z' },
        { slug: 'b', completedAt: '2026-02-25T10:02:00Z' },
        { slug: 'c', completedAt: '2026-02-25T10:08:00Z' }
      ];
      const ordered = parallel.orderByCompletion(features);
      assert.deepStrictEqual(ordered.map(f => f.slug), ['b', 'a', 'c']);
    });

    it('T-MH-2.1: identifies merge conflict from git output', () => {
      if (!parallel) return;
      const output = 'CONFLICT (content): Merge conflict in src/index.js';
      assert.strictEqual(parallel.hasMergeConflict(output), true);
    });

    it('T-MH-2.2: transitions to merge_conflict state on conflict', () => {
      if (!parallel) return;
      const state = { slug: 'test', status: 'merge_pending' };
      const updated = parallel.handleMergeConflict(state);
      assert.strictEqual(updated.status, 'merge_conflict');
    });

    it('T-MH-2.3: includes conflict details in state', () => {
      if (!parallel) return;
      const conflictOutput = 'CONFLICT in src/index.js\nAutomatic merge failed';
      const state = parallel.handleMergeConflict({ slug: 'test' }, conflictOutput);
      assert.ok(state.conflictDetails);
      assert.ok(state.conflictDetails.includes('src/index.js'));
    });
  });

  describe('status reporting', () => {
    it('T-SR-1.1: formats status for all pipelines', () => {
      if (!parallel) return;
      const states = [
        { slug: 'a', status: 'parallel_running' },
        { slug: 'b', status: 'parallel_complete' }
      ];
      const output = parallel.formatStatus(states);
      assert.ok(output.includes('a'));
      assert.ok(output.includes('b'));
      assert.ok(output.includes('running') || output.includes('complete'));
    });

    it('T-SR-1.2: shows per-feature state in status', () => {
      if (!parallel) return;
      const state = { slug: 'user-auth', status: 'parallel_running', stage: 'nigel' };
      const line = parallel.formatFeatureStatus(state);
      assert.ok(line.includes('user-auth'));
      assert.ok(line.includes('running') || line.includes('nigel'));
    });

    it('T-SR-1.3: summarizes final counts', () => {
      if (!parallel) return;
      const results = [
        { status: 'parallel_complete' },
        { status: 'parallel_complete' },
        { status: 'parallel_failed' },
        { status: 'merge_conflict' }
      ];
      const summary = parallel.summarizeFinal(results);
      assert.strictEqual(summary.completed, 2);
      assert.strictEqual(summary.failed, 1);
      assert.strictEqual(summary.conflicts, 1);
    });
  });

  describe('state management', () => {
    it('T-SM-1.1: transitions from queued to worktree_created to running', () => {
      if (!parallel) return;
      let state = { slug: 'test', status: 'parallel_queued' };
      state = parallel.transition(state, 'worktree_created');
      assert.strictEqual(state.status, 'worktree_created');
      state = parallel.transition(state, 'parallel_running');
      assert.strictEqual(state.status, 'parallel_running');
    });

    it('T-SM-1.2: transitions from running to merge_pending to complete', () => {
      if (!parallel) return;
      let state = { slug: 'test', status: 'parallel_running' };
      state = parallel.transition(state, 'merge_pending');
      assert.strictEqual(state.status, 'merge_pending');
      state = parallel.transition(state, 'parallel_complete');
      assert.strictEqual(state.status, 'parallel_complete');
    });

    it('T-SM-1.3: transitions from running to failed', () => {
      if (!parallel) return;
      let state = { slug: 'test', status: 'parallel_running' };
      state = parallel.transition(state, 'parallel_failed');
      assert.strictEqual(state.status, 'parallel_failed');
    });

    it('T-SM-1.4: transitions from merge_pending to conflict', () => {
      if (!parallel) return;
      let state = { slug: 'test', status: 'merge_pending' };
      state = parallel.transition(state, 'merge_conflict');
      assert.strictEqual(state.status, 'merge_conflict');
    });
  });

  describe('user control', () => {
    it('T-UC-1.1: can abort single feature', () => {
      if (!parallel) return;
      const states = [
        { slug: 'a', status: 'parallel_running' },
        { slug: 'b', status: 'parallel_running' }
      ];
      const updated = parallel.abortFeature(states, 'a');
      const aborted = updated.find(s => s.slug === 'a');
      const running = updated.find(s => s.slug === 'b');
      assert.strictEqual(aborted.status, 'aborted');
      assert.strictEqual(running.status, 'parallel_running');
    });

    it('T-UC-1.2: can abort all features', () => {
      if (!parallel) return;
      const states = [
        { slug: 'a', status: 'parallel_running' },
        { slug: 'b', status: 'parallel_running' }
      ];
      const updated = parallel.abortAll(states);
      assert.ok(updated.every(s => s.status === 'aborted'));
    });

    it('T-UC-1.3: aborted worktrees marked for cleanup', () => {
      if (!parallel) return;
      const state = { slug: 'test', status: 'aborted' };
      assert.strictEqual(parallel.shouldCleanupWorktree(state), true);
    });
  });
});
