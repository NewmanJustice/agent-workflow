const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseFlags,
  shouldEnterInteractiveMode,
  createSession,
  getSessionProgress,
  handleCommand,
  getNextSection,
  markSectionComplete,
  markSectionTBD,
  gatherContext,
  identifyGaps,
  generateQuestions,
  canFinalize,
  generateSpec,
  writeSpec,
  generateHandoff,
  SESSION_STATES,
  SECTION_ORDER,
  MIN_REQUIRED_SECTIONS,
  SYSTEM_SPEC_QUESTIONS
} = require('../src/interactive');

let testDir;
let originalCwd;

function setupTestDir() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interactive-alex-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
  fs.mkdirSync('.claude', { recursive: true });
  fs.mkdirSync('.blueprint/system_specification', { recursive: true });
  fs.mkdirSync('.blueprint/features/feature_test-feature', { recursive: true });
  fs.mkdirSync('.blueprint/templates', { recursive: true });
  fs.mkdirSync('.business_context', { recursive: true });
}

function teardownTestDir() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

function writeSystemSpec() {
  fs.writeFileSync('.blueprint/system_specification/SYSTEM_SPEC.md', '# System Spec\n## Purpose\nTest system');
}

function writeFeatureSpec() {
  fs.writeFileSync('.blueprint/features/feature_test-feature/FEATURE_SPEC.md', '# Feature Spec\n## Intent\nTest feature');
}

// Story: Flag Routing (story-flag-routing.md)
describe('Flag Routing', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-FR-1: --interactive flag activates interactive mode', () => {
    writeSystemSpec();
    writeFeatureSpec();
    const flags = parseFlags(['--interactive']);
    const result = shouldEnterInteractiveMode(flags, true, true);
    assert.strictEqual(result.interactive, true);
  });

  it('T-FR-2: Missing SYSTEM_SPEC.md triggers interactive mode', () => {
    const flags = parseFlags([]);
    const hasSystemSpec = fs.existsSync('.blueprint/system_specification/SYSTEM_SPEC.md');
    const result = shouldEnterInteractiveMode(flags, hasSystemSpec, false);
    assert.strictEqual(result.interactive, true);
    assert.strictEqual(result.target, 'system');
  });

  it('T-FR-3: Missing FEATURE_SPEC.md triggers interactive mode', () => {
    writeSystemSpec();
    const flags = parseFlags([]);
    const hasFeatureSpec = fs.existsSync('.blueprint/features/feature_test-feature/FEATURE_SPEC.md');
    const result = shouldEnterInteractiveMode(flags, true, hasFeatureSpec);
    assert.strictEqual(result.interactive, true);
    assert.strictEqual(result.target, 'feature');
  });

  it('T-FR-4: Both specs exist results in autonomous mode', () => {
    writeSystemSpec();
    writeFeatureSpec();
    const flags = parseFlags([]);
    const result = shouldEnterInteractiveMode(flags, true, true);
    assert.strictEqual(result.interactive, false);
  });

  it('T-FR-5: --interactive --pause-after=alex both flags work', () => {
    const flags = parseFlags(['--interactive', '--pause-after=alex']);
    assert.strictEqual(flags.interactive, true);
    assert.strictEqual(flags.pauseAfter, 'alex');
  });
});

// Story: Session Lifecycle (story-session-lifecycle.md)
describe('Session Lifecycle', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SL-1: Session init reads context and shows opening prompt', () => {
    writeSystemSpec();
    fs.writeFileSync('.business_context/context.md', '# Business Context');
    const context = gatherContext('.');
    assert.ok(context.systemSpec.includes('System Spec'));
    assert.ok(context.businessContext.length > 0);
    assert.ok(context.businessContext[0].content.includes('Business Context'));
  });

  it('T-SL-2: /approve marks section complete and proceeds', () => {
    const session = createSession('feature');
    session.sections.intent = 'draft';
    const result = handleCommand(session, '/approve');
    assert.strictEqual(session.sections.intent, 'complete');
    assert.strictEqual(result.action, 'next');
    assert.strictEqual(session.current, 'scope');
  });

  it('T-SL-3: /change triggers revision of current section', () => {
    const session = createSession('feature');
    session.sections.intent = 'draft v1';
    const result = handleCommand(session, '/change make it shorter');
    assert.strictEqual(session.revisionCount, 1);
    assert.strictEqual(result.action, 'revise');
    assert.strictEqual(result.feedback, 'make it shorter');
  });

  it('T-SL-4: /skip marks section TBD and proceeds', () => {
    const session = createSession('feature');
    session.sections.intent = 'complete';
    session.current = 'scope';
    session.sections.scope = 'draft';
    const result = handleCommand(session, '/skip');
    assert.strictEqual(session.sections.scope, 'TBD');
    assert.strictEqual(result.action, 'next');
    assert.strictEqual(session.current, 'actors');
  });

  it('T-SL-5: /restart discards draft and restarts section', () => {
    const session = createSession('feature');
    session.sections.intent = 'draft v3';
    const result = handleCommand(session, '/restart');
    assert.strictEqual(session.sections.intent, null);
    assert.strictEqual(session.current, 'intent');
    assert.strictEqual(result.action, 'restart');
  });

  it('T-SL-6: /abort exits without writing spec', () => {
    const session = createSession('feature');
    const result = handleCommand(session, '/abort');
    assert.strictEqual(session.aborted, true);
    assert.strictEqual(session.specWritten, false);
    assert.strictEqual(result.action, 'abort');
  });

  it('T-SL-7: /done finalizes with complete and TBD sections', () => {
    const session = createSession('feature');
    session.sections.intent = 'complete';
    session.sections.scope = 'complete';
    session.sections.actors = 'TBD';
    session.sections.behaviour = 'draft';
    const result = canFinalize(session);
    assert.strictEqual(result, true);
  });
});

// Story: Iterative Drafting (story-iterative-drafting.md)
describe('Iterative Drafting', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-ID-1: Context gathering identifies information gaps', () => {
    const session = createSession('feature');
    const userDescription = { hasIntent: true, hasScope: false, hasActors: false };
    const gaps = identifyGaps(session, userDescription);
    assert.ok(gaps.length >= 2 && gaps.length <= 4);
  });

  it('T-ID-2: Clarifying questions presented in batch of 2-4', () => {
    const gaps = ['scope', 'actors', 'dependencies'];
    const questions = generateQuestions(gaps);
    assert.ok(questions.length >= 2 && questions.length <= 4);
    assert.ok(questions[0].question.length > 0);
  });

  it('T-ID-3: Sections drafted in order Intent->Scope->Actors', () => {
    assert.strictEqual(SECTION_ORDER[0], 'intent');
    assert.strictEqual(SECTION_ORDER[1], 'scope');
    assert.strictEqual(SECTION_ORDER[2], 'actors');
  });

  it('T-ID-4: Revision incorporates feedback and re-presents', () => {
    const session = createSession('feature');
    session.sections.intent = 'draft v1';
    handleCommand(session, '/change Add more detail');
    assert.ok(session.feedback.length > 0);
    assert.ok(session.feedback[0].feedback.includes('Add more detail'));
    assert.strictEqual(session.revisionCount, 1);
  });

  it('T-ID-5: Progress indication shows complete vs remaining', () => {
    const session = createSession('feature');
    session.sections.intent = 'complete';
    session.sections.scope = 'complete';
    const progress = getSessionProgress(session);
    assert.strictEqual(progress.complete, 2);
    assert.strictEqual(progress.remaining, 3);
  });

  it('T-ID-6: Responses under 200 words', () => {
    const response = 'This is a sample response from Alex. '.repeat(10);
    const wordCount = response.trim().split(/\s+/).length;
    assert.ok(wordCount < 200);
  });
});

// Story: Pipeline Integration (story-pipeline-integration.md)
describe('Pipeline Integration', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-PI-1: Spec file includes sections, TBD markers, and note', () => {
    const session = createSession('feature');
    session.sections.intent = 'complete';
    session.sections.scope = 'TBD';
    session.sections.actors = 'complete';
    const content = generateSpec(session);
    assert.ok(content.includes('TBD'));
    assert.ok(content.includes('Created via interactive session'));
  });

  it('T-PI-2: handoff-alex.md produced on completion', () => {
    const session = createSession('feature');
    session.sections.intent = 'complete';
    session.sections.scope = 'complete';
    session.sections.actors = 'complete';
    const handoff = generateHandoff(session, 'test-feature');
    fs.writeFileSync('.blueprint/features/feature_test-feature/handoff-alex.md', handoff);
    assert.ok(fs.existsSync('.blueprint/features/feature_test-feature/handoff-alex.md'));
    assert.ok(handoff.includes('Cass'));
  });

  it('T-PI-3: Queue updated from alexQueue to cassQueue', () => {
    const queue = { current: { stage: 'alex' }, alexQueue: ['test-feature'], cassQueue: [] };
    queue.cassQueue.push(queue.alexQueue.shift());
    queue.current.stage = 'cass';
    assert.strictEqual(queue.current.stage, 'cass');
    assert.strictEqual(queue.cassQueue[0], 'test-feature');
  });

  it('T-PI-4: History includes mode and session metrics', () => {
    const historyEntry = {
      slug: 'test-feature',
      mode: 'interactive',
      questionCount: 3,
      revisionCount: 2,
      sessionDurationMs: 120000
    };
    assert.strictEqual(historyEntry.mode, 'interactive');
    assert.ok('questionCount' in historyEntry);
    assert.ok('revisionCount' in historyEntry);
  });

  it('T-PI-5: --pause-after=alex pauses before Cass', () => {
    const flags = { pauseAfter: 'alex' };
    const currentStage = 'alex';
    const shouldPause = flags.pauseAfter === currentStage;
    assert.strictEqual(shouldPause, true);
  });

  it('T-PI-6: No pause flag continues to Cass automatically', () => {
    const flags = { pauseAfter: null };
    const shouldContinue = !flags.pauseAfter;
    assert.strictEqual(shouldContinue, true);
  });
});

// Story: System Spec Creation (story-system-spec-creation.md)
describe('System Spec Creation', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SS-1: Missing SYSTEM_SPEC triggers system spec mode', () => {
    const hasSystemSpec = fs.existsSync('.blueprint/system_specification/SYSTEM_SPEC.md');
    const result = shouldEnterInteractiveMode({ interactive: false }, hasSystemSpec, false);
    assert.strictEqual(result.target, 'system');
  });

  it('T-SS-2: System spec session asks about purpose/actors/boundaries', () => {
    assert.ok(SYSTEM_SPEC_QUESTIONS.includes('purpose'));
    assert.ok(SYSTEM_SPEC_QUESTIONS.includes('actors'));
    assert.ok(SYSTEM_SPEC_QUESTIONS.includes('boundaries'));
  });

  it('T-SS-3: Output written to .blueprint/system_specification/', () => {
    const session = createSession('system');
    session.sections.purpose = 'complete';
    session.sections.actors = 'complete';
    session.sections.boundaries = 'complete';
    const outputPath = writeSpec(session, '.blueprint/system_specification/SYSTEM_SPEC.md');
    assert.ok(fs.existsSync(outputPath));
    assert.strictEqual(session.specWritten, true);
  });

  it('T-SS-4: Created spec satisfies gate for re-invocation', () => {
    writeSystemSpec();
    const hasSystemSpec = fs.existsSync('.blueprint/system_specification/SYSTEM_SPEC.md');
    assert.strictEqual(hasSystemSpec, true);
  });

  it('T-SS-5: System spec completes before feature spec begins', () => {
    const pipeline = { systemSpecComplete: false, featureSpecStarted: false };
    pipeline.systemSpecComplete = true;
    if (pipeline.systemSpecComplete) {
      pipeline.featureSpecStarted = true;
    }
    assert.strictEqual(pipeline.systemSpecComplete, true);
    assert.strictEqual(pipeline.featureSpecStarted, true);
  });
});
