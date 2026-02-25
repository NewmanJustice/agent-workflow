/**
 * Handoff summary helper functions.
 * Parses and validates handoff summary format for agent-to-agent communication.
 */

/**
 * Parses a handoff summary and extracts key fields.
 * @param {string} content - The handoff summary markdown content
 * @returns {object} Parsed summary fields
 */
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

/**
 * Extracts a named section from the summary.
 * @param {string} content - The handoff summary markdown content
 * @param {string} sectionName - Name of the section (e.g., 'Key Decisions')
 * @returns {string} The section content, or empty string if not found
 */
function extractSection(content, sectionName) {
  const regex = new RegExp(`### ${sectionName}\\n([\\s\\S]*?)(?=\\n###|$)`);
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Counts bullet items in a section.
 * @param {string} section - Section content
 * @returns {number} Number of bullet items
 */
function countBulletItems(section) {
  return section.split('\n').filter(line => /^[-*]\s/.test(line)).length;
}

/**
 * Extracts file paths from a section.
 * @param {string} section - Section content
 * @returns {string[]} Array of file paths
 */
function extractFilePaths(section) {
  const lines = section.split('\n').filter(line => /^[-*]\s/.test(line));
  return lines.map(line => line.replace(/^[-*]\s+/, '').trim());
}

/**
 * Validates a handoff summary against format rules.
 * @param {string} content - The handoff summary markdown content
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateHandoffSummary(content) {
  const errors = [];
  const parsed = parseHandoffSummary(content);

  if (!parsed.hasHeading) {
    errors.push('Missing ## Handoff Summary heading');
  }

  if (!parsed.forField) {
    errors.push('Missing **For:** field');
  }

  if (!parsed.featureField) {
    errors.push('Missing **Feature:** field');
  }

  if (!parsed.hasKeyDecisions) {
    errors.push('Missing ### Key Decisions section');
  }

  if (!parsed.hasFilesCreated) {
    errors.push('Missing ### Files Created section');
  }

  if (!parsed.hasOpenQuestions) {
    errors.push('Missing ### Open Questions section');
  }

  if (!parsed.hasCriticalContext) {
    errors.push('Missing ### Critical Context section');
  }

  if (parsed.lineCount >= 30) {
    errors.push(`Summary exceeds 30 lines (found ${parsed.lineCount})`);
  }

  // Validate Key Decisions bullet count
  const keyDecisions = extractSection(content, 'Key Decisions');
  const bulletCount = countBulletItems(keyDecisions);
  if (bulletCount < 1 || bulletCount > 5) {
    errors.push(`Key Decisions should have 1-5 items (found ${bulletCount})`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns the handoff file path for an agent.
 * @param {string} featureDir - Feature directory path
 * @param {string} agent - Agent name (alex, cass, nigel)
 * @returns {string} Full path to handoff file
 */
function getHandoffPath(featureDir, agent) {
  return `${featureDir}/handoff-${agent.toLowerCase()}.md`;
}

/**
 * Generates a handoff summary template.
 * @param {string} forAgent - Target agent name
 * @param {string} featureSlug - Feature slug
 * @returns {string} Template markdown content
 */
function getHandoffTemplate(forAgent, featureSlug) {
  return `## Handoff Summary
**For:** ${forAgent}
**Feature:** ${featureSlug}

### Key Decisions
-

### Files Created
-

### Open Questions
- None

### Critical Context
`;
}

module.exports = {
  parseHandoffSummary,
  extractSection,
  countBulletItems,
  extractFilePaths,
  validateHandoffSummary,
  getHandoffPath,
  getHandoffTemplate
};
