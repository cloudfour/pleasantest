import type axe from 'axe-core';
import type { ElementHandle, Page, Serializable } from 'puppeteer';

import type { AsyncHookTracker } from '../async-hooks.js';
import { activeAsyncHookTrackers } from '../async-hooks.js';
import { createClientRuntimeServer } from '../module-server/client-runtime-server.js';
import {
  assertElementHandle,
  jsHandleToArray,
  printColorsInErrorMessages,
  removeFuncFromStackTrace,
} from '../utils.js';

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

export const accessibilityTreeSnapshotSerializer: import('pretty-format').NewPlugin =
  {
    serialize: (val, config, indentation, depth, refs, printer) => {
      const v = val[accessibilityTreeSymbol];
      return typeof v === 'string'
        ? v
        : printer(v, config, indentation, depth, refs);
    },
    test: (val) =>
      val && typeof val === 'object' && accessibilityTreeSymbol in val,
  };
// This tells Jest how to print the accessibility tree (without adding extra quotes)
// https://jestjs.io/docs/expect#expectaddsnapshotserializerserializer
expect.addSnapshotSerializer(accessibilityTreeSnapshotSerializer);

// Based on https://github.com/WordPress/gutenberg/blob/3b2eccc289cfc90bd99252b12fc4c6e470ce4c04/packages/jest-puppeteer-axe/src/index.js

/** Formats the list of violations object returned by Axe analysis. */
async function formatViolations(violations: axe.Result[], page: Page) {
  const { port } = await createClientRuntimeServer();
  const formattedHandle = await page.evaluateHandle((violations) => {
    const output: (string | Element)[] = [];

    // eslint-disable-next-line @cloudfour/unicorn/consistent-function-scoping
    const findElement = (node: axe.NodeResult) =>
      [...document.querySelectorAll(node.target as unknown as string)].find(
        (el) =>
          el.outerHTML === node.html ||
          // For long strings, axe-core returns only the opening tag
          // https://github.com/dequelabs/axe-core/blob/v4.4.2/lib/core/utils/dq-element.js#L11
          el.outerHTML.slice(0, el.outerHTML.indexOf('>') + 1) === node.html,
      );
    for (const { help, helpUrl, id, nodes } of violations) {
      // The dollar signs are used to indicate which part should be bolded/red
      // We can't directly call the color functions here since we haven't imported them
      // And this function is toString'd into the browser.
      output.push(`
$$$${help}$$$ (${id})
${helpUrl}
Affected Nodes:
`);

      for (const node of nodes) {
        output.push('\n', findElement(node) || node.html, '\n');
        if (node.any.length > 0) {
          output.push(
            `Fix ${
              node.any.length > 1 ? 'any of the following' : 'the following'
            }:\n`,
          );
          for (const item of node.any) output.push(`  • ${item.message}\n`);
        }

        if (node.all.length > 0 || node.none.length > 0) {
          output.push(
            `Fix ${
              node.all.length > 1 ? 'all of the following' : 'the following'
            }:\n`,
          );
          for (const item of [...node.all, ...node.none])
            output.push(`  • ${item.message}.\n`);
        }
      }
    }
    return output;
  }, violations as unknown as Serializable);

  const outputHandle = await page.evaluateHandle(
    // Using new Function to avoid babel transpiling the import
    // @ts-expect-error pptr's types don't like new Function
    new Function(
      'formattedArr',
      `return import("http://localhost:${port}/@pleasantest/accessibility")
        .then(({ printElement, colors }) => {
          let messageWithElementsStringified = '';
          const messageWithElementsRevived = [];
          for (let chunk of formattedArr) {
            if (typeof chunk === 'string') {
              chunk = chunk.replace(
                /\\$\\$\\$(.*?)\\$\\$\\$/g,
                (_, ruleText) => colors.red(colors.bold(ruleText))
              )
            }
            messageWithElementsRevived.push(chunk);
            if (typeof chunk === 'string') {
              messageWithElementsStringified += chunk;
            } else {
              messageWithElementsStringified += printElement(chunk, ${printColorsInErrorMessages});
            }
          }

          return { messageWithElementsStringified, messageWithElementsRevived };
        })`,
    ),
    formattedHandle,
  );

  const { messageWithElementsRevived, messageWithElementsStringified } =
    Object.fromEntries(await outputHandle.getProperties());

  return {
    messageWithElementsStringified:
      (await messageWithElementsStringified.jsonValue()) as string,
    messageWithElementsRevived: await jsHandleToArray(
      messageWithElementsRevived,
    ),
  };
}

interface ToPassAxeTestsOpts {
  /** CSS selector(s) to add to the list of elements to include in analysis. */
  include?: string | string[];
  /** CSS selector(s) to add to the list of elements to exclude from analysis. */
  exclude?: string | string[];
  /** The list of Axe rules to skip from verification. */
  disabledRules?: string | string[];
  /** A flexible way to configure how Axe run operates, see https://github.com/dequelabs/axe-core/blob/HEAD/doc/API.md#options-parameter. */
  options?: axe.RunOptions;
  /** Axe configuration object, see https://github.com/dequelabs/axe-core/blob/HEAD/doc/API.md#api-name-axeconfigure. */
  config?: axe.Spec;
}

/**
 * Defines async matcher to check whether a given Puppeteer's page instance passes Axe accessibility tests.
 */
async function toPassAxeTests(
  this: jest.MatcherUtils,
  page: Page,
  { include, exclude, disabledRules, options, config }: ToPassAxeTestsOpts = {},
): Promise<jest.CustomMatcherResult> {
  let AxePuppeteer: typeof import('@axe-core/puppeteer').default;
  try {
    const axePuppeteerModule = await import('@axe-core/puppeteer');
    AxePuppeteer = axePuppeteerModule.default;
  } catch {
    throw removeFuncFromStackTrace(
      new Error(
        'Install @axe-core/puppeteer and axe-core to use the toPassAxeTests matcher',
      ),
      toPassAxeTests,
    );
  }
  const axe = new AxePuppeteer(page);

  if (include) axe.include(include);
  if (exclude) axe.exclude(exclude);
  if (options) axe.options(options);
  if (disabledRules) axe.disableRules(disabledRules);
  if (config) axe.configure(config);

  const { violations } = await axe.analyze();
  const formattedViolations = await formatViolations(violations, page);

  const pass = violations.length === 0;
  const foundViolationsMessage = `${this.utils.matcherHint(
    '.toPassAxeTests',
    'page',
    '',
  )}
Expected page to pass Axe accessibility tests.
Violations found:
`;

  const expectedViolationsMessage = `${this.utils.matcherHint(
    '.not.toPassAxeTests',
    'page',
    '',
  )}

Expected page to contain accessibility check violations.
No violations found.`;
  const message = pass
    ? () => expectedViolationsMessage
    : () =>
        foundViolationsMessage +
        formattedViolations.messageWithElementsStringified;

  const output = { message, pass };

  if (!pass) {
    // @ts-expect-error This is a custom property we are using to customize the message inside the browser
    output.messageForBrowser = [
      foundViolationsMessage,
      ...formattedViolations.messageWithElementsRevived,
    ];
  }

  return output;
}

expect.extend({ toPassAxeTests });

declare global {
  // eslint-disable-next-line @cloudfour/typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toPassAxeTests(opts?: ToPassAxeTestsOpts): Promise<R>;
    }
  }
}
