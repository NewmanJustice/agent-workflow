/**
 * Tests for Compressed Feedback Prompts feature
 * Feature: Reduce feedback prompt verbosity while maintaining output format
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// --- Sample Data ---

const VERBOSE_PROMPT = `FIRST, before writing stories, evaluate Alex's feature spec:
- Rating (1-5): How clear and complete is the spec?
- Issues: List any problems (e.g., "missing-error-handling", "unclear-scope")
- Recommendation: "proceed" | "pause" | "revise"

Output your feedback as:
FEEDBACK: { "rating": N, "issues": [...], "recommendation": "..." }`;

const COMPRESSED_PROMPT = `FEEDBACK FIRST: Rate prior stage 1-5, list issues (e.g., unclear-scope), recommend proceed|pause|revise.
Format: FEEDBACK: {"rating":N,"issues":["..."],"rec":"proceed|pause|revise"}
Then continue with your task.`;

// --- Helper Functions (simulating feedback.js) ---

/**
 * Normalizes abbreviated keys to full names
 * @param {Object} feedback - Raw feedback object
 * @returns {Object} - Normalized feedback object
 */
function normalizeFeedbackKeys(feedback) {
  const normalized = { ...feedback };
  if ('rec' in normalized && !('recommendation' in normalized)) {
    normalized.recommendation = normalized.rec;
    delete normalized.rec;
  }
  return normalized;
}

/**
 * Validates feedback object structure
 * @param {Object} feedback - Feedback object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFeedback(feedback) {
  const errors = [];

  // Rating validation
  if (typeof feedback.rating !== 'number' || !Number.isInteger(feedback.rating)) {
    errors.push('rating must be an integer');
  } else if (feedback.rating < 1 || feedback.rating > 5) {
    errors.push('rating must be between 1 and 5');
  }

  // Issues validation
  if (!Array.isArray(feedback.issues)) {
    errors.push('issues must be an array');
  } else if (!feedback.issues.every(i => typeof i === 'string')) {
    errors.push('issues must be an array of strings');
  }

  // Recommendation validation
  const rec = feedback.recommendation || feedback.rec;
  const validRecs = ['proceed', 'pause', 'revise'];
  if (!validRecs.includes(rec)) {
    errors.push(`recommendation must be one of: ${validRecs.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parses FEEDBACK: JSON from agent output
 * @param {string} output - Raw agent output
 * @returns {Object|null} - Parsed feedback or null
 */
function parseFeedbackFromOutput(output) {
  const match = output.match(/FEEDBACK:\s*(\{[^}]+\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// --- Tests ---

describe('Compressed Feedback Prompts', () => {

  describe('T01: Compressed prompt format', () => {
    it('compressed prompt is 3 lines', () => {
      const lines = COMPRESSED_PROMPT.trim().split('\n');
      assert.strictEqual(lines.length, 3, 'Compressed prompt should be 3 lines');
    });

    it('compressed prompt contains required elements', () => {
      assert.ok(COMPRESSED_PROMPT.includes('1-5'), 'Should include rating scale');
      assert.ok(COMPRESSED_PROMPT.includes('issues'), 'Should mention issues');
      assert.ok(COMPRESSED_PROMPT.includes('proceed|pause|revise'), 'Should list recommendation options');
      assert.ok(COMPRESSED_PROMPT.includes('FEEDBACK:'), 'Should include output format marker');
    });
  });

  describe('T02: JSON output parsing', () => {
    it('parses valid feedback JSON from output', () => {
      const output = 'FEEDBACK: {"rating":4,"issues":["unclear-scope"],"rec":"proceed"}';
      const parsed = parseFeedbackFromOutput(output);
      assert.ok(parsed, 'Should parse feedback');
      assert.strictEqual(parsed.rating, 4);
      assert.deepStrictEqual(parsed.issues, ['unclear-scope']);
      assert.strictEqual(parsed.rec, 'proceed');
    });

    it('parses feedback with empty issues array', () => {
      const output = 'FEEDBACK: {"rating":5,"issues":[],"rec":"proceed"}';
      const parsed = parseFeedbackFromOutput(output);
      assert.ok(parsed, 'Should parse feedback');
      assert.deepStrictEqual(parsed.issues, []);
    });

    it('returns null for malformed JSON', () => {
      const output = 'FEEDBACK: {rating:4}';
      const parsed = parseFeedbackFromOutput(output);
      assert.strictEqual(parsed, null, 'Should return null for invalid JSON');
    });
  });

  describe('T03: Key normalization', () => {
    it('normalizes "rec" to "recommendation"', () => {
      const input = { rating: 4, issues: [], rec: 'proceed' };
      const normalized = normalizeFeedbackKeys(input);
      assert.strictEqual(normalized.recommendation, 'proceed');
      assert.strictEqual(normalized.rec, undefined, '"rec" should be removed');
    });

    it('preserves "recommendation" if already present', () => {
      const input = { rating: 4, issues: [], recommendation: 'pause' };
      const normalized = normalizeFeedbackKeys(input);
      assert.strictEqual(normalized.recommendation, 'pause');
    });

    it('prefers "recommendation" over "rec" if both present', () => {
      const input = { rating: 4, issues: [], rec: 'proceed', recommendation: 'revise' };
      const normalized = normalizeFeedbackKeys(input);
      assert.strictEqual(normalized.recommendation, 'revise');
    });
  });

  describe('T04: Rating validation', () => {
    it('accepts valid ratings 1-5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const result = validateFeedback({ rating, issues: [], recommendation: 'proceed' });
        assert.ok(result.valid, `Rating ${rating} should be valid`);
      }
    });

    it('rejects rating below 1', () => {
      const result = validateFeedback({ rating: 0, issues: [], recommendation: 'proceed' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('between 1 and 5')));
    });

    it('rejects rating above 5', () => {
      const result = validateFeedback({ rating: 6, issues: [], recommendation: 'proceed' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('between 1 and 5')));
    });

    it('rejects non-integer rating', () => {
      const result = validateFeedback({ rating: 3.5, issues: [], recommendation: 'proceed' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('integer')));
    });
  });

  describe('T05: Issues validation', () => {
    it('accepts empty issues array', () => {
      const result = validateFeedback({ rating: 5, issues: [], recommendation: 'proceed' });
      assert.ok(result.valid);
    });

    it('accepts issues array with strings', () => {
      const result = validateFeedback({
        rating: 3,
        issues: ['unclear-scope', 'missing-error-handling'],
        recommendation: 'revise'
      });
      assert.ok(result.valid);
    });

    it('rejects non-array issues', () => {
      const result = validateFeedback({ rating: 3, issues: 'unclear-scope', recommendation: 'revise' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('array')));
    });

    it('rejects issues array with non-strings', () => {
      const result = validateFeedback({ rating: 3, issues: [1, 2], recommendation: 'revise' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('strings')));
    });
  });

  describe('T06: Recommendation validation', () => {
    it('accepts "proceed"', () => {
      const result = validateFeedback({ rating: 5, issues: [], recommendation: 'proceed' });
      assert.ok(result.valid);
    });

    it('accepts "pause"', () => {
      const result = validateFeedback({ rating: 3, issues: ['needs-review'], recommendation: 'pause' });
      assert.ok(result.valid);
    });

    it('accepts "revise"', () => {
      const result = validateFeedback({ rating: 2, issues: ['major-gaps'], recommendation: 'revise' });
      assert.ok(result.valid);
    });

    it('accepts abbreviated "rec" key', () => {
      const result = validateFeedback({ rating: 4, issues: [], rec: 'proceed' });
      assert.ok(result.valid);
    });

    it('rejects invalid recommendation value', () => {
      const result = validateFeedback({ rating: 3, issues: [], recommendation: 'skip' });
      assert.ok(!result.valid);
      assert.ok(result.errors.some(e => e.includes('proceed, pause, revise')));
    });
  });

  describe('T07: Token savings verification', () => {
    it('compressed prompt has fewer characters', () => {
      assert.ok(
        COMPRESSED_PROMPT.length < VERBOSE_PROMPT.length,
        `Compressed (${COMPRESSED_PROMPT.length}) should be shorter than verbose (${VERBOSE_PROMPT.length})`
      );
    });

    it('compressed prompt has fewer lines', () => {
      const compressedLines = COMPRESSED_PROMPT.split('\n').length;
      const verboseLines = VERBOSE_PROMPT.split('\n').length;
      assert.ok(
        compressedLines < verboseLines,
        `Compressed (${compressedLines} lines) should have fewer lines than verbose (${verboseLines} lines)`
      );
    });

    it('savings is at least 30%', () => {
      const savings = 1 - (COMPRESSED_PROMPT.length / VERBOSE_PROMPT.length);
      assert.ok(
        savings >= 0.3,
        `Should save at least 30% characters (actual: ${(savings * 100).toFixed(1)}%)`
      );
    });
  });
});
