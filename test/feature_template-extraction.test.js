import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATES_DIR = '.blueprint/templates';
const AGENTS_DIR = '.blueprint/agents';

const STORY_TEMPLATE_PATH = join(TEMPLATES_DIR, 'STORY_TEMPLATE.md');
const TEST_TEMPLATE_PATH = join(TEMPLATES_DIR, 'TEST_TEMPLATE.md');
const CASS_SPEC_PATH = join(AGENTS_DIR, 'AGENT_BA_CASS.md');
const NIGEL_SPEC_PATH = join(AGENTS_DIR, 'AGENT_TESTER_NIGEL.md');

function readFile(filepath) {
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf-8');
}

function extractYamlFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

function countWorkflowBullets(content) {
  const workflowMatch = content.match(/##\s*Standard workflow[\s\S]*?(?=##\s*[A-Z]|$)/i);
  if (!workflowMatch) return 0;
  const bullets = workflowMatch[0].match(/^[-*]\s+/gm) || [];
  return bullets.length;
}

function countNonBlankLines(content) {
  return content.split('\n').filter(line => line.trim().length > 0).length;
}

describe('Template File Existence', () => {

  it('T-1.1: STORY_TEMPLATE.md exists in templates directory', () => {
    assert.ok(existsSync(STORY_TEMPLATE_PATH),
      'STORY_TEMPLATE.md should exist at .blueprint/templates/');
  });

  it('T-1.2: TEST_TEMPLATE.md exists in templates directory', () => {
    assert.ok(existsSync(TEST_TEMPLATE_PATH),
      'TEST_TEMPLATE.md should exist at .blueprint/templates/');
  });

  it('T-1.3: Existing FEATURE_SPEC.md template is preserved', () => {
    const featureSpecPath = join(TEMPLATES_DIR, 'FEATURE_SPEC.md');
    assert.ok(existsSync(featureSpecPath),
      'FEATURE_SPEC.md should still exist in templates directory');
  });

  it('T-1.4: Existing SYSTEM_SPEC.md template is preserved', () => {
    const systemSpecPath = join(TEMPLATES_DIR, 'SYSTEM_SPEC.md');
    assert.ok(existsSync(systemSpecPath),
      'SYSTEM_SPEC.md should still exist in templates directory');
  });
});

describe('Template Content Validity', () => {

  it('T-2.1: STORY_TEMPLATE contains user story structure elements', () => {
    const content = readFile(STORY_TEMPLATE_PATH);
    assert.ok(content, 'STORY_TEMPLATE.md should be readable');

    assert.ok(/User story|As a .* I want/i.test(content),
      'Template should contain user story format');
    assert.ok(/Acceptance criteria|AC-\d/i.test(content),
      'Template should contain acceptance criteria section');
    assert.ok(/Given.*When.*Then|precondition.*action.*result/i.test(content),
      'Template should contain Given/When/Then format');
  });

  it('T-2.2: TEST_TEMPLATE contains test output format sections', () => {
    const content = readFile(TEST_TEMPLATE_PATH);
    assert.ok(content, 'TEST_TEMPLATE.md should be readable');

    assert.ok(/test|describe|it\(/i.test(content),
      'Template should contain test structure guidance');
    assert.ok(/output|produce|write/i.test(content),
      'Template should describe output expectations');
  });

  it('T-2.3: STORY_TEMPLATE has substantial content (40+ lines)', () => {
    const content = readFile(STORY_TEMPLATE_PATH);
    assert.ok(content, 'STORY_TEMPLATE.md should be readable');

    const lineCount = countNonBlankLines(content);
    assert.ok(lineCount >= 40,
      `STORY_TEMPLATE should have at least 40 non-blank lines, found ${lineCount}`);
  });

  it('T-2.4: TEST_TEMPLATE has meaningful content (20+ lines)', () => {
    const content = readFile(TEST_TEMPLATE_PATH);
    assert.ok(content, 'TEST_TEMPLATE.md should be readable');

    const lineCount = countNonBlankLines(content);
    assert.ok(lineCount >= 20,
      `TEST_TEMPLATE should have at least 20 non-blank lines, found ${lineCount}`);
  });
});

describe('Agent Specs Reference Templates', () => {

  it('T-3.1: AGENT_BA_CASS.md references STORY_TEMPLATE by path', () => {
    const content = readFile(CASS_SPEC_PATH);
    assert.ok(content, 'AGENT_BA_CASS.md should be readable');

    assert.ok(/STORY_TEMPLATE\.md|\.blueprint\/templates\/.*story/i.test(content),
      'Cass spec should reference STORY_TEMPLATE.md');
  });

  it('T-3.2: AGENT_TESTER_NIGEL.md references TEST_TEMPLATE by path', () => {
    const content = readFile(NIGEL_SPEC_PATH);
    assert.ok(content, 'AGENT_TESTER_NIGEL.md should be readable');

    assert.ok(/TEST_TEMPLATE\.md|\.blueprint\/templates\/.*test/i.test(content),
      'Nigel spec should reference TEST_TEMPLATE.md');
  });

  it('T-3.3: References use relative path format', () => {
    const cassContent = readFile(CASS_SPEC_PATH);
    const nigelContent = readFile(NIGEL_SPEC_PATH);

    assert.ok(cassContent && nigelContent, 'Agent specs should be readable');

    const pathPattern = /\.blueprint\/templates\/|templates\//;
    const hasPathRef = pathPattern.test(cassContent) || pathPattern.test(nigelContent);
    assert.ok(hasPathRef, 'At least one agent spec should use path-style reference');
  });
});

describe('Workflow Section Condensation', () => {

  it('T-4.1: Cass workflow section is condensed (max 15 top-level bullets)', () => {
    const content = readFile(CASS_SPEC_PATH);
    assert.ok(content, 'AGENT_BA_CASS.md should be readable');

    const bulletCount = countWorkflowBullets(content);
    // After condensation, workflow should have fewer bullets
    // Original may have many steps; condensed should be ~10 or fewer top-level
    assert.ok(bulletCount <= 15,
      `Cass workflow should have max 15 top-level bullets, found ${bulletCount}`);
  });

  it('T-4.2: Nigel workflow section is condensed (max 15 top-level bullets)', () => {
    const content = readFile(NIGEL_SPEC_PATH);
    assert.ok(content, 'AGENT_TESTER_NIGEL.md should be readable');

    const bulletCount = countWorkflowBullets(content);
    assert.ok(bulletCount <= 15,
      `Nigel workflow should have max 15 top-level bullets, found ${bulletCount}`);
  });
});

describe('Template Content Not Duplicated', () => {

  it('T-5.1: Cass spec does not contain full story template inline', () => {
    const content = readFile(CASS_SPEC_PATH);
    assert.ok(content, 'AGENT_BA_CASS.md should be readable');

    // After extraction, the verbose template block should be removed
    // Look for signs of extraction: no long markdown code block with template
    const templateBlockPattern = /```markdown\n#\s*Screen\s*\[N\]/;
    const hasInlineTemplate = templateBlockPattern.test(content);

    // This test expects the template to be extracted
    // If still inline, the feature is not complete
    assert.ok(!hasInlineTemplate,
      'Cass spec should not contain full story template inline after extraction');
  });

  it('T-5.2: Nigel spec does not contain verbose output format inline', () => {
    const content = readFile(NIGEL_SPEC_PATH);
    assert.ok(content, 'AGENT_TESTER_NIGEL.md should be readable');

    // Count lines in "Outputs you must produce" section
    const outputSection = content.match(/##\s*Outputs you must produce[\s\S]*?(?=##\s*\d|$)/i);
    if (outputSection) {
      const sectionLines = countNonBlankLines(outputSection[0]);
      // After extraction, output section should be brief (reference only)
      assert.ok(sectionLines <= 20,
        `Nigel output section should be brief after extraction, found ${sectionLines} lines`);
    }
  });
});

describe('Agent Spec Integrity', () => {

  it('T-6.1: AGENT_BA_CASS.md has valid YAML frontmatter', () => {
    const content = readFile(CASS_SPEC_PATH);
    assert.ok(content, 'AGENT_BA_CASS.md should be readable');

    const frontmatter = extractYamlFrontmatter(content);
    assert.ok(frontmatter, 'Cass spec should have YAML frontmatter');
    assert.ok(/name:\s*Cass/i.test(frontmatter), 'Frontmatter should contain name: Cass');
    assert.ok(/role:/i.test(frontmatter), 'Frontmatter should contain role field');
  });

  it('T-6.2: AGENT_TESTER_NIGEL.md has valid YAML frontmatter', () => {
    const content = readFile(NIGEL_SPEC_PATH);
    assert.ok(content, 'AGENT_TESTER_NIGEL.md should be readable');

    const frontmatter = extractYamlFrontmatter(content);
    assert.ok(frontmatter, 'Nigel spec should have YAML frontmatter');
    assert.ok(/name:\s*Nigel/i.test(frontmatter), 'Frontmatter should contain name: Nigel');
    assert.ok(/role:/i.test(frontmatter), 'Frontmatter should contain role field');
  });

  it('T-6.3: Agent specs still reference GUARDRAILS.md', () => {
    const cassContent = readFile(CASS_SPEC_PATH);
    const nigelContent = readFile(NIGEL_SPEC_PATH);

    assert.ok(cassContent && nigelContent, 'Agent specs should be readable');

    assert.ok(/GUARDRAILS\.md/i.test(cassContent),
      'Cass spec should still reference GUARDRAILS.md');
    assert.ok(/GUARDRAILS\.md/i.test(nigelContent),
      'Nigel spec should still reference GUARDRAILS.md');
  });

  it('T-6.4: Agent specs retain core identity sections', () => {
    const cassContent = readFile(CASS_SPEC_PATH);
    const nigelContent = readFile(NIGEL_SPEC_PATH);

    assert.ok(cassContent && nigelContent, 'Agent specs should be readable');

    assert.ok(/Who are you\?|Your name is/i.test(cassContent),
      'Cass spec should retain identity section');
    assert.ok(/Who are you\?|Your name is/i.test(nigelContent),
      'Nigel spec should retain identity section');

    assert.ok(/Your job is to/i.test(cassContent),
      'Cass spec should retain job description');
    assert.ok(/Your job is to/i.test(nigelContent),
      'Nigel spec should retain job description');
  });
});
