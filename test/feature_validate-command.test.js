const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test fixtures
const REQUIRED_DIRS = ['.blueprint', '.business_context', '.claude/commands'];
const AGENT_FILES = [
  'AGENT_SPECIFICATION_ALEX.md',
  'AGENT_BA_CASS.md',
  'AGENT_TESTER_NIGEL.md',
  'AGENT_DEVELOPER_CODEY.md'
];

let testDir;
let originalCwd;

function setupTestDir() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
}

function teardownTestDir() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

function createFullStructure() {
  fs.mkdirSync('.blueprint/agents', { recursive: true });
  fs.mkdirSync('.blueprint/system_specification', { recursive: true });
  fs.mkdirSync('.business_context', { recursive: true });
  fs.mkdirSync('.claude/commands', { recursive: true });

  fs.writeFileSync('.blueprint/system_specification/SYSTEM_SPEC.md', '# System Spec');
  AGENT_FILES.forEach(f => fs.writeFileSync(`.blueprint/agents/${f}`, '# Agent'));
  fs.writeFileSync('.business_context/context.md', '# Context');
  fs.writeFileSync('.claude/commands/implement-feature.md', '# Skill');
}

// Story: Run Validation (story-run-validation.md)
describe('Run Validation Command', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-RV-1.1: Command executes without throwing exception', async () => {
    const { validate } = require('../src/validate');
    await assert.doesNotReject(async () => await validate());
  });

  it('T-RV-2.1: All six validation checks are performed', async () => {
    createFullStructure();
    const { validate } = require('../src/validate');
    const result = await validate();

    assert.ok(result.checks.length >= 6, 'Should perform at least 6 checks');
    const checkNames = result.checks.map(c => c.name);
    assert.ok(checkNames.some(n => n.includes('director') || n.includes('blueprint')));
    assert.ok(checkNames.some(n => n.includes('system') || n.includes('spec')));
    assert.ok(checkNames.some(n => n.includes('agent')));
    assert.ok(checkNames.some(n => n.includes('business')));
    assert.ok(checkNames.some(n => n.includes('skill')));
    assert.ok(checkNames.some(n => n.includes('node') || n.includes('version')));
  });

  it('T-RV-3.1: Each check produces a status line', async () => {
    createFullStructure();
    const { validate } = require('../src/validate');
    const result = await validate();

    result.checks.forEach(check => {
      assert.ok('passed' in check, `Check ${check.name} should have passed status`);
      assert.ok('name' in check, 'Check should have a name');
    });
  });

  it('T-RV-4.1: Command completes gracefully with missing paths', async () => {
    fs.mkdirSync('.blueprint', { recursive: true });
    const { validate } = require('../src/validate');
    const result = await validate();

    assert.ok(result, 'Should return result object');
    assert.ok(Array.isArray(result.checks), 'Should have checks array');
  });

  it('T-RV-4.2: Command completes gracefully with all paths missing', async () => {
    const { validate } = require('../src/validate');
    const result = await validate();

    assert.ok(result, 'Should return result object even with nothing present');
    assert.strictEqual(result.success, false);
  });

  it('T-RV-5.1: Multiple runs produce same output (idempotent)', async () => {
    createFullStructure();
    const { validate } = require('../src/validate');

    const result1 = await validate();
    const result2 = await validate();

    assert.strictEqual(result1.success, result2.success);
    assert.strictEqual(result1.checks.length, result2.checks.length);
  });

  it('T-RV-5.2: No files created/modified by validate', async () => {
    createFullStructure();
    const filesBefore = fs.readdirSync('.', { recursive: true });

    const { validate } = require('../src/validate');
    await validate();

    const filesAfter = fs.readdirSync('.', { recursive: true });
    assert.deepStrictEqual(filesBefore.sort(), filesAfter.sort());
  });
});

// Story: Success Output (story-success-output.md)
describe('Validation Success Output', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SO-1.1: Checkmark displayed for passed checks', async () => {
    createFullStructure();
    const { validate, formatOutput } = require('../src/validate');
    const result = await validate();
    const output = formatOutput(result, false);

    const passedCheck = result.checks.find(c => c.passed);
    assert.ok(passedCheck, 'Should have at least one passed check');
    assert.ok(output.includes('✓') || output.includes('[PASS]'), 'Should show checkmark or PASS');
  });

  it('T-SO-3.1: ASCII fallback for non-color terminals', async () => {
    createFullStructure();
    const { validate, formatOutput } = require('../src/validate');
    const result = await validate();
    const output = formatOutput(result, false);

    assert.ok(typeof output === 'string', 'Should produce string output');
    assert.ok(output.length > 0, 'Should have output content');
  });

  it('T-SO-4.1: Overall success message when all pass', async () => {
    createFullStructure();
    const { validate, formatOutput } = require('../src/validate');
    const result = await validate();
    const output = formatOutput(result, false);

    if (result.success) {
      assert.ok(
        output.toLowerCase().includes('success') ||
        output.toLowerCase().includes('ready') ||
        output.toLowerCase().includes('pass'),
        'Should show success message'
      );
    }
  });

  it('T-SO-5.1: Exit code 0 when all checks pass', async () => {
    createFullStructure();
    const { validate } = require('../src/validate');
    const result = await validate();

    if (result.checks.every(c => c.passed)) {
      assert.strictEqual(result.exitCode, 0);
    }
  });
});

// Story: Failure Output (story-failure-output.md)
describe('Validation Failure Output', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-FO-1.1: X mark displayed for failed checks', async () => {
    const { validate, formatOutput } = require('../src/validate');
    const result = await validate();
    const output = formatOutput(result, false);

    assert.ok(output.includes('✗') || output.includes('[FAIL]') || output.includes('X'),
      'Should show X mark or FAIL for failures');
  });

  it('T-FO-3.1: Description of what is missing in output', async () => {
    const { validate, formatOutput } = require('../src/validate');
    const result = await validate();
    const output = formatOutput(result, false);

    assert.ok(
      output.includes('.blueprint') || output.includes('Missing'),
      'Should describe what is missing'
    );
  });

  it('T-FO-4.1: Fix suggestion for missing .blueprint', async () => {
    const { validate } = require('../src/validate');
    const result = await validate();

    const blueprintCheck = result.checks.find(c =>
      c.name.toLowerCase().includes('blueprint') || c.name.toLowerCase().includes('director')
    );
    if (blueprintCheck && !blueprintCheck.passed) {
      assert.ok(blueprintCheck.fix, 'Should have fix suggestion');
      assert.ok(blueprintCheck.fix.includes('init'), 'Fix should mention init command');
    }
  });

  it('T-FO-4.2: Fix suggestion for missing agent specs', async () => {
    fs.mkdirSync('.blueprint/agents', { recursive: true });
    const { validate } = require('../src/validate');
    const result = await validate();

    const agentCheck = result.checks.find(c => c.name.toLowerCase().includes('agent'));
    if (agentCheck && !agentCheck.passed) {
      assert.ok(agentCheck.fix, 'Should have fix suggestion for agents');
    }
  });

  it('T-FO-4.3: Fix suggestion for missing skills', async () => {
    fs.mkdirSync('.claude/commands', { recursive: true });
    const { validate } = require('../src/validate');
    const result = await validate();

    const skillCheck = result.checks.find(c => c.name.toLowerCase().includes('skill'));
    if (skillCheck && !skillCheck.passed) {
      assert.ok(skillCheck.fix, 'Should have fix suggestion for skills');
    }
  });

  it('T-FO-4.4: Fix suggestion for empty business context', async () => {
    fs.mkdirSync('.business_context', { recursive: true });
    const { validate } = require('../src/validate');
    const result = await validate();

    const bizCheck = result.checks.find(c => c.name.toLowerCase().includes('business'));
    if (bizCheck && !bizCheck.passed) {
      assert.ok(bizCheck.fix, 'Should have fix suggestion for business context');
      assert.ok(bizCheck.fix.includes('business_context'), 'Fix should mention directory');
    }
  });

  it('T-FO-5.1: Exit code 1 when any check fails', async () => {
    const { validate } = require('../src/validate');
    const result = await validate();

    assert.strictEqual(result.exitCode, 1, 'Exit code should be 1 on failure');
  });

  it('T-FO-6.1: All checks run even if first fails', async () => {
    const { validate } = require('../src/validate');
    const result = await validate();

    assert.ok(result.checks.length >= 6, 'All checks should run regardless of failures');
  });
});

// Story: Node.js Version Check (story-node-version-check.md)
describe('Node.js Version Check', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-NV-1.1: Pass indicator for Node.js 18+', async () => {
    createFullStructure();
    const { validate } = require('../src/validate');
    const result = await validate();

    const nodeCheck = result.checks.find(c =>
      c.name.toLowerCase().includes('node') || c.name.toLowerCase().includes('version')
    );
    assert.ok(nodeCheck, 'Should have Node.js version check');

    const majorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
    if (majorVersion >= 18) {
      assert.strictEqual(nodeCheck.passed, true, 'Should pass on Node 18+');
    }
  });

  it('T-NV-2.2: Current version shown in failure output', async () => {
    const { checkNodeVersion } = require('../src/validate');
    const result = checkNodeVersion();

    if (!result.passed) {
      assert.ok(
        result.message.includes(process.version) || result.details?.includes(process.version),
        'Should show current version in output'
      );
    }
  });

  it('T-NV-4.1: Upgrade guidance in fix suggestions', async () => {
    const { checkNodeVersion } = require('../src/validate');
    const result = checkNodeVersion();

    if (!result.passed) {
      assert.ok(result.fix, 'Should have fix suggestion');
      assert.ok(
        result.fix.toLowerCase().includes('upgrade') || result.fix.includes('18'),
        'Fix should mention upgrade to 18'
      );
    }
  });

  it('T-NV-5.1: Version detected from process.version', async () => {
    const { checkNodeVersion } = require('../src/validate');
    const result = checkNodeVersion();

    assert.ok(result.detectedVersion === process.version ||
              result.message.includes(process.version.slice(1).split('.')[0]),
      'Should detect version from process.version');
  });
});
