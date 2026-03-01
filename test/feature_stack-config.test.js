const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  CONFIG_FILE,
  getDefaultStackConfig,
  readStackConfig,
  writeStackConfig,
  resetStackConfig,
  setStackConfigValue,
  detectStackConfig,
  displayStackConfig
} = require('../src/stack');

let testDir;
let originalCwd;

function setupTestDir() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
  fs.mkdirSync('.claude', { recursive: true });
}

function teardownTestDir() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

// Story: Default Stack Configuration
describe('Default Stack Configuration', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-1: Default config has all expected keys', () => {
    const config = getDefaultStackConfig();
    const expectedKeys = [
      'language', 'runtime', 'packageManager',
      'frameworks', 'testRunner', 'testCommand',
      'linter', 'tools'
    ];
    for (const key of expectedKeys) {
      assert.ok(key in config, `Missing key: ${key}`);
    }
  });

  it('T-SC-2: Default config has empty values', () => {
    const config = getDefaultStackConfig();
    assert.strictEqual(config.language, '');
    assert.strictEqual(config.runtime, '');
    assert.strictEqual(config.packageManager, '');
    assert.deepStrictEqual(config.frameworks, []);
    assert.strictEqual(config.testRunner, '');
    assert.strictEqual(config.testCommand, '');
    assert.strictEqual(config.linter, '');
    assert.deepStrictEqual(config.tools, []);
  });
});

// Story: Read/Write Config
describe('Stack Config Read/Write', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-3: Read/write round-trip preserves data', () => {
    const config = {
      language: 'JavaScript',
      runtime: 'Node.js 18+',
      packageManager: 'npm',
      frameworks: ['express'],
      testRunner: 'jest',
      testCommand: 'npm test',
      linter: 'eslint',
      tools: ['nodemon', 'supertest']
    };
    writeStackConfig(config);
    const loaded = readStackConfig();
    assert.deepStrictEqual(loaded, config);
  });

  it('T-SC-4: Read returns defaults when file missing', () => {
    assert.ok(!fs.existsSync(CONFIG_FILE));
    const config = readStackConfig();
    assert.deepStrictEqual(config, getDefaultStackConfig());
  });

  it('T-SC-5: Read returns defaults on corrupted file', () => {
    fs.writeFileSync(CONFIG_FILE, 'not valid json{{{');
    const config = readStackConfig();
    assert.deepStrictEqual(config, getDefaultStackConfig());
  });
});

// Story: Set Config Values
describe('Stack Config Set Values', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-6: Set string value', () => {
    writeStackConfig(getDefaultStackConfig());
    setStackConfigValue('language', 'Python');
    const config = readStackConfig();
    assert.strictEqual(config.language, 'Python');
  });

  it('T-SC-7: Set array value from JSON string', () => {
    writeStackConfig(getDefaultStackConfig());
    setStackConfigValue('frameworks', '["django","flask"]');
    const config = readStackConfig();
    assert.deepStrictEqual(config.frameworks, ['django', 'flask']);
  });

  it('T-SC-8: Reject unknown keys', () => {
    writeStackConfig(getDefaultStackConfig());
    assert.throws(
      () => setStackConfigValue('unknownKey', 'value'),
      /Unknown config key/
    );
  });

  it('T-SC-9: Reject non-array value for array keys', () => {
    writeStackConfig(getDefaultStackConfig());
    assert.throws(
      () => setStackConfigValue('frameworks', '"not-an-array"'),
      /must be a JSON array/
    );
  });
});

// Story: Reset Config
describe('Stack Config Reset', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-10: Reset restores defaults', () => {
    const custom = getDefaultStackConfig();
    custom.language = 'Rust';
    custom.testRunner = 'cargo test';
    writeStackConfig(custom);
    resetStackConfig();
    const config = readStackConfig();
    assert.deepStrictEqual(config, getDefaultStackConfig());
  });
});

// Story: Auto-Detection - Node.js
describe('Auto-Detection: Node.js', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-11: Detects Node.js from package.json', () => {
    fs.writeFileSync('package.json', JSON.stringify({
      name: 'test-project',
      dependencies: { express: '^4.18.0' },
      devDependencies: { jest: '^29.0.0', eslint: '^8.0.0', nodemon: '^3.0.0' },
      scripts: { test: 'jest' },
      engines: { node: '>=18' }
    }));
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'JavaScript');
    assert.strictEqual(config.runtime, 'Node.js >=18');
    assert.strictEqual(config.packageManager, 'npm');
    assert.ok(config.frameworks.includes('express'));
    assert.strictEqual(config.testRunner, 'jest');
    assert.strictEqual(config.testCommand, 'jest');
    assert.strictEqual(config.linter, 'eslint');
    assert.ok(config.tools.includes('nodemon'));
  });

  it('T-SC-12: Detects TypeScript when tsconfig.json present', () => {
    fs.writeFileSync('package.json', JSON.stringify({
      name: 'ts-project',
      devDependencies: { typescript: '^5.0.0' }
    }));
    fs.writeFileSync('tsconfig.json', '{}');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'TypeScript');
  });

  it('T-SC-13: Detects yarn from yarn.lock', () => {
    fs.writeFileSync('package.json', JSON.stringify({ name: 'yarn-project' }));
    fs.writeFileSync('yarn.lock', '');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.packageManager, 'yarn');
  });

  it('T-SC-14: Detects pnpm from pnpm-lock.yaml', () => {
    fs.writeFileSync('package.json', JSON.stringify({ name: 'pnpm-project' }));
    fs.writeFileSync('pnpm-lock.yaml', '');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.packageManager, 'pnpm');
  });
});

// Story: Auto-Detection - Python
describe('Auto-Detection: Python', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-15: Detects Python from pyproject.toml', () => {
    fs.writeFileSync('pyproject.toml', `
[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 88

[project]
dependencies = ["django>=4.0", "fastapi"]
`);
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'Python');
    assert.strictEqual(config.runtime, 'Python 3.x');
    assert.strictEqual(config.testRunner, 'pytest');
    assert.strictEqual(config.linter, 'ruff');
    assert.ok(config.frameworks.includes('django'));
    assert.ok(config.frameworks.includes('fastapi'));
  });

  it('T-SC-16: Detects Python from requirements.txt', () => {
    fs.writeFileSync('requirements.txt', 'flask==2.3.0\nrequests==2.31.0\n');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'Python');
    assert.strictEqual(config.runtime, 'Python 3.x');
  });
});

// Story: Auto-Detection - Other Languages
describe('Auto-Detection: Other Languages', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-17: Detects Go from go.mod', () => {
    fs.writeFileSync('go.mod', 'module example.com/myapp\n\ngo 1.21\n');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'Go');
    assert.strictEqual(config.testCommand, 'go test ./...');
  });

  it('T-SC-18: Detects Rust from Cargo.toml', () => {
    fs.writeFileSync('Cargo.toml', '[package]\nname = "myapp"\n');
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'Rust');
    assert.strictEqual(config.packageManager, 'cargo');
  });

  it('T-SC-19: Detects Ruby from Gemfile', () => {
    fs.writeFileSync('Gemfile', "source 'https://rubygems.org'\ngem 'rails'\n");
    const config = detectStackConfig(testDir);
    assert.strictEqual(config.language, 'Ruby');
    assert.strictEqual(config.packageManager, 'bundler');
  });

  it('T-SC-20: Returns empty config when no manifest found', () => {
    const config = detectStackConfig(testDir);
    assert.deepStrictEqual(config, getDefaultStackConfig());
  });
});

// Story: Display Config
describe('Display Stack Config', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => teardownTestDir());

  it('T-SC-21: displayStackConfig runs without error', () => {
    writeStackConfig(getDefaultStackConfig());
    assert.doesNotThrow(() => displayStackConfig());
  });
});
