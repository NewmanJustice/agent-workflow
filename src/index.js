const { init } = require('./init');
const { update } = require('./update');
const { validate, formatOutput, checkNodeVersion } = require('./validate');
const { recordHistory, displayHistory, showStats, clearHistory, storeStageFeedback } = require('./history');
const {
  readConfig,
  writeConfig,
  resetConfig,
  calculateFailureRate,
  recommendStrategy,
  applyStrategy,
  shouldRetry,
  mapIssuesToStrategies
} = require('./retry');
const {
  validateFeedback,
  shouldPause,
  getDefaultConfig: getFeedbackDefaultConfig,
  readConfig: readFeedbackConfig,
  writeConfig: writeFeedbackConfig
} = require('./feedback');
const {
  calculateCalibration,
  correlateIssues,
  recommendThreshold,
  displayFeedbackInsights
} = require('./insights');
const {
  parseHandoffSummary,
  extractSection,
  countBulletItems,
  extractFilePaths,
  validateHandoffSummary,
  getHandoffPath,
  getHandoffTemplate
} = require('./handoff');

module.exports = {
  init,
  update,
  validate,
  formatOutput,
  checkNodeVersion,
  recordHistory,
  displayHistory,
  showStats,
  clearHistory,
  storeStageFeedback,
  // Retry module exports
  readConfig,
  writeConfig,
  resetConfig,
  calculateFailureRate,
  recommendStrategy,
  applyStrategy,
  shouldRetry,
  mapIssuesToStrategies,
  // Feedback module exports
  validateFeedback,
  shouldPause,
  getFeedbackDefaultConfig,
  readFeedbackConfig,
  writeFeedbackConfig,
  // Feedback insights exports
  calculateCalibration,
  correlateIssues,
  recommendThreshold,
  displayFeedbackInsights,
  // Handoff summary exports
  parseHandoffSummary,
  extractSection,
  countBulletItems,
  extractFilePaths,
  validateHandoffSummary,
  getHandoffPath,
  getHandoffTemplate
};
