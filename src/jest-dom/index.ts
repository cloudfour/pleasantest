export * from '@testing-library/jest-dom/matchers';

/** @type {{utils: Partial<jest.MatcherUtils['utils']>}} */
export const jestContext = {
  utils: {
    matcherHint(...args) {
      return `$$JEST_UTILS$$.matcherHint(${JSON.stringify(args, serialize)})`;
    },
    printReceived(...args) {
      return `$$JEST_UTILS$$.printReceived(${JSON.stringify(args, serialize)})`;
    },
  },
};

/**
 * Converts a parameter to something that can be JSON-serialized
 * @param {any} _key
 * @param {unknown} value
 */
const serialize = (_key, value) => {
  if (value instanceof HTMLElement) {
    return {
      __serialized: 'HTMLElement',
      outerHTML: value.outerHTML,
    };
  }
  return value;
};
