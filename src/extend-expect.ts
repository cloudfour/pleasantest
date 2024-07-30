// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { ARIARole } from 'aria-query';
import type { ElementHandle, JSHandle } from 'puppeteer';

import {
  type AsyncHookTracker,
  activeAsyncHookTrackers,
} from './async-hooks.js';
import { createClientRuntimeServer } from './module-server/client-runtime-server.js';
import { deserialize, serialize } from './serialize/index.js';
import {
  isElementHandle,
  isPromise,
  jsHandleToArray,
  printColorsInErrorMessages,
  removeFuncFromStackTrace,
} from './utils.js';

// We are checking both objects here to make sure
// that we don't forget to define the types for any matchers either
// (at the bottom of this file)
type MatcherNames = Exclude<
  keyof TestingLibraryMatchers<unknown, unknown>,
  // Exclude deprecated matchers, we don't need to include those.
  'toBeInTheDOM' | 'toBeEmpty' | 'toHaveDescription' | 'toHaveErrorMessage'
>;

// Using an object here so that TS will tell us if there are any matchers
// added to jest-dom upstream but that are missing from this list
const matcherNames: { [K in MatcherNames]: true } = {
  toBeDisabled: true,
  toBeEnabled: true,
  toBeEmptyDOMElement: true,
  toBeInTheDocument: true,
  toBeInvalid: true,
  toBeRequired: true,
  toBeValid: true,
  toBeVisible: true,
  toContainElement: true,
  toContainHTML: true,
  toHaveAccessibleDescription: true,
  toHaveAccessibleErrorMessage: true,
  toHaveAccessibleName: true,
  toHaveAttribute: true,
  toHaveClass: true,
  toHaveFocus: true,
  toHaveFormValues: true,
  toHaveStyle: true,
  toHaveTextContent: true,
  toHaveValue: true,
  toHaveDisplayValue: true,
  toBeChecked: true,
  toBePartiallyChecked: true,
  toHaveRole: true,
} satisfies { [K in keyof jest.Matchers<unknown>]?: true }; // Ensure that our list _only_ contains methods we've defined types for

const isJSHandle = (input: unknown): input is JSHandle => {
  if (typeof input !== 'object' || !input) return false;
  // @ts-expect-error checking for properties that don't necessarily exist
  return input.asElement && input.dispose && input.evaluate;
};

const matchers: jest.ExpectExtendMap = Object.fromEntries(
  Object.keys(matcherNames).map((methodName) => {
    const matcher = async function (
      this: jest.MatcherUtils,
      elementHandle: ElementHandle | null,
      ...matcherArgs: unknown[]
    ): Promise<jest.CustomMatcherResult> {
      const serverPromise = createClientRuntimeServer();
      if (!isElementHandle(elementHandle)) {
        // Special case: expect(null).not.toBeInTheDocument() should pass
        if (methodName === 'toBeInTheDocument' && this.isNot) {
          // This is actually passing but since it is isNot it has to return false
          return { pass: false, message: () => '' };
        }

        const message = [
          this.utils.matcherHint(
            `${this.isNot ? '.not' : ''}.${methodName}`,
            'received',
            '',
          ),
          '',
          `${this.utils.RECEIVED_COLOR(
            'received',
          )} value must be an HTMLElement or an SVGElement.`,
          isPromise(elementHandle)
            ? `Received a ${this.utils.RECEIVED_COLOR(
                'Promise',
              )}. Did you forget to await?`
            : this.utils.printWithType(
                'Received',
                elementHandle,
                this.utils.printReceived,
              ),
        ].join('\n');
        throw removeFuncFromStackTrace(new Error(message), matcher);
      }

      for (const arg of matcherArgs) {
        if (
          typeof arg === 'object' &&
          typeof (arg as any)?.asymmetricMatch === 'function'
        ) {
          const error = new Error(
            `Pleasantest does not support using asymmetric matchers in browser-based matchers

Received ${this.utils.printReceived(arg)}`,
          );
          throw removeFuncFromStackTrace(error, matcher);
        }
      }

      const { port } = await serverPromise;

      const ctxString = JSON.stringify(this); // Contains stuff like isNot and promise
      const result = await elementHandle.evaluateHandle(
        // Using new Function to avoid babel transpiling the import
        new Function(
          'element',
          '...matcherArgs',
          `return import("http://localhost:${port}/@pleasantest/jest-dom")
            .then(({ jestContext, deserialize, ...jestDom }) => {
            const context = { ...(${ctxString}), ...jestContext }
            try {
              const deserialized = matcherArgs
              .slice(1)
              .map(a => typeof a === 'string' ? deserialize(a) : a)
              return jestDom.${methodName}.call(context, element, ...deserialized)
            } catch (error) {
              return { thrown: true, error }
            }
          })`,
        ) as () => any,
        elementHandle,
        ...matcherArgs.map((arg) => (isJSHandle(arg) ? arg : serialize(arg))),
      );

      // Whether the matcher threw (this is different from the matcher failing)
      // The matcher failing means that it returned a result for Jest to throw
      // But a matcher throwing means that the input was invalid or something
      const thrownError = await result.evaluate((result: any) => result.thrown);

      // We have to evaluate the message right away
      // because Jest does not accept a promise from the returned message property
      const message = await result.evaluate(
        thrownError
          ? (matcherResult: any) => matcherResult.error.message
          : (matcherResult: any) => matcherResult.message(),
      );
      const deserializedMessage = runJestUtilsInNode(message, this as any);
      const { messageWithElementsRevived, messageWithElementsStringified } =
        await elementHandle
          .evaluateHandle(
            new Function(
              'el',
              'message',
              `return import("http://localhost:${port}/@pleasantest/jest-dom")
                .then(({ reviveElementsInString, printElement }) => {
                  const messageWithElementsRevived = reviveElementsInString(message)
                  const messageWithElementsStringified = messageWithElementsRevived
                  .map(el => {
                    if (el instanceof Element) return printElement(el, ${printColorsInErrorMessages})
                      return el
                  })
                  .join('')
                  return { messageWithElementsRevived, messageWithElementsStringified }
                })`,
            ) as (el: Element, message: string) => any,
            deserializedMessage,
          )
          .then(async (returnHandle) => {
            const {
              messageWithElementsRevived,
              messageWithElementsStringified,
            } = Object.fromEntries(await returnHandle.getProperties());
            return {
              messageWithElementsStringified:
                await messageWithElementsStringified.jsonValue(),
              messageWithElementsRevived: await jsHandleToArray(
                messageWithElementsRevived,
              ),
            };
          });
      if (thrownError) {
        const error = new Error(messageWithElementsStringified as any);
        // @ts-expect-error messageForBrowser is a property we added to Error
        error.messageForBrowser = messageWithElementsRevived;

        throw removeFuncFromStackTrace(error, matcher);
      }

      return {
        ...(await result.jsonValue()),
        message: () => messageWithElementsStringified,
        messageForBrowser: messageWithElementsRevived,
      };
    };

    const matcherWrapper = async function (
      this: jest.MatcherUtils,
      elementHandle: ElementHandle | null,
      ...matcherArgs: unknown[]
    ): Promise<jest.CustomMatcherResult> {
      const asyncHookTracker: AsyncHookTracker | false =
        activeAsyncHookTrackers.size === 1 &&
        activeAsyncHookTrackers[Symbol.iterator]().next().value;
      if (asyncHookTracker) {
        const res = await asyncHookTracker.addHook(
          () => matcher.call(this, elementHandle, ...matcherArgs),
          matchers[methodName],
        );
        // AddHook resolves to undefined if the function throws after the async hook tracker closes
        // Because it needs to not trigger an unhandled promise rejection
        // asyncHookTracker can return undefined (even though its types say it won't)
        // if the user forgot to use await,
        // and the test already exited/threw because of the withBrowser forgot-await detection,
        // but the code will keep running because it's impossible to stop without an unhandled promise rejection,
        // which is frustrating to debug
        // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
        if (res === undefined) return { pass: !this.isNot, message: () => '' };
        return res;
      }
      return matcher.call(this, elementHandle, ...matcherArgs);
    };

    return [methodName, matcherWrapper];
  }),
);

const runJestUtilsInNode = (message: string, context: jest.MatcherContext) => {
  // Handling nested JEST_UTILS calls here is the complexity
  // The while loop goes through them in reverse
  // so inner (nested) calls are evaluated before outer calls
  const jestUtilsCalls = [
    ...message.matchAll(/\$JEST_UTILS\.([$A-Z_a-z]*)\$/g),
  ];
  const closeRegex = /\$END_JEST_UTILS\$/g;
  let jestUtilsCall;
  while ((jestUtilsCall = jestUtilsCalls.pop())) {
    const start = jestUtilsCall.index;
    const methodName = jestUtilsCall[1];
    closeRegex.lastIndex = start;
    const closeIndex = closeRegex.exec(message)?.index;
    if (closeIndex !== undefined) {
      const argsString = message.slice(
        start + jestUtilsCall[0].length,
        closeIndex,
      );
      const parsedArgs = deserialize(argsString);
      const res: string = (context.utils as any)[methodName](...parsedArgs);
      const escaped = JSON.stringify(res).replace(/^"/, '').replace(/"$/, '');
      message =
        message.slice(0, start) +
        escaped +
        message.slice(closeIndex + '$END_JEST_UTILS$'.length);
    }
  }

  return message
    .replace(/\\u[\dA-Fa-f]{4}/g, (match) => JSON.parse(`"${match}"`))
    .replace(/\\./g, (match) => JSON.parse(`"${match}"`));
};

expect.extend(matchers);

declare global {
  // eslint-disable-next-line @cloudfour/typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Assert whether an element is present in the document or not.
       *
       * https://github.com/testing-library/jest-dom#tobeinthedocument
       */
      toBeInTheDocument(): Promise<R>;
      /**
       * This allows you to check if an element is currently visible to the user.
       *
       * An element is visible if **all** the following conditions are met:
       * it does not have its css property display set to none
       * it does not have its css property visibility set to either hidden or collapse
       * it does not have its css property opacity set to 0
       * its parent element is also visible (and so on up to the top of the DOM tree)
       * it does not have the hidden attribute
       * if `<details />` it has the open attribute
       *
       * https://github.com/testing-library/jest-dom#tobevisible
       */
      toBeVisible(): Promise<R>;
      /**
       * Assert whether an element has content or not.
       *
       * https://github.com/testing-library/jest-dom#tobeemptydomelement
       */
      toBeEmptyDOMElement(): Promise<R>;
      /**
       * Allows you to check whether an element is disabled from the user's perspective.
       *
       * Matches if the element is a form control and the `disabled` attribute is specified on this element or the
       * element is a descendant of a form element with a `disabled` attribute.
       *
       * https://github.com/testing-library/jest-dom#tobedisabled
       */
      toBeDisabled(): Promise<R>;
      /**
       * Allows you to check whether an element is not disabled from the user's perspective.
       *
       * Works like `not.toBeDisabled()`.
       *
       * Use this matcher to avoid double negation in your tests.
       *
       * https://github.com/testing-library/jest-dom#tobeenabled
       */
      toBeEnabled(): Promise<R>;
      /**
       * Check if a form element, or the entire `form`, is currently invalid.
       *
       * An `input`, `select`, `textarea`, or `form` element is invalid if it has an `aria-invalid` attribute with no
       * value or a value of "true", or if the result of `checkValidity()` is false.
       *
       * https://github.com/testing-library/jest-dom#tobeinvalid
       */
      toBeInvalid(): Promise<R>;
      /**
       * This allows you to check if a form element is currently required.
       *
       * An element is required if it is having a `required` or `aria-required="true"` attribute.
       *
       * https://github.com/testing-library/jest-dom#toberequired
       */
      toBeRequired(): Promise<R>;
      /**
       * Allows you to check if a form element is currently required.
       *
       * An `input`, `select`, `textarea`, or `form` element is invalid if it has an `aria-invalid` attribute with no
       * value or a value of "false", or if the result of `checkValidity()` is true.
       *
       * https://github.com/testing-library/jest-dom#tobevalid
       */
      toBeValid(): Promise<R>;
      /**
       * Allows you to assert whether an element contains another element as a descendant or not.
       *
       * https://github.com/testing-library/jest-dom#tocontainelement
       */
      toContainElement(
        element: ElementHandle<HTMLElement | SVGElement> | null,
      ): Promise<R>;
      /**
       * Assert whether a string representing a HTML element is contained in another element.
       *
       * https://github.com/testing-library/jest-dom#tocontainhtml
       */
      toContainHTML(htmlText: string): Promise<R>;
      /**
       * Allows you to check if a given element has an attribute or not.
       *
       * You can also optionally check that the attribute has a specific expected value or partial match using
       * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring) or
       * [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
       *
       * https://github.com/testing-library/jest-dom#tohaveattribute
       */
      toHaveAttribute(attr: string, value?: unknown): Promise<R>;
      /**
       * Check whether the given element has certain classes within its `class` attribute.
       *
       * You must provide at least one class, unless you are asserting that an element does not have any classes.
       *
       * https://github.com/testing-library/jest-dom#tohaveclass
       */
      toHaveClass(...classNames: (string | RegExp)[]): Promise<R>;
      toHaveClass(classNames: string, options?: { exact: boolean }): Promise<R>;
      /**
       * This allows you to check whether the given form element has the specified displayed value (the one the
       * end user will see). It accepts <input>, <select> and <textarea> elements with the exception of <input type="checkbox">
       * and <input type="radio">, which can be meaningfully matched only using toBeChecked or toHaveFormValues.
       *
       * https://github.com/testing-library/jest-dom#tohavedisplayvalue
       */
      toHaveDisplayValue(
        value: string | RegExp | (string | RegExp)[],
      ): Promise<R>;
      /**
       * Assert whether an element has focus or not.
       *
       * https://github.com/testing-library/jest-dom#tohavefocus
       */
      toHaveFocus(): Promise<R>;
      /**
       * Check if a form or fieldset contains form controls for each given name, and having the specified value.
       *
       * Can only be invoked on a form or fieldset element.
       *
       * https://github.com/testing-library/jest-dom#tohaveformvalues
       */
      toHaveFormValues(expectedValues: Record<string, unknown>): Promise<R>;
      /**
       * Check if an element has specific css properties with specific values applied.
       *
       * Only matches if the element has *all* the expected properties applied, not just some of them.
       *
       * https://github.com/testing-library/jest-dom#tohavestyle
       */
      toHaveStyle(css: string | Record<string, unknown>): Promise<R>;
      /**
       * Check whether the given element has a text content or not.
       *
       * When a string argument is passed through, it will perform a partial case-sensitive match to the element
       * content.
       *
       * To perform a case-insensitive match, you can use a RegExp with the `/i` modifier.
       *
       * If you want to match the whole content, you can use a RegExp to do it.
       *
       * https://github.com/testing-library/jest-dom#tohavetextcontent
       */
      toHaveTextContent(
        text: string | RegExp,
        options?: { normalizeWhitespace: boolean },
      ): Promise<R>;
      /**
       * Check whether the given form element has the specified value.
       *
       * Accepts `<input>`, `<select>`, and `<textarea>` elements with the exception of `<input type="checkbox">` and
       * `<input type="radiobox">`, which can be matched only using
       * [toBeChecked](https://github.com/testing-library/jest-dom#tobechecked) or
       * [toHaveFormValues](https://github.com/testing-library/jest-dom#tohaveformvalues).
       *
       * https://github.com/testing-library/jest-dom#tohavevalue
       */
      toHaveValue(value?: string | string[] | number | null): Promise<R>;
      /**
       * Assert whether the given element is checked.
       *
       * It accepts an `input` of type `checkbox` or `radio` and elements with a `role` of `radio` with a valid
       * `aria-checked` attribute of "true" or "false".
       *
       * https://github.com/testing-library/jest-dom#tobechecked
       */
      toBeChecked(): Promise<R>;
      /**
       * This allows to assert that an element has the expected [accessible description](https://w3c.github.io/accname/).
       *
       * You can pass the exact string of the expected accessible description, or you can make a
       * partial match passing a regular expression, or by using either
       * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
       * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
       *
       * https://github.com/testing-library/jest-dom#tohaveaccessibledescription
       */
      toHaveAccessibleDescription(text?: string | RegExp): Promise<R>;

      /**
       * This allows you to assert that an element has the expected
       * [accessible error message](https://w3c.github.io/aria/#aria-errormessage).
       *
       * You can pass the exact string of the expected accessible error message.
       * Alternatively, you can perform a partial match by passing a regular expression
       * or by using either
       * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
       * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
       *
       * https://github.com/testing-library/jest-dom#tohaveaccessibleerrormessage
       */
      toHaveAccessibleErrorMessage(text?: string | RegExp): Promise<R>;

      /**
       * This allows to assert that an element has the expected [accessible name](https://w3c.github.io/accname/).
       * It is useful, for instance, to assert that form elements and buttons are properly labelled.
       *
       * You can pass the exact string of the expected accessible name, or you can make a
       * partial match passing a regular expression, or by using either
       * [expect.stringContaining](https://jestjs.io/docs/en/expect.html#expectnotstringcontainingstring)
       * or [expect.stringMatching](https://jestjs.io/docs/en/expect.html#expectstringmatchingstring-regexp).
       *
       * https://github.com/testing-library/jest-dom#tohaveaccessiblename
       */
      toHaveAccessibleName(text?: string | RegExp): Promise<R>;
      /**
       * This allows you to assert that an element has the expected
       * [role](https://www.w3.org/TR/html-aria/#docconformance).
       *
       * This is useful in cases where you already have access to an element via
       * some query other than the role itself, and want to make additional
       * assertions regarding its accessibility.
       *
       * The role can match either an explicit role (via the `role` attribute), or
       * an implicit one via the [implicit ARIA
       * semantics](https://www.w3.org/TR/html-aria/).
       *
       * Note: roles are matched literally by string equality, without inheriting
       * from the ARIA role hierarchy. As a result, querying a superclass role
       * like 'checkbox' will not include elements with a subclass role like
       * 'switch'.
       *
       * https://github.com/testing-library/jest-dom#tohaverole
       */
      toHaveRole(
        // Get autocomplete for ARIARole union types, while still supporting another string
        // Ref: https://github.com/microsoft/TypeScript/issues/29729#issuecomment-567871939
        // eslint-disable-next-line @cloudfour/typescript-eslint/ban-types
        role: ARIARole | (string & {}),
      ): Promise<R>;
      /**
       * This allows you to check whether the given element is partially checked.
       * It accepts an input of type checkbox and elements with a role of checkbox
       * with a aria-checked="mixed", or input of type checkbox with indeterminate
       * set to true
       *
       * https://github.com/testing-library/jest-dom#tobepartiallychecked
       */
      toBePartiallyChecked(): Promise<R>;
    }
  }
}
