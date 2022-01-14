import type { ElementHandle, Page } from 'puppeteer';
import { createClientRuntimeServer } from '../module-server/client-runtime-server';
import { assertElementHandle } from '../utils';
import type { AsyncHookTracker } from '../async-hooks';
import { activeAsyncHookTrackers } from '../async-hooks';

const accessibilityTreeSymbol: unique symbol = Symbol('PT Accessibility Tree');

export interface AccessibilityTreeOptions {
  /**
   * Whether the accessible description of elements should be included in the tree.
   * https://www.w3.org/TR/wai-aria-1.2/#dfn-accessible-description
   * (default: true)
   */
  includeDescriptions?: boolean;
  /**
   * Whether to include text that is not being used as an element's name
   * (default: true)
   */
  includeText?: boolean;
}

const getAccessibilityTree = async (
  element: ElementHandle | Page,
  options: AccessibilityTreeOptions = {},
): Promise<
  { [accessibilityTreeSymbol]: string; toString(): string } | undefined
> => {
  if (
    // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
    element &&
    typeof element === 'object' &&
    element.constructor.name === 'Page'
  ) {
    element = await element.evaluateHandle<ElementHandle>(
      () => document.documentElement,
    );
  }
  const serverPromise = createClientRuntimeServer();
  assertElementHandle(element, getAccessibilityTreeWrapper);

  const { port } = await serverPromise;

  const result: string = await element.evaluate(
    // Using new Function to avoid babel transpiling the import
    // @ts-expect-error pptr's types don't like new Function
    new Function(
      'element',
      'options',
      `return import("http://localhost:${port}/@pleasantest/accessibility")
        .then(accessibility => accessibility.getAccessibilityTree(element, options))`,
    ),
    options,
  );

  return {
    [accessibilityTreeSymbol]: result,
    toString: () => result,
  };
};

// Wrapped version adds forgot await checks
const getAccessibilityTreeWrapper: typeof getAccessibilityTree = async (
  ...args
) => {
  const asyncHookTracker: AsyncHookTracker | false =
    activeAsyncHookTrackers.size === 1 &&
    activeAsyncHookTrackers[Symbol.iterator]().next().value;

  if (asyncHookTracker) {
    return asyncHookTracker.addHook(
      () => getAccessibilityTree(...args),
      getAccessibilityTreeWrapper,
    );
  }
  return getAccessibilityTree(...args);
};

export { getAccessibilityTreeWrapper as getAccessibilityTree };

// This tells Jest how to print the accessibility tree (without adding extra quotes)
// https://jestjs.io/docs/expect#expectaddsnapshotserializerserializer
expect.addSnapshotSerializer({
  serialize: (val, config, indentation, depth, refs, printer) => {
    const v = val[accessibilityTreeSymbol];
    return typeof v === 'string'
      ? v
      : printer(v, config, indentation, depth, refs);
  },
  test: (val) =>
    val && typeof val === 'object' && accessibilityTreeSymbol in val,
});
