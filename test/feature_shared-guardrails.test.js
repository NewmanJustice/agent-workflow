import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT_DIR, '.blueprint', 'agents');
const GUARDRAILS_PATH = path.join(AGENTS_DIR, 'GUARDRAILS.md');

const AGENT_FILES = [
  'AGENT_SPECIFICATION_ALEX.md',
  'AGENT_BA_CASS.md',
  'AGENT_TESTER_NIGEL.md',
  'AGENT_DEVELOPER_CODEY.md'
];

const GUARDRAIL_SECTIONS = [
  'Allowed Sources',
  'Prohibited Sources',
  'Citation and Traceability',
  'Confidentiality',
  'Handling Ambiguity and Escalation',
  'Shared Anti-Patterns'
];

const GUARDRAILS_REFERENCE_PATTERN = /GUARDRAILS\.md|guardrails/i;
const INLINE_GUARDRAILS_PATTERN = /^##\s*Guardrails\s*$/m;

describe('Story: Extract Guardrails to Shared File', () => {

  describe('AC-1: Shared guardrails file exists', () => {

    it('T-1.1: GUARDRAILS.md exists at .blueprint/agents/GUARDRAILS.md', () => {
      assert.ok(
        fs.existsSync(GUARDRAILS_PATH),
        `Expected GUARDRAILS.md to exist at ${GUARDRAILS_PATH}`
      );
    });

    it('T-1.2: File contains all required guardrail sections', () => {
      const content = fs.readFileSync(GUARDRAILS_PATH, 'utf-8');

      for (const section of GUARDRAIL_SECTIONS) {
        assert.match(
          content,
          new RegExp(section, 'i'),
          `Expected GUARDRAILS.md to contain "${section}" section`
        );
      }
    });
  });

  describe('AC-2: Agent specs reference shared file', () => {

    it('T-2.1: AGENT_SPECIFICATION_ALEX.md references GUARDRAILS.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_SPECIFICATION_ALEX.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.match(content, GUARDRAILS_REFERENCE_PATTERN);
    });

    it('T-2.2: AGENT_BA_CASS.md references GUARDRAILS.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_BA_CASS.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.match(content, GUARDRAILS_REFERENCE_PATTERN);
    });

    it('T-2.3: AGENT_TESTER_NIGEL.md references GUARDRAILS.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_TESTER_NIGEL.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.match(content, GUARDRAILS_REFERENCE_PATTERN);
    });

    it('T-2.4: AGENT_DEVELOPER_CODEY.md references GUARDRAILS.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_DEVELOPER_CODEY.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.match(content, GUARDRAILS_REFERENCE_PATTERN);
    });
  });

  describe('AC-3: Guardrails content is identical', () => {

    it('T-3.1: GUARDRAILS.md contains complete guardrails structure', () => {
      const content = fs.readFileSync(GUARDRAILS_PATH, 'utf-8');

      assert.match(content, /Allowed Sources/i);
      assert.match(content, /Prohibited Sources/i);
      assert.match(content, /Citation and Traceability/i);
      assert.match(content, /Do not use/i);
      assert.match(content, /Escalat/i);
    });
  });

  describe('AC-4: Agent specs remain functional', () => {

    it('T-4.1: Agent spec guardrails reference is resolvable', () => {
      const alexPath = path.join(AGENTS_DIR, 'AGENT_SPECIFICATION_ALEX.md');
      assert.ok(fs.existsSync(alexPath), 'Agent spec must exist');
      assert.ok(fs.existsSync(GUARDRAILS_PATH), 'Referenced GUARDRAILS.md must exist');
    });
  });

  describe('AC-5: No duplicate guardrails remain', () => {

    it('T-5.1: No inline guardrails section in AGENT_SPECIFICATION_ALEX.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_SPECIFICATION_ALEX.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasInlineGuardrails = INLINE_GUARDRAILS_PATTERN.test(content) &&
        content.includes('### Allowed Sources') &&
        content.includes('### Prohibited Sources');
      assert.ok(!hasInlineGuardrails, 'Should not contain inline guardrails section');
    });

    it('T-5.2: No inline guardrails section in AGENT_BA_CASS.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_BA_CASS.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasInlineGuardrails = INLINE_GUARDRAILS_PATTERN.test(content) &&
        content.includes('### Allowed Sources') &&
        content.includes('### Prohibited Sources');
      assert.ok(!hasInlineGuardrails, 'Should not contain inline guardrails section');
    });

    it('T-5.3: No inline guardrails section in AGENT_TESTER_NIGEL.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_TESTER_NIGEL.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasInlineGuardrails = INLINE_GUARDRAILS_PATTERN.test(content) &&
        content.includes('### Allowed Sources') &&
        content.includes('### Prohibited Sources');
      assert.ok(!hasInlineGuardrails, 'Should not contain inline guardrails section');
    });

    it('T-5.4: No inline guardrails section in AGENT_DEVELOPER_CODEY.md', () => {
      const filePath = path.join(AGENTS_DIR, 'AGENT_DEVELOPER_CODEY.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasInlineGuardrails = INLINE_GUARDRAILS_PATTERN.test(content) &&
        content.includes('### Allowed Sources') &&
        content.includes('### Prohibited Sources');
      assert.ok(!hasInlineGuardrails, 'Should not contain inline guardrails section');
    });
  });
});

describe('Story: Update Init/Update Commands for Shared Guardrails', () => {

  const TEST_PROJECT_DIR = path.join(ROOT_DIR, 'test', 'fixtures', 'test-project-guardrails');

  before(() => {
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_PROJECT_DIR, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true });
    }
  });

  describe('AC-1: Init copies GUARDRAILS.md', () => {

    it('T-6.1: Init copies GUARDRAILS.md to target .blueprint/agents/', () => {
      execSync(`node ${path.join(ROOT_DIR, 'bin', 'cli.js')} init`, {
        cwd: TEST_PROJECT_DIR,
        stdio: 'pipe'
      });

      const targetGuardrailsPath = path.join(TEST_PROJECT_DIR, '.blueprint', 'agents', 'GUARDRAILS.md');
      assert.ok(
        fs.existsSync(targetGuardrailsPath),
        'GUARDRAILS.md should be copied to target project'
      );
    });
  });

  describe('AC-2: Update replaces GUARDRAILS.md', () => {

    it('T-7.1: Update replaces GUARDRAILS.md in target', () => {
      const targetGuardrailsPath = path.join(TEST_PROJECT_DIR, '.blueprint', 'agents', 'GUARDRAILS.md');

      fs.writeFileSync(targetGuardrailsPath, '# Modified content');

      execSync(`node ${path.join(ROOT_DIR, 'bin', 'cli.js')} update`, {
        cwd: TEST_PROJECT_DIR,
        stdio: 'pipe'
      });

      const content = fs.readFileSync(targetGuardrailsPath, 'utf-8');
      assert.ok(
        !content.includes('# Modified content'),
        'GUARDRAILS.md should be replaced, not preserved'
      );
    });
  });

  describe('AC-3: Update preserves user content directories', () => {

    it('T-8.1: Update preserves features/ directory', () => {
      const featuresDir = path.join(TEST_PROJECT_DIR, '.blueprint', 'features');
      const testFeatureFile = path.join(featuresDir, 'user-feature.md');

      fs.mkdirSync(featuresDir, { recursive: true });
      fs.writeFileSync(testFeatureFile, '# User created feature');

      execSync(`node ${path.join(ROOT_DIR, 'bin', 'cli.js')} update`, {
        cwd: TEST_PROJECT_DIR,
        stdio: 'pipe'
      });

      assert.ok(
        fs.existsSync(testFeatureFile),
        'User feature file should be preserved after update'
      );
    });

    it('T-8.2: Update preserves system_specification/ directory', () => {
      const sysSpecDir = path.join(TEST_PROJECT_DIR, '.blueprint', 'system_specification');
      const testSpecFile = path.join(sysSpecDir, 'SYSTEM_SPEC.md');

      fs.mkdirSync(sysSpecDir, { recursive: true });
      fs.writeFileSync(testSpecFile, '# User system specification');

      execSync(`node ${path.join(ROOT_DIR, 'bin', 'cli.js')} update`, {
        cwd: TEST_PROJECT_DIR,
        stdio: 'pipe'
      });

      const content = fs.readFileSync(testSpecFile, 'utf-8');
      assert.ok(
        content.includes('# User system specification'),
        'User system specification should be preserved after update'
      );
    });
  });

  describe('AC-4: Agent specs and GUARDRAILS.md are both present', () => {

    it('T-9.1: Agent specs and GUARDRAILS.md are both present after init', () => {
      const agentsDir = path.join(TEST_PROJECT_DIR, '.blueprint', 'agents');

      assert.ok(
        fs.existsSync(path.join(agentsDir, 'GUARDRAILS.md')),
        'GUARDRAILS.md should exist'
      );

      for (const agentFile of AGENT_FILES) {
        assert.ok(
          fs.existsSync(path.join(agentsDir, agentFile)),
          `${agentFile} should exist alongside GUARDRAILS.md`
        );
      }
    });
  });

  describe('AC-5: Backward compatibility', () => {

    it('T-10.1: Old inline guardrails replaced with reference on update', () => {
      const agentsDir = path.join(TEST_PROJECT_DIR, '.blueprint', 'agents');

      for (const agentFile of AGENT_FILES) {
        const filePath = path.join(agentsDir, agentFile);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const hasInlineGuardrails = content.includes('## Guardrails') &&
            content.includes('### Allowed Sources') &&
            content.includes('### Prohibited Sources');

          assert.ok(
            !hasInlineGuardrails,
            `${agentFile} should not contain inline guardrails after update`
          );
        }
      }
    });
  });
});
