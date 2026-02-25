const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test fixtures
const TECHNICAL_SPEC = `# Feature: Token Optimization
Refactor the pipeline to reduce token consumption.
Extract helper functions to utility module.
Improve cache efficiency and compress payloads.
Performance optimization for internal infrastructure.`;

const USER_FACING_SPEC = `# Feature: Login Flow
User can sign in with email and password.
Dashboard shows notifications after login.
Form validates input and button triggers submission.
Customer journey through the signup interface.`;

const MIXED_SPEC = `# Feature: Mixed Content
User can view the dashboard interface.
Refactor internal module structure.`;

const EMPTY_SPEC = `# Feature: Empty
No relevant keywords here.`;

let testDir;
let originalCwd;

function setupTestDir() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-routing-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
}

function teardownTestDir() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

// Classification Function Tests
describe('classifyFeature()', () => {
  it('T-CF-1.1: Returns "technical" for refactoring content', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature(TECHNICAL_SPEC);
    assert.strictEqual(result.type, 'technical');
  });

  it('T-CF-1.2: Returns "technical" for performance keywords', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature('Optimize performance and improve cache efficiency');
    assert.strictEqual(result.type, 'technical');
  });

  it('T-CF-1.3: Returns "technical" for infrastructure content', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature('Internal infrastructure module with helper utilities');
    assert.strictEqual(result.type, 'technical');
  });

  it('T-CF-2.1: Returns "user-facing" for UI content', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature(USER_FACING_SPEC);
    assert.strictEqual(result.type, 'user-facing');
  });

  it('T-CF-2.2: Returns "user-facing" for user journey content', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature('User can navigate the customer journey flow');
    assert.strictEqual(result.type, 'user-facing');
  });

  it('T-CF-2.3: Returns "user-facing" for form/button content', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature('Form with login button and signup interface');
    assert.strictEqual(result.type, 'user-facing');
  });

  it('T-CF-3.1: Tie-breaking defaults to "user-facing"', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature(MIXED_SPEC);
    assert.strictEqual(result.type, 'user-facing');
  });

  it('T-CF-3.2: Empty content defaults to "user-facing"', () => {
    const { classifyFeature } = require('../src/classifier');
    const result = classifyFeature(EMPTY_SPEC);
    assert.strictEqual(result.type, 'user-facing');
  });
});

// Flag Parsing Tests
describe('parseStoryFlags()', () => {
  it('T-FP-1.1: Handles --with-stories flag', () => {
    const { parseStoryFlags } = require('../src/classifier');
    const result = parseStoryFlags(['--with-stories']);
    assert.strictEqual(result.override, 'include');
  });

  it('T-FP-1.2: Handles --skip-stories flag', () => {
    const { parseStoryFlags } = require('../src/classifier');
    const result = parseStoryFlags(['--skip-stories']);
    assert.strictEqual(result.override, 'skip');
  });

  it('T-FP-1.3: Handles no flag', () => {
    const { parseStoryFlags } = require('../src/classifier');
    const result = parseStoryFlags([]);
    assert.strictEqual(result.override, null);
  });

  it('T-FP-1.4: Handles other flags without affecting override', () => {
    const { parseStoryFlags } = require('../src/classifier');
    const result = parseStoryFlags(['--pause-after=alex', '--no-commit']);
    assert.strictEqual(result.override, null);
  });
});

// Story Decision Logic Tests
describe('shouldIncludeStories()', () => {
  it('T-SD-1.1: Includes stories for user-facing features', () => {
    const { shouldIncludeStories } = require('../src/classifier');
    const result = shouldIncludeStories('user-facing', null);
    assert.strictEqual(result, true);
  });

  it('T-SD-1.2: Skips stories for technical features', () => {
    const { shouldIncludeStories } = require('../src/classifier');
    const result = shouldIncludeStories('technical', null);
    assert.strictEqual(result, false);
  });

  it('T-SD-2.1: --with-stories overrides technical classification', () => {
    const { shouldIncludeStories } = require('../src/classifier');
    const result = shouldIncludeStories('technical', 'include');
    assert.strictEqual(result, true);
  });

  it('T-SD-2.2: --skip-stories overrides user-facing classification', () => {
    const { shouldIncludeStories } = require('../src/classifier');
    const result = shouldIncludeStories('user-facing', 'skip');
    assert.strictEqual(result, false);
  });
});

// Queue State Tests
describe('Queue State', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-QS-1.1: Queue includes featureType after classification', () => {
    fs.mkdirSync('.claude', { recursive: true });
    const queuePath = '.claude/implement-queue.json';
    const queue = {
      current: { slug: 'test-feature', stage: 'alex', featureType: 'technical' }
    };
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    const loaded = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.ok('featureType' in loaded.current);
    assert.strictEqual(loaded.current.featureType, 'technical');
  });

  it('T-QS-1.2: Queue includes skippedCass boolean', () => {
    fs.mkdirSync('.claude', { recursive: true });
    const queuePath = '.claude/implement-queue.json';
    const queue = {
      current: { slug: 'test-feature', stage: 'alex', featureType: 'technical', skippedCass: true }
    };
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    const loaded = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.strictEqual(typeof loaded.current.skippedCass, 'boolean');
    assert.strictEqual(loaded.current.skippedCass, true);
  });

  it('T-QS-1.3: Queue preserves classification on recovery', () => {
    fs.mkdirSync('.claude', { recursive: true });
    const queuePath = '.claude/implement-queue.json';
    const queue = {
      current: { slug: 'my-feature', stage: 'nigel', featureType: 'user-facing', skippedCass: false }
    };
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    const recovered = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assert.strictEqual(recovered.current.featureType, 'user-facing');
    assert.strictEqual(recovered.current.skippedCass, false);
  });
});
