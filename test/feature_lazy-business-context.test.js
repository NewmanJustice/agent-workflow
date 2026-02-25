import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Test suite for Lazy Business Context Loading feature.
 *
 * Tests detection logic, conditional inclusion, override flag, and Alex exception.
 * Detection logic per spec: content.includes('.business_context') || content.includes('business_context/')
 */

// Detection function (matches spec Section 4)
function needsBusinessContext(featureSpecContent) {
  return featureSpecContent.includes('.business_context')
    || featureSpecContent.includes('business_context/');
}

// Argument parser for override flag
function parseIncludeBusinessContextFlag(args) {
  return args.includes('--include-business-context');
}

// Determines if agent should receive business context
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

// Build queue state with detection result
function buildQueueState(featureSlug, needsContext) {
  return {
    feature: featureSlug,
    current: {
      stage: 'pending',
      needsBusinessContext: needsContext
    }
  };
}

// Generate prompt directive based on context inclusion
function generateBusinessContextDirective(includeContext) {
  if (includeContext) {
    return 'Business Context: .business_context/';
  }
  return '';
}

describe('Detection Logic', () => {

  it('T-DL-1: Detects .business_context in feature spec content', () => {
    const content = `
# Feature Spec
Per .business_context/domain.md, the user model requires...
`;
    assert.strictEqual(needsBusinessContext(content), true);
  });

  it('T-DL-2: Detects business_context/ in feature spec content', () => {
    const content = `
# Feature Spec
Reference: business_context/glossary.md for terminology
`;
    assert.strictEqual(needsBusinessContext(content), true);
  });

  it('T-DL-3: Returns true when either pattern matches', () => {
    const contentDot = 'See .business_context for details';
    const contentSlash = 'See business_context/ for details';
    const contentBoth = 'See .business_context/domain.md and business_context/terms.md';

    assert.strictEqual(needsBusinessContext(contentDot), true);
    assert.strictEqual(needsBusinessContext(contentSlash), true);
    assert.strictEqual(needsBusinessContext(contentBoth), true);
  });

  it('T-DL-4: Returns false when no pattern matches', () => {
    const content = `
# Feature Spec
This feature adds a login form.
No external context needed.
`;
    assert.strictEqual(needsBusinessContext(content), false);
  });

  it('T-DL-5: Partial matches that are not valid references return false', () => {
    // "business_context" without dot prefix or slash suffix should not match
    const contentNoMarker = 'We discussed business_context in the meeting';
    // The spec says to match '.business_context' OR 'business_context/'
    // Plain 'business_context' without suffix should not match
    assert.strictEqual(needsBusinessContext(contentNoMarker), false);

    // "business" alone should not match
    const contentPartial = 'This is a business requirement';
    assert.strictEqual(needsBusinessContext(contentPartial), false);

    // "_context" alone should not match
    const contentOther = 'Use the app_context module';
    assert.strictEqual(needsBusinessContext(contentOther), false);
  });

});

describe('Conditional Inclusion', () => {

  it('T-CI-1: True flag produces prompt with business context directive', () => {
    const directive = generateBusinessContextDirective(true);
    assert.ok(directive.includes('business_context'), 'Directive should mention business_context');
    assert.ok(directive.length > 0, 'Directive should not be empty');
  });

  it('T-CI-2: False flag produces prompt without business context directive', () => {
    const directive = generateBusinessContextDirective(false);
    assert.strictEqual(directive, '', 'Directive should be empty string');
  });

  it('T-CI-3: Queue structure includes needsBusinessContext field', () => {
    const queueTrue = buildQueueState('my-feature', true);
    const queueFalse = buildQueueState('my-feature', false);

    assert.strictEqual(typeof queueTrue.current.needsBusinessContext, 'boolean');
    assert.strictEqual(queueTrue.current.needsBusinessContext, true);

    assert.strictEqual(typeof queueFalse.current.needsBusinessContext, 'boolean');
    assert.strictEqual(queueFalse.current.needsBusinessContext, false);
  });

  it('T-CI-4: Queue preserves feature slug and stage', () => {
    const queue = buildQueueState('lazy-business-context', true);

    assert.strictEqual(queue.feature, 'lazy-business-context');
    assert.strictEqual(queue.current.stage, 'pending');
  });

});

describe('Override Flag', () => {

  it('T-OF-1: Flag is parsed from command arguments', () => {
    const argsWithFlag = ['implement-feature', 'my-feature', '--include-business-context'];
    const argsWithoutFlag = ['implement-feature', 'my-feature'];

    assert.strictEqual(parseIncludeBusinessContextFlag(argsWithFlag), true);
    assert.strictEqual(parseIncludeBusinessContextFlag(argsWithoutFlag), false);
  });

  it('T-OF-2: Flag overrides detection to true', () => {
    const detected = false;
    const overrideFlag = true;

    const result = shouldIncludeBusinessContext('cass', detected, overrideFlag);
    assert.strictEqual(result, true, 'Override flag should force true');
  });

  it('T-OF-3: Flag works when feature spec has no citations', () => {
    const content = 'Simple feature with no business context references';
    const detected = needsBusinessContext(content);
    const overrideFlag = true;

    assert.strictEqual(detected, false, 'Detection should be false');

    const result = shouldIncludeBusinessContext('nigel', detected, overrideFlag);
    assert.strictEqual(result, true, 'Override should still force true');
  });

  it('T-OF-4: Flag mixed with other arguments', () => {
    const args = ['implement-feature', 'my-feature', '--pause-after=alex', '--include-business-context', '--no-commit'];
    assert.strictEqual(parseIncludeBusinessContextFlag(args), true);
  });

});

describe('Alex Exception', () => {

  it('T-AE-1: Alex prompt always includes business context', () => {
    // Even when detection is true and flag is false, Alex gets context
    const result = shouldIncludeBusinessContext('alex', true, false);
    assert.strictEqual(result, true);
  });

  it('T-AE-2: Alex gets context even when detection is false', () => {
    const detected = false;
    const overrideFlag = false;

    const result = shouldIncludeBusinessContext('Alex', detected, overrideFlag);
    assert.strictEqual(result, true, 'Alex should always get business context');
  });

  it('T-AE-3: Alex gets context regardless of override flag state', () => {
    // Flag false, detection false - Alex still gets context
    const result1 = shouldIncludeBusinessContext('alex', false, false);
    assert.strictEqual(result1, true);

    // Flag true, detection false - Alex still gets context
    const result2 = shouldIncludeBusinessContext('alex', false, true);
    assert.strictEqual(result2, true);

    // Flag false, detection true - Alex still gets context
    const result3 = shouldIncludeBusinessContext('alex', true, false);
    assert.strictEqual(result3, true);
  });

  it('T-AE-4: Other agents respect detection when no override', () => {
    const agents = ['cass', 'nigel', 'codey'];

    agents.forEach(agent => {
      const resultFalse = shouldIncludeBusinessContext(agent, false, false);
      const resultTrue = shouldIncludeBusinessContext(agent, true, false);

      assert.strictEqual(resultFalse, false, `${agent} should not get context when detection is false`);
      assert.strictEqual(resultTrue, true, `${agent} should get context when detection is true`);
    });
  });

  it('T-AE-5: Alex case insensitive matching', () => {
    const variants = ['alex', 'Alex', 'ALEX'];

    variants.forEach(name => {
      const result = shouldIncludeBusinessContext(name, false, false);
      assert.strictEqual(result, true, `${name} should always get business context`);
    });
  });

});

describe('Integration Scenarios', () => {

  it('T-INT-1: Full pipeline detection flow', () => {
    const featureSpec = `
# Feature Spec — User Authentication
Per .business_context/security-policy.md, all auth must use OAuth2.
`;
    const detected = needsBusinessContext(featureSpec);
    const queue = buildQueueState('user-auth', detected);

    assert.strictEqual(detected, true);
    assert.strictEqual(queue.current.needsBusinessContext, true);

    // Alex always gets it
    assert.strictEqual(shouldIncludeBusinessContext('alex', detected, false), true);
    // Other agents get it because detected is true
    assert.strictEqual(shouldIncludeBusinessContext('cass', detected, false), true);
    assert.strictEqual(shouldIncludeBusinessContext('nigel', detected, false), true);
    assert.strictEqual(shouldIncludeBusinessContext('codey', detected, false), true);
  });

  it('T-INT-2: Simple feature skips business context', () => {
    const featureSpec = `
# Feature Spec — Add Loading Spinner
Show spinner during API calls.
`;
    const detected = needsBusinessContext(featureSpec);
    const queue = buildQueueState('loading-spinner', detected);

    assert.strictEqual(detected, false);
    assert.strictEqual(queue.current.needsBusinessContext, false);

    // Alex still gets it
    assert.strictEqual(shouldIncludeBusinessContext('alex', detected, false), true);
    // Other agents skip it
    assert.strictEqual(shouldIncludeBusinessContext('cass', detected, false), false);
    assert.strictEqual(shouldIncludeBusinessContext('nigel', detected, false), false);
    assert.strictEqual(shouldIncludeBusinessContext('codey', detected, false), false);
  });

  it('T-INT-3: Override flag forces inclusion for all agents', () => {
    const featureSpec = 'Simple feature with no context refs';
    const detected = needsBusinessContext(featureSpec);
    const overrideFlag = true;

    assert.strictEqual(detected, false);

    // All agents get context due to override
    assert.strictEqual(shouldIncludeBusinessContext('alex', detected, overrideFlag), true);
    assert.strictEqual(shouldIncludeBusinessContext('cass', detected, overrideFlag), true);
    assert.strictEqual(shouldIncludeBusinessContext('nigel', detected, overrideFlag), true);
    assert.strictEqual(shouldIncludeBusinessContext('codey', detected, overrideFlag), true);
  });

});
