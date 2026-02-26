const fs = require('fs');
const path = require('path');

const SESSION_STATES = {
  IDLE: 'idle',
  GATHERING: 'gathering',
  QUESTIONING: 'questioning',
  DRAFTING: 'drafting',
  FINALIZING: 'finalizing'
};

const SECTION_ORDER = ['intent', 'scope', 'actors', 'behaviour', 'dependencies'];

const MIN_REQUIRED_SECTIONS = ['intent', 'scope', 'actors'];

const SYSTEM_SPEC_QUESTIONS = ['purpose', 'actors', 'boundaries', 'rules'];

function parseFlags(args) {
  return {
    interactive: args.includes('--interactive'),
    pauseAfter: args.find(a => a.startsWith('--pause-after='))?.split('=')[1] || null
  };
}

function shouldEnterInteractiveMode(flags, hasSystemSpec, hasFeatureSpec) {
  if (flags.interactive) return { interactive: true, target: 'feature' };
  if (!hasSystemSpec) return { interactive: true, target: 'system' };
  if (!hasFeatureSpec) return { interactive: true, target: 'feature' };
  return { interactive: false, target: null };
}

function createSession(target) {
  const sections = target === 'system'
    ? { purpose: null, actors: null, boundaries: null, rules: null }
    : { intent: null, scope: null, actors: null, behaviour: null, dependencies: null };

  return {
    target,
    state: SESSION_STATES.IDLE,
    sections,
    current: target === 'system' ? 'purpose' : 'intent',
    revisionCount: 0,
    questionCount: 0,
    startedAt: new Date().toISOString(),
    aborted: false,
    specWritten: false,
    context: {},
    feedback: []
  };
}

function getSessionProgress(session) {
  const sectionList = Object.keys(session.sections);
  const complete = Object.values(session.sections).filter(
    s => s === 'complete' || s === 'TBD'
  ).length;
  const remaining = sectionList.length - complete;
  return { complete, remaining, total: sectionList.length };
}

function handleCommand(session, command) {
  const cmd = command.trim().toLowerCase();
  const parts = command.trim().split(/\s+/);
  const baseCmd = parts[0].toLowerCase();

  if (baseCmd === '/approve' || baseCmd === 'yes') {
    session.sections[session.current] = 'complete';
    const nextSection = getNextSection(session);
    if (nextSection) {
      session.current = nextSection;
      return { action: 'next', section: nextSection };
    }
    return { action: 'finalize' };
  }

  if (baseCmd === '/change') {
    const feedback = parts.slice(1).join(' ');
    session.revisionCount++;
    session.feedback.push({ section: session.current, feedback });
    return { action: 'revise', feedback };
  }

  if (baseCmd === '/skip') {
    session.sections[session.current] = 'TBD';
    const nextSection = getNextSection(session);
    if (nextSection) {
      session.current = nextSection;
      return { action: 'next', section: nextSection };
    }
    return { action: 'finalize' };
  }

  if (baseCmd === '/restart') {
    session.sections[session.current] = null;
    return { action: 'restart', section: session.current };
  }

  if (baseCmd === '/abort') {
    session.aborted = true;
    return { action: 'abort' };
  }

  if (baseCmd === '/done') {
    if (canFinalize(session)) {
      return { action: 'finalize' };
    }
    return { action: 'incomplete', missing: getMissingSections(session) };
  }

  return { action: 'unknown', command: baseCmd };
}

function getNextSection(session) {
  const order = session.target === 'system'
    ? SYSTEM_SPEC_QUESTIONS
    : SECTION_ORDER;

  for (const section of order) {
    const status = session.sections[section];
    if (status !== 'complete' && status !== 'TBD') {
      return section;
    }
  }
  return null;
}

function markSectionComplete(session, section) {
  if (section in session.sections) {
    session.sections[section] = 'complete';
    return true;
  }
  return false;
}

function markSectionTBD(session, section) {
  if (section in session.sections) {
    session.sections[section] = 'TBD';
    return true;
  }
  return false;
}

function gatherContext(basePath = '.') {
  const context = {
    systemSpec: null,
    businessContext: [],
    templates: []
  };

  const systemSpecPath = path.join(basePath, '.blueprint/system_specification/SYSTEM_SPEC.md');
  if (fs.existsSync(systemSpecPath)) {
    context.systemSpec = fs.readFileSync(systemSpecPath, 'utf8');
  }

  const businessContextDir = path.join(basePath, '.business_context');
  if (fs.existsSync(businessContextDir)) {
    const files = fs.readdirSync(businessContextDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(businessContextDir, file), 'utf8');
        context.businessContext.push({ file, content });
      }
    }
  }

  const templatesDir = path.join(basePath, '.blueprint/templates');
  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
        context.templates.push({ file, content });
      }
    }
  }

  return context;
}

function identifyGaps(session, userDescription) {
  const gaps = [];
  const sectionKeys = session.target === 'system'
    ? SYSTEM_SPEC_QUESTIONS
    : SECTION_ORDER;

  for (const section of sectionKeys) {
    const hasKey = `has${section.charAt(0).toUpperCase() + section.slice(1)}`;
    if (!userDescription[hasKey]) {
      gaps.push(section);
    }
  }

  return gaps.slice(0, 4);
}

function generateQuestions(gaps) {
  const questionTemplates = {
    intent: 'What is the primary goal or purpose of this feature?',
    scope: 'What boundaries define what is in scope vs out of scope?',
    actors: 'Who are the users or systems that will interact with this?',
    behaviour: 'What are the key behaviours or flows to support?',
    dependencies: 'What does this depend on or what depends on it?',
    purpose: 'What is the overall purpose of this system?',
    boundaries: 'What are the system boundaries and integration points?',
    rules: 'What business rules or constraints apply?'
  };

  return gaps.slice(0, 4).map(gap => ({
    section: gap,
    question: questionTemplates[gap] || `What information is needed for ${gap}?`
  }));
}

function getMissingSections(session) {
  const required = session.target === 'system'
    ? ['purpose', 'actors', 'boundaries']
    : MIN_REQUIRED_SECTIONS;

  return required.filter(section => {
    const status = session.sections[section];
    return status !== 'complete' && status !== 'TBD';
  });
}

function canFinalize(session) {
  const required = session.target === 'system'
    ? ['purpose', 'actors', 'boundaries']
    : MIN_REQUIRED_SECTIONS;

  return required.every(section => {
    const status = session.sections[section];
    return status === 'complete' || status === 'TBD';
  });
}

function generateSpec(session) {
  const sections = [];
  const sectionOrder = session.target === 'system'
    ? SYSTEM_SPEC_QUESTIONS
    : SECTION_ORDER;

  const title = session.target === 'system' ? 'System Spec' : 'Feature Spec';
  sections.push(`# ${title}`);

  for (const sectionName of sectionOrder) {
    const status = session.sections[sectionName];
    const heading = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    sections.push(`## ${heading}`);

    if (status === 'TBD') {
      sections.push('TBD');
    } else if (status === 'complete') {
      sections.push(`[Content for ${sectionName}]`);
    } else {
      sections.push('TBD');
    }
  }

  sections.push('');
  sections.push('_Created via interactive session_');

  return sections.join('\n');
}

function writeSpec(session, outputPath) {
  const content = generateSpec(session);
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content);
  session.specWritten = true;
  return outputPath;
}

function generateHandoff(session, slug) {
  const progress = getSessionProgress(session);
  const endedAt = new Date().toISOString();
  const startedAt = new Date(session.startedAt);
  const durationMs = new Date(endedAt) - startedAt;

  const lines = [
    '## Handoff Summary',
    '**For:** Cass',
    `**Feature:** ${slug}`,
    '',
    '### Key Decisions',
    `- Interactive mode used for ${session.target} spec creation`,
    `- ${progress.complete}/${progress.total} sections completed`,
    session.revisionCount > 0 ? `- ${session.revisionCount} revision(s) made` : null,
    '',
    '### Files Created',
    session.target === 'system'
      ? '- .blueprint/system_specification/SYSTEM_SPEC.md'
      : `- .blueprint/features/feature_${slug}/FEATURE_SPEC.md`,
    '',
    '### Open Questions',
    progress.remaining > 0 ? `- ${progress.remaining} section(s) marked TBD` : '- None',
    '',
    '### Critical Context',
    `Session duration: ${Math.round(durationMs / 1000)}s, Questions asked: ${session.questionCount}, Revisions: ${session.revisionCount}`
  ].filter(line => line !== null);

  return lines.join('\n');
}

function getOutputPath(session, slug, basePath = '.') {
  if (session.target === 'system') {
    return path.join(basePath, '.blueprint/system_specification/SYSTEM_SPEC.md');
  }
  return path.join(basePath, `.blueprint/features/feature_${slug}/FEATURE_SPEC.md`);
}

module.exports = {
  SESSION_STATES,
  SECTION_ORDER,
  MIN_REQUIRED_SECTIONS,
  SYSTEM_SPEC_QUESTIONS,
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
  getMissingSections,
  canFinalize,
  generateSpec,
  writeSpec,
  generateHandoff,
  getOutputPath
};
