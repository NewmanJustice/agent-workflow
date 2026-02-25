/**
 * Business context detection and conditional inclusion module.
 *
 * Implements lazy loading of business context by detecting references
 * in feature specs and conditionally including the context directive
 * based on agent name and detection results.
 */

/**
 * Detects if a feature spec content references business context.
 * Matches '.business_context' or 'business_context/' patterns.
 *
 * @param {string} featureSpecContent - The content of the feature spec
 * @returns {boolean} True if business context references are found
 */
function needsBusinessContext(featureSpecContent) {
  return featureSpecContent.includes('.business_context')
    || featureSpecContent.includes('business_context/');
}

/**
 * Parses command arguments for the --include-business-context flag.
 *
 * @param {string[]} args - Array of command line arguments
 * @returns {boolean} True if the flag is present
 */
function parseIncludeBusinessContextFlag(args) {
  return args.includes('--include-business-context');
}

/**
 * Determines if an agent should receive business context.
 * Alex always gets business context (exception).
 * Override flag forces inclusion for all agents.
 * Otherwise, uses detection result.
 *
 * @param {string} agentName - Name of the agent (alex, cass, nigel, codey)
 * @param {boolean} detected - Whether business context was detected in spec
 * @param {boolean} overrideFlag - Whether --include-business-context flag is set
 * @returns {boolean} True if agent should receive business context
 */
function shouldIncludeBusinessContext(agentName, detected, overrideFlag) {
  // Alex always gets business context
  if (agentName.toLowerCase() === 'alex') {
    return true;
  }
  // Override flag forces inclusion
  if (overrideFlag) {
    return true;
  }
  // Otherwise use detection result
  return detected;
}

/**
 * Builds queue state object with business context detection result.
 *
 * @param {string} featureSlug - The feature slug identifier
 * @param {boolean} needsContext - Whether business context is needed
 * @returns {object} Queue state object
 */
function buildQueueState(featureSlug, needsContext) {
  return {
    feature: featureSlug,
    current: {
      stage: 'pending',
      needsBusinessContext: needsContext
    }
  };
}

/**
 * Generates the business context directive for agent prompts.
 *
 * @param {boolean} includeContext - Whether to include the directive
 * @returns {string} The directive string or empty string
 */
function generateBusinessContextDirective(includeContext) {
  if (includeContext) {
    return 'Business Context: .business_context/';
  }
  return '';
}

module.exports = {
  needsBusinessContext,
  parseIncludeBusinessContextFlag,
  shouldIncludeBusinessContext,
  buildQueueState,
  generateBusinessContextDirective
};
