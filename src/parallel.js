'use strict';

const path = require('path');

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

module.exports = {
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
  abortAll
};
