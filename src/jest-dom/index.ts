import { addToElementCache, serialize } from '../serialize';
// @ts-expect-error types are not provided for this sub-path import
export * from '@testing-library/jest-dom/matchers';
export {
  reviveElementsInString,
  printElement,
  deserialize,
} from '../serialize';

const runUtilInNode = (name: string, args: any[]) => {
  // If there are nested calls to $JEST_UTILS$
  // then we need to prevent them from being escaped.
  // We do this by stashing the args strings in an array
  // and putting them back in the string after serializing
  const cachedSubArgs: string[] = [];

  const stringifiedArgs = serialize(args, (val) => {
    if (typeof val === 'string') {
      return val.replace(
        /\$JEST_UTILS\.([$A-Z_a-z]*)\$([^)]*)\$END_JEST_UTILS\$/g,
        (_match, methodName, subArgs) =>
          `$JEST_UTILS.${methodName}$${
            cachedSubArgs.push(subArgs) - 1
          }$END_JEST_UTILS$`,
      );
    }

    return val;
  }).replace(
    /\$JEST_UTILS\.([$A-Z_a-z]*)\$(.*?)\$END_JEST_UTILS\$/g,
    (_match, methodName, subArgsIdx) =>
      `$JEST_UTILS.${methodName}$${cachedSubArgs[subArgsIdx]}$END_JEST_UTILS$`,
  );
  return `$JEST_UTILS.${name}$${stringifiedArgs}$END_JEST_UTILS$`;
};

type RecursivePartial<T> = T extends Record<string, unknown>
  ? T extends () => any
    ? T
    : {
        [K in keyof T]?: RecursivePartial<T[K]>;
      }
  : T;

export const jestContext: RecursivePartial<jest.MatcherUtils> = {
  equals: (a, b) =>
    // Jest's version of this supports asymmetric matchers,
    // but since we don't support that this is good enough.
    a === b,
  utils: {
    matcherHint: (...args) => runUtilInNode('matcherHint', args),
    diff: (...args) => runUtilInNode('diff', args),
    printReceived: (arg) => {
      if (arg instanceof Element) {
        return jestContext.utils!.RECEIVED_COLOR!(addToElementCache(arg));
      }

      return runUtilInNode('printReceived', [arg]);
    },
    printExpected: (arg) => {
      if (arg instanceof Element) {
        return jestContext.utils!.EXPECTED_COLOR!(addToElementCache(arg));
      }

      return runUtilInNode('printExpected', [arg]);
    },
    RECEIVED_COLOR: ((...args: any[]) =>
      runUtilInNode('RECEIVED_COLOR', args)) as any,
    EXPECTED_COLOR: ((...args: any[]) =>
      runUtilInNode('EXPECTED_COLOR', args)) as any,
    stringify: (arg) => {
      if (arg instanceof Element) {
        return addToElementCache(arg);
      }

      return runUtilInNode('stringify', [arg]);
    },
  },
};
