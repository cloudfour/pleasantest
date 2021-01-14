// @ts-expect-error
export * from '@testing-library/jest-dom/matchers';

export const jestContext: { utils: Partial<jest.MatcherUtils['utils']> } = {
  utils: {
    matcherHint(...args) {
      return `$$JEST_UTILS$$.matcherHint(${JSON.stringify(args, serialize)})`;
    },
    printReceived(...args) {
      return `$$JEST_UTILS$$.printReceived(${JSON.stringify(args, serialize)})`;
    },
    // TODO: this does not work in the browser
    // @ts-expect-error
    RECEIVED_COLOR(...args) {
      return `$$JEST_UTILS$$.RECEIVED_COLOR(${JSON.stringify(
        args,
        serialize,
      )})`;
    },
  },
};

/** Converts a parameter to something that can be JSON-serialized */
const serialize = (_key: any, value: unknown) => {
  if (value instanceof HTMLElement) {
    return {
      __serialized: 'HTMLElement',
      outerHTML: value.outerHTML,
    };
  }
  return value;
};
