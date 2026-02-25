/**
 * Smart Story Routing - Feature Classifier Module
 *
 * Classifies features as "technical" or "user-facing" to determine
 * whether the Cass (story writing) stage should be included in the pipeline.
 */

// Technical keywords indicate infrastructure/internal work
const TECHNICAL_KEYWORDS = [
  'refactor',
  'token',
  'performance',
  'module',
  'internal',
  'infrastructure',
  'optimization',
  'extract',
  'compress',
  'cache',
  'schema',
  'validation',
  'helper',
  'utility',
  'config'
];

// User-facing keywords indicate customer-visible features
const USER_FACING_KEYWORDS = [
  'user',
  'customer',
  'ui',
  'screen',
  'journey',
  'flow',
  'experience',
  'interface',
  'form',
  'button',
  'login',
  'signup',
  'dashboard',
  'notification',
  'email'
];

/**
 * Classify a feature specification as technical or user-facing
 * @param {string} content - The feature specification content
 * @returns {Object} Classification result with type, counts, and reason
 */
function classifyFeature(content) {
  const lowerContent = (content || '').toLowerCase();

  let technicalCount = 0;
  let userFacingCount = 0;
  const technicalMatches = [];
  const userFacingMatches = [];

  // Count technical keyword matches
  for (const keyword of TECHNICAL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      technicalCount += matches.length;
      technicalMatches.push(keyword);
    }
  }

  // Count user-facing keyword matches
  for (const keyword of USER_FACING_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      userFacingCount += matches.length;
      userFacingMatches.push(keyword);
    }
  }

  // Determine type - tie goes to user-facing (conservative default)
  const type = technicalCount > userFacingCount ? 'technical' : 'user-facing';

  // Build reason string
  let reason;
  if (technicalCount === 0 && userFacingCount === 0) {
    reason = 'No keywords found, defaulting to user-facing';
  } else if (technicalCount > userFacingCount) {
    reason = `Technical keywords (${technicalMatches.join(', ')}) outweigh user-facing`;
  } else if (userFacingCount > technicalCount) {
    reason = `User-facing keywords (${userFacingMatches.join(', ')}) outweigh technical`;
  } else {
    reason = 'Tie between technical and user-facing, defaulting to user-facing';
  }

  return {
    type,
    technicalCount,
    userFacingCount,
    reason
  };
}

/**
 * Parse story-related flags from command arguments
 * @param {string[]} args - Array of command arguments
 * @returns {Object} Parsed flags with override value
 */
function parseStoryFlags(args) {
  const argList = args || [];

  if (argList.includes('--with-stories')) {
    return { override: 'include' };
  }

  if (argList.includes('--skip-stories')) {
    return { override: 'skip' };
  }

  return { override: null };
}

/**
 * Determine whether stories should be included in the pipeline
 * @param {string} featureType - 'technical' or 'user-facing'
 * @param {string|null} override - 'include', 'skip', or null
 * @returns {boolean} Whether to include stories in the pipeline
 */
function shouldIncludeStories(featureType, override) {
  // Override takes precedence
  if (override === 'include') {
    return true;
  }
  if (override === 'skip') {
    return false;
  }

  // Default behavior based on classification
  return featureType === 'user-facing';
}

/**
 * Build queue state object with classification data
 * @param {string} slug - Feature slug
 * @param {string} featureType - 'technical' or 'user-facing'
 * @param {boolean} includeStories - Whether stories are included
 * @returns {Object} Queue state object with featureType and skippedCass fields
 */
function buildClassifiedQueueState(slug, featureType, includeStories) {
  return {
    slug,
    featureType,
    skippedCass: !includeStories
  };
}

/**
 * Log classification result to console
 * @param {Object} result - Classification result from classifyFeature
 */
function logClassification(result) {
  console.log(`Feature classified as ${result.type}: ${result.reason}`);
  console.log(`  Technical indicators: ${result.technicalCount}`);
  console.log(`  User-facing indicators: ${result.userFacingCount}`);
}

module.exports = {
  TECHNICAL_KEYWORDS,
  USER_FACING_KEYWORDS,
  classifyFeature,
  parseStoryFlags,
  shouldIncludeStories,
  buildClassifiedQueueState,
  logClassification
};
