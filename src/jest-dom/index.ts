// @ts-expect-error
export * from '@testing-library/jest-dom/matchers';
import { serialize } from '../serialize';

const runUtilInNode = (name: string, args: any[]) => {
  // If there are nested calls to $$JEST_UTILS$$
  // then we need to prevent them from being escaped.
  // We do this by stashing the args strings in an array
  // and putting them back in the string after serializing
  const cachedSubArgs: string[] = [];
  const stringifiedArgs = serialize(args, (val) => {
    if (typeof val === 'string') {
      return val.replace(
        /\$\$JEST_UTILS\$\$\.([a-zA-Z_$]*)\(([^)]*)\)/g,
        (_match, methodName, subArgs) => {
          return `$$JEST_UTILS$$.${methodName}(${
            cachedSubArgs.push(subArgs) - 1
          })`;
        },
      );
    }
    return val;
  }).replace(
    /\$\$JEST_UTILS\$\$\.([a-zA-Z_$]*)\(([^)]*)\)/g,
    (_match, methodName, subArgsIdx) => {
      return `$$JEST_UTILS$$.${methodName}(${cachedSubArgs[subArgsIdx]})`;
    },
  );
  return `$$JEST_UTILS$$.${name}(${stringifiedArgs})`;
};

export const jestContext: { utils: Partial<jest.MatcherUtils['utils']> } = {
  utils: {
    matcherHint: (...args) => runUtilInNode('matcherHint', args),
    printReceived: (...args) => runUtilInNode('printReceived', args),
    RECEIVED_COLOR: ((...args: any[]) =>
      runUtilInNode('RECEIVED_COLOR', args)) as any,
    stringify: (arg) => {
      // TODO: Too hacky?
      if (arg instanceof Element) return arg.outerHTML;
      return runUtilInNode('stringify', [arg]);
    },
  },
};
