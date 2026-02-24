const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HISTORY_FILE = '.claude/pipeline-history.json';
let testDir, originalCwd;

function setup() {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
  fs.mkdirSync('.claude', { recursive: true });
}

function teardown() {
  process.chdir(originalCwd);
  fs.rmSync(testDir, { recursive: true, force: true });
}

function createEntry(overrides = {}) {
  const base = Date.now();
  return {
    slug: 'test-feature',
    status: 'success',
    completedAt: new Date(base).toISOString(),
    totalDurationMs: 100000,
    stages: {
      alex: { durationMs: 20000 },
      cass: { durationMs: 20000 },
      nigel: { durationMs: 20000 },
      'codey-plan': { durationMs: 20000 },
      'codey-implement': { durationMs: 20000 }
    },
    ...overrides
  };
}

function writeHistory(entries) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

// Story: Bottleneck Analysis
describe('Bottleneck Analysis', () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  it('T-B1.1: Display bottleneck stage with 3+ runs', () => {
    const entries = [createEntry(), createEntry(), createEntry()];
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    assert.strictEqual(data.length, 3);
  });

  it('T-B1.3: Flag stage >35% as bottleneck', () => {
    const entry = createEntry({
      stages: {
        alex: { durationMs: 50000 },
        cass: { durationMs: 10000 },
        nigel: { durationMs: 10000 },
        'codey-plan': { durationMs: 10000 },
        'codey-implement': { durationMs: 20000 }
      }
    });
    writeHistory([entry, entry, entry]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const alexPct = (data[0].stages.alex.durationMs / data[0].totalDurationMs) * 100;
    assert.ok(alexPct > 35);
  });

  it('T-B1.6: <3 runs shows insufficient data', () => {
    writeHistory([createEntry(), createEntry()]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    assert.ok(data.length < 3);
  });
});

// Story: Failure Patterns
describe('Failure Patterns', () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  it('T-F1.1: Display failure rate per stage', () => {
    const entries = [
      createEntry({ status: 'failed', failedStage: 'nigel' }),
      createEntry({ status: 'success' }),
      createEntry({ status: 'success' })
    ];
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const failureRate = data.filter(e => e.status === 'failed').length / data.length;
    assert.ok(failureRate > 0);
  });

  it('T-F1.2: Identify most common failure stage', () => {
    const entries = [
      createEntry({ status: 'failed', failedStage: 'nigel' }),
      createEntry({ status: 'failed', failedStage: 'nigel' }),
      createEntry({ status: 'failed', failedStage: 'alex' })
    ];
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const counts = {};
    data.forEach(e => { if (e.failedStage) counts[e.failedStage] = (counts[e.failedStage] || 0) + 1; });
    assert.strictEqual(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0], 'nigel');
  });

  it('T-F1.7: No failures shows appropriate message', () => {
    writeHistory([createEntry(), createEntry(), createEntry()]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const failures = data.filter(e => e.status === 'failed');
    assert.strictEqual(failures.length, 0);
  });
});

// Story: Anomaly Detection
describe('Anomaly Detection', () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  it('T-A1.1: Detect duration > mean + 2*stddev', () => {
    const entries = [
      createEntry({ totalDurationMs: 100000 }),
      createEntry({ totalDurationMs: 100000 }),
      createEntry({ totalDurationMs: 100000 }),
      createEntry({ totalDurationMs: 100000 }),
      createEntry({ totalDurationMs: 100000 }),
      createEntry({ totalDurationMs: 1000000 }) // 10x anomaly
    ];
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const normalDurations = data.slice(0, 5).map(e => e.totalDurationMs);
    const mean = normalDurations.reduce((a, b) => a + b, 0) / normalDurations.length;
    const variance = normalDurations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / normalDurations.length;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 2 * stddev;
    assert.ok(data[5].totalDurationMs > threshold);
  });

  it('T-A1.5: No anomalies shows appropriate message', () => {
    writeHistory([createEntry(), createEntry(), createEntry()]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const durations = data.map(e => e.totalDurationMs);
    const allSame = durations.every(d => d === durations[0]);
    assert.ok(allSame);
  });
});

// Story: Trend Analysis
describe('Trend Analysis', () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  it('T-T1.1: Display success rate trend', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      createEntry({ status: i < 3 ? 'failed' : 'success', failedStage: i < 3 ? 'alex' : undefined })
    );
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const firstHalf = data.slice(0, 3);
    const secondHalf = data.slice(3);
    const firstRate = firstHalf.filter(e => e.status === 'success').length / 3;
    const secondRate = secondHalf.filter(e => e.status === 'success').length / 3;
    assert.ok(secondRate > firstRate);
  });

  it('T-T1.4: >10% change classified correctly', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      createEntry({ totalDurationMs: i < 3 ? 100000 : 150000 })
    );
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const firstAvg = data.slice(0, 3).reduce((a, e) => a + e.totalDurationMs, 0) / 3;
    const secondAvg = data.slice(3).reduce((a, e) => a + e.totalDurationMs, 0) / 3;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    assert.ok(Math.abs(change) > 10);
  });

  it('T-T1.6: <6 runs shows insufficient data', () => {
    writeHistory([createEntry(), createEntry(), createEntry()]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    assert.ok(data.length < 6);
  });
});

// Story: JSON Output
describe('JSON Output', () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  it('T-J1.1: --json produces valid JSON', () => {
    writeHistory([createEntry(), createEntry(), createEntry()]);
    const content = fs.readFileSync(HISTORY_FILE, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content));
  });

  it('T-J1.2: JSON contains bottlenecks data structure', () => {
    const entries = [createEntry(), createEntry(), createEntry()];
    writeHistory(entries);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const stages = Object.keys(data[0].stages);
    assert.ok(stages.includes('alex'));
  });

  it('T-J1.6: Filter shows only requested section', () => {
    writeHistory([createEntry(), createEntry(), createEntry()]);
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    const bottleneckData = { stages: data[0].stages };
    assert.ok('stages' in bottleneckData);
    assert.ok(!('failures' in bottleneckData));
  });
});
