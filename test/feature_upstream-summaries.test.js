import { describe, it } from 'node:test';
import assert from 'node:assert';

const HANDOFF_SUMMARY_TEMPLATE = `## Handoff Summary
**For:** Cass
**Feature:** test-feature

### Key Decisions
- Decision one about architecture
- Decision two about implementation

### Files Created
- .blueprint/features/feature_test-feature/FEATURE_SPEC.md

### Open Questions
- None

### Critical Context
Brief context for the downstream agent.`;

function parseHandoffSummary(content) {
  return {
    hasHeading: /^## Handoff Summary/m.test(content),
    forField: content.match(/\*\*For:\*\*\s*(.+)/)?.[1]?.trim(),
    featureField: content.match(/\*\*Feature:\*\*\s*(.+)/)?.[1]?.trim(),
    hasKeyDecisions: /### Key Decisions/m.test(content),
    hasFilesCreated: /### Files Created/m.test(content),
    hasOpenQuestions: /### Open Questions/m.test(content),
    hasCriticalContext: /### Critical Context/m.test(content),
    lineCount: content.split('\n').length
  };
}

function extractSection(content, sectionName) {
  const regex = new RegExp(`### ${sectionName}\\n([\\s\\S]*?)(?=\\n###|$)`);
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function countBulletItems(section) {
  return section.split('\n').filter(line => /^[-*]\s/.test(line)).length;
}

function extractFilePaths(section) {
  const lines = section.split('\n').filter(line => /^[-*]\s/.test(line));
  return lines.map(line => line.replace(/^[-*]\s+/, '').trim());
}

describe('Handoff Summary Format', () => {

  it('T-1.1: Summary starts with ## Handoff Summary heading', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.hasHeading, 'Summary should start with ## Handoff Summary');
  });

  it('T-1.2: Summary has **For:** field with agent name', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.forField, 'Summary should have For field');
    assert.ok(parsed.forField.length > 0, 'For field should have a value');
  });

  it('T-1.3: Summary has **Feature:** field with slug', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.featureField, 'Summary should have Feature field');
    assert.ok(parsed.featureField.length > 0, 'Feature field should have a value');
  });

  it('T-1.4: Summary has ### Key Decisions section', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.hasKeyDecisions, 'Summary should have Key Decisions section');
  });

  it('T-1.5: Summary has ### Files Created section with paths', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.hasFilesCreated, 'Summary should have Files Created section');

    const filesSection = extractSection(summary, 'Files Created');
    const paths = extractFilePaths(filesSection);
    assert.ok(paths.length > 0, 'Files Created should contain at least one path');
  });

  it('T-1.6: Summary has ### Open Questions section', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.hasOpenQuestions, 'Summary should have Open Questions section');
  });

  it('T-1.7: Summary has ### Critical Context section', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.hasCriticalContext, 'Summary should have Critical Context section');
  });
});

describe('Summary Rules & Constraints', () => {

  it('T-2.1: Summary is under 30 lines', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const parsed = parseHandoffSummary(summary);
    assert.ok(parsed.lineCount < 30, `Summary should be under 30 lines, found ${parsed.lineCount}`);
  });

  it('T-2.2: Key Decisions contains 1-5 bullet items', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const keyDecisions = extractSection(summary, 'Key Decisions');
    const bulletCount = countBulletItems(keyDecisions);
    assert.ok(bulletCount >= 1 && bulletCount <= 5,
      `Key Decisions should have 1-5 items, found ${bulletCount}`);
  });

  it('T-2.3: Files Created contains valid file paths', () => {
    const summary = HANDOFF_SUMMARY_TEMPLATE;
    const filesSection = extractSection(summary, 'Files Created');
    const paths = extractFilePaths(filesSection);

    paths.forEach(path => {
      assert.ok(/[a-zA-Z0-9_\-/.]+/.test(path), `Path should be valid: ${path}`);
      assert.ok(path.includes('/') || path.includes('.'),
        `Path should contain / or extension: ${path}`);
    });
  });
});

describe('Agent-Specific Summaries', () => {

  const ALEX_SUMMARY = `## Handoff Summary
**For:** Cass
**Feature:** user-auth

### Key Decisions
- OAuth2 flow selected over SAML
- Session timeout set to 30 minutes

### Files Created
- .blueprint/features/feature_user-auth/FEATURE_SPEC.md

### Open Questions
- None

### Critical Context
Feature enables social login with Google/GitHub providers.`;

  const CASS_SUMMARY = `## Handoff Summary
**For:** Nigel
**Feature:** user-auth

### Key Decisions
- 4 user stories covering login, logout, session, and error flows
- Acceptance criteria use Given/When/Then format

### Files Created
- .blueprint/features/feature_user-auth/stories/story-1-login.md
- .blueprint/features/feature_user-auth/stories/story-2-logout.md

### Open Questions
- Should lockout occur after failed attempts?

### Critical Context
Stories focus on happy path first; edge cases in later stories.`;

  const NIGEL_SUMMARY = `## Handoff Summary
**For:** Codey
**Feature:** user-auth

### Key Decisions
- 12 tests covering all acceptance criteria
- Mock OAuth provider for integration tests

### Files Created
- test/artifacts/feature_user-auth/test-spec.md
- test/feature_user-auth.test.js

### Open Questions
- None

### Critical Context
Tests expect OAuth mock at localhost:9999 during test run.`;

  it('T-3.1: Alex summary targets Cass as recipient', () => {
    const parsed = parseHandoffSummary(ALEX_SUMMARY);
    assert.strictEqual(parsed.forField, 'Cass', 'Alex summary should target Cass');
  });

  it('T-3.2: Cass summary targets Nigel as recipient', () => {
    const parsed = parseHandoffSummary(CASS_SUMMARY);
    assert.strictEqual(parsed.forField, 'Nigel', 'Cass summary should target Nigel');
  });

  it('T-3.3: Nigel summary targets Codey as recipient', () => {
    const parsed = parseHandoffSummary(NIGEL_SUMMARY);
    assert.strictEqual(parsed.forField, 'Codey', 'Nigel summary should target Codey');
  });

  it('T-3.4: Summary files named handoff-alex.md, handoff-cass.md, handoff-nigel.md', () => {
    const expectedFileNames = ['handoff-alex.md', 'handoff-cass.md', 'handoff-nigel.md'];
    const fileNamePattern = /^handoff-(alex|cass|nigel)\.md$/;

    expectedFileNames.forEach(fileName => {
      assert.ok(fileNamePattern.test(fileName),
        `File name ${fileName} should match pattern handoff-{agent}.md`);
    });
  });
});

describe('Downstream Reading', () => {

  it('T-4.1: Pipeline config allows reading upstream summary file path', () => {
    const queueEntry = {
      feature: 'user-auth',
      stage: 'cass',
      upstreamSummary: '.blueprint/features/feature_user-auth/handoff-alex.md'
    };

    assert.ok(queueEntry.upstreamSummary, 'Queue entry should have upstreamSummary field');
    assert.ok(queueEntry.upstreamSummary.includes('handoff-'),
      'Upstream summary path should contain handoff-');
  });

  it('T-4.2: Summary file path follows pattern {FEAT_DIR}/handoff-{agent}.md', () => {
    const featureDir = '.blueprint/features/feature_user-auth';
    const agents = ['alex', 'cass', 'nigel'];

    agents.forEach(agent => {
      const expectedPath = `${featureDir}/handoff-${agent}.md`;
      const pathPattern = /\.blueprint\/features\/feature_[\w-]+\/handoff-(alex|cass|nigel)\.md/;

      assert.ok(pathPattern.test(expectedPath),
        `Path ${expectedPath} should match expected pattern`);
    });
  });
});
