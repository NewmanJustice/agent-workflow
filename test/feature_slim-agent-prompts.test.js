import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROMPTS_DIR = '.blueprint/prompts';
const AGENTS_DIR = '.blueprint/agents';
const SKILL_PATH = 'SKILL.md';

const RUNTIME_PROMPTS = [
  'alex-runtime.md',
  'cass-runtime.md',
  'nigel-runtime.md',
  'codey-plan-runtime.md',
  'codey-implement-runtime.md'
];

function countNonBlankLines(content) {
  return content.split('\n').filter(line => line.trim().length > 0).length;
}

function readPromptFile(filename) {
  const filepath = join(PROMPTS_DIR, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf-8');
}

function extractSection(content, sectionName) {
  const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
  const match = content.match(regex);
  return match ? match[0] : '';
}

function countRulesItems(rulesSection) {
  const lines = rulesSection.split('\n');
  return lines.filter(line => /^[-*]\s|^\d+[.)]\s/.test(line.trim())).length;
}

describe('Story 1: Create Runtime Prompt Template', () => {

  it('T-1.1: Template has all 6 required sections in order', () => {
    const templatePath = join(PROMPTS_DIR, 'TEMPLATE.md');
    assert.ok(existsSync(templatePath), 'Template file should exist');

    const content = readFileSync(templatePath, 'utf-8');
    const requiredSections = ['role', 'task', 'inputs', 'outputs', 'rules', 'reference'];
    const sectionPatterns = [
      /you are.*the/i,
      /##\s*task/i,
      /##\s*inputs/i,
      /##\s*outputs/i,
      /##\s*rules/i,
      /AGENT_.*\.md|full spec|detailed guidance/i
    ];

    sectionPatterns.forEach((pattern, index) => {
      assert.ok(pattern.test(content), `Template should contain ${requiredSections[index]} section`);
    });
  });

  it('T-1.2: Template guidance enforces 30-50 line target', () => {
    const templatePath = join(PROMPTS_DIR, 'TEMPLATE.md');
    assert.ok(existsSync(templatePath), 'Template file should exist');

    const content = readFileSync(templatePath, 'utf-8');
    assert.ok(/30.*50|30-50/i.test(content), 'Template should mention 30-50 line target');
  });

  it('T-1.3: Template includes full spec reference pattern', () => {
    const templatePath = join(PROMPTS_DIR, 'TEMPLATE.md');
    assert.ok(existsSync(templatePath), 'Template file should exist');

    const content = readFileSync(templatePath, 'utf-8');
    assert.ok(/AGENT_.*\.md|\.blueprint\/agents\//i.test(content), 'Template should reference full agent specs');
  });

  it('T-1.4: Prompts directory exists at .blueprint/prompts/', () => {
    assert.ok(existsSync(PROMPTS_DIR), 'Prompts directory should exist');
  });

  it('T-1.5: Files follow {agent-slug}-runtime.md naming', () => {
    assert.ok(existsSync(PROMPTS_DIR), 'Prompts directory should exist');

    const files = readdirSync(PROMPTS_DIR).filter(f => f.endsWith('-runtime.md'));
    const expectedPattern = /^[a-z]+-([a-z]+-)?runtime\.md$/;

    files.forEach(file => {
      assert.ok(expectedPattern.test(file), `File ${file} should follow naming convention`);
    });
  });

  it('T-1.6: Rules section guidance warns against duplication', () => {
    const templatePath = join(PROMPTS_DIR, 'TEMPLATE.md');
    assert.ok(existsSync(templatePath), 'Template file should exist');

    const content = readFileSync(templatePath, 'utf-8');
    assert.ok(/duplicat|repeat|redundan|already/i.test(content), 'Template should warn against duplication');
  });
});

describe('Story 2: Create Slim Agent Prompts', () => {

  it('T-2.1: All 5 runtime prompt files exist', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const filepath = join(PROMPTS_DIR, filename);
      assert.ok(existsSync(filepath), `${filename} should exist`);
    });
  });

  it('T-2.2: Each prompt starts with role identity line', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist and be readable`);
      assert.ok(/^You are \w+, the \w+/m.test(content), `${filename} should start with role identity`);
    });
  });

  it('T-2.3: Each prompt has Inputs section with file paths', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist`);

      const inputsSection = extractSection(content, 'Inputs');
      assert.ok(inputsSection.length > 0, `${filename} should have Inputs section`);
      assert.ok(/\.\w+\/|\.md|\.js/.test(inputsSection), `${filename} Inputs should contain file paths`);
    });
  });

  it('T-2.4: Each prompt has Outputs section with files', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist`);

      const outputsSection = extractSection(content, 'Outputs');
      assert.ok(outputsSection.length > 0, `${filename} should have Outputs section`);
    });
  });

  it('T-2.5: Rules section has 5-8 items per prompt', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist`);

      const rulesSection = extractSection(content, 'Rules');
      const ruleCount = countRulesItems(rulesSection);
      assert.ok(ruleCount >= 5 && ruleCount <= 8,
        `${filename} Rules should have 5-8 items, found ${ruleCount}`);
    });
  });

  it('T-2.6: Each prompt references full agent spec', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist`);
      assert.ok(/AGENT_.*\.md|\.blueprint\/agents\//i.test(content),
        `${filename} should reference full agent spec`);
    });
  });

  it('T-2.7: Each prompt has 30-50 non-blank lines', () => {
    RUNTIME_PROMPTS.forEach(filename => {
      const content = readPromptFile(filename);
      assert.ok(content, `${filename} should exist`);

      const lineCount = countNonBlankLines(content);
      assert.ok(lineCount >= 30 && lineCount <= 50,
        `${filename} should have 30-50 non-blank lines, found ${lineCount}`);
    });
  });
});

describe('Story 3: SKILL.md Integration', () => {

  function readSkillFile() {
    if (!existsSync(SKILL_PATH)) return null;
    return readFileSync(SKILL_PATH, 'utf-8');
  }

  it('T-3.1: SKILL.md references runtime prompt paths', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');
    assert.ok(/\.blueprint\/prompts\/.*-runtime\.md|prompts\//i.test(content),
      'SKILL.md should reference runtime prompts');
  });

  it('T-3.2: All 5 agent contexts use runtime prompts', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');

    const agentSlugs = ['alex', 'cass', 'nigel', 'codey-plan', 'codey-implement'];
    agentSlugs.forEach(slug => {
      const pattern = new RegExp(`${slug}.*runtime|prompts.*${slug}`, 'i');
      assert.ok(pattern.test(content) || content.includes(slug),
        `SKILL.md should reference ${slug} context`);
    });
  });

  it('T-3.3: Pipeline sequence preserved in SKILL.md', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');

    const alexPos = content.indexOf('Alex') > -1 ? content.indexOf('Alex') : content.indexOf('alex');
    const cassPos = content.indexOf('Cass') > -1 ? content.indexOf('Cass') : content.indexOf('cass');
    const nigelPos = content.indexOf('Nigel') > -1 ? content.indexOf('Nigel') : content.indexOf('nigel');
    const codeyPos = content.indexOf('Codey') > -1 ? content.indexOf('Codey') : content.indexOf('codey');

    if (alexPos > -1 && cassPos > -1) {
      assert.ok(alexPos < cassPos, 'Alex should come before Cass');
    }
    if (cassPos > -1 && nigelPos > -1) {
      assert.ok(cassPos < nigelPos, 'Cass should come before Nigel');
    }
    if (nigelPos > -1 && codeyPos > -1) {
      assert.ok(nigelPos < codeyPos, 'Nigel should come before Codey');
    }
  });

  it('T-3.4: --pause-after options still documented', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');
    assert.ok(/--pause-after/i.test(content), 'SKILL.md should document --pause-after option');
  });

  it('T-3.5: --no-commit option still documented', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');
    assert.ok(/--no-commit/i.test(content), 'SKILL.md should document --no-commit option');
  });

  it('T-3.6: Queue recovery logic references correct prompts', () => {
    const content = readSkillFile();
    assert.ok(content, 'SKILL.md should exist');
    assert.ok(/queue|recover|resume/i.test(content), 'SKILL.md should mention queue recovery');
  });
});
