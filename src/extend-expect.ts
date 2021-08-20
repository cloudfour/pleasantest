import type { ElementHandle, JSHandle } from 'puppeteer';
import type { AsyncHookTracker } from './async-hooks';
import { activeAsyncHookTrackers } from './async-hooks';
import { createClientRuntimeServer } from './module-server/client-runtime-server';
import { deserialize, serialize } from './serialize';
import {
  isElementHandle,
  isPromise,
  jsHandleToArray,
  removeFuncFromStackTrace,
} from './utils';

const methods = [
  'toBeInTheDocument',
  'toBeEmptyDOMElement',
  'toContainElement',
  'toContainHTML',
  'toHaveAccessibleDescription',
  'toHaveAccessibleName',
  'toHaveTextContent',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveStyle',
  'toHaveFocus',
  'toHaveFormValues',
  'toBeVisible',
  'toBeDisabled',
  'toBeEnabled',
  'toBeRequired',
  'toBeInvalid',
  'toBeValid',
  'toHaveValue',
  'toHaveDisplayValue',
  'toBeChecked',
  'toBePartiallyChecked',
  'toHaveErrorMessage',
] as const;

const isJSHandle = (input: unknown): input is JSHandle => {
  if (typeof input !== 'object' || !input) return false;
  // @ts-expect-error checking for properties that don't necessarily exist
  return input.asElement && input.dispose && input.evaluate;
};

const matchers: jest.ExpectExtendMap = Object.fromEntries(
  methods.map((methodName) => {
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
        // @ts-expect-error pptr's types don't like new Function
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
        ),
        elementHandle,
        ...matcherArgs.map((arg) => (isJSHandle(arg) ? arg : serialize(arg))),
      );

      // Whether the matcher threw (this is different from the matcher failing)
      // The matcher failing means that it returned a result for Jest to throw
      // But a matcher throwing means that the input was invalid or something
      const thrownError = await result.evaluate((result) => result.thrown);

      // We have to evaluate the message right away
      // because Jest does not accept a promise from the returned message property
      const message = await result.evaluate(
        thrownError
          ? (matcherResult) => matcherResult.error.message
          : (matcherResult) => matcherResult.message(),
      );
      const deserializedMessage = runJestUtilsInNode(message, this as any);
      const { messageWithElementsRevived, messageWithElementsStringified } =
        await elementHandle
          .evaluateHandle(
            // @ts-expect-error pptr's types don't like new Function
            new Function(
              'el',
              'message',
              `return import("http://localhost:${port}/@pleasantest/jest-dom")
                .then(({ reviveElementsInString, printElement }) => {
                  const messageWithElementsRevived = reviveElementsInString(message)
                  const messageWithElementsStringified = messageWithElementsRevived
                  .map(el => {
                    if (el instanceof Element) return printElement(el)
                      return el
                  })
                  .join('')
                  return { messageWithElementsRevived, messageWithElementsStringified }
                })`,
            ),
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
        ...((await result.jsonValue()) as any),
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
    const start = jestUtilsCall.index!;
    const methodName = jestUtilsCall[1];
    closeRegex.lastIndex = start;
    const closeIndex = closeRegex.exec(message)?.index;
    if (closeIndex !== undefined) {
      const argsString = message.slice(
        start + jestUtilsCall[0].length,
        closeIndex,
      );
      const parsedArgs = deserialize(argsString);
      // @ts-expect-error TS doesn't know about the properties
      const res: string = context.utils[methodName](...parsedArgs);
      // Const escaped = res.replace(/"/g, '\\"').replace(/\u001b/g, '\\u001b');
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

// These type definitions are incomplete, only including methods we've tested
// More can be added from https://unpkg.com/@types/testing-library__jest-dom/index.d.ts
// You can copy-paste and change the return types to promises
declare global {
  // eslint-disable-next-line @cloudfour/typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       * Check whether an element is disabled from the user's perspective.
       * https://github.com/testing-library/jest-dom#tobedisabled
       */
      toBeDisabled(): Promise<R>;
      /**
       * Check whether an element is not disabled from the user's perspective.
       * https://github.com/testing-library/jest-dom#tobeenabled
       * Same as .not.toBeDisabled()
       */
      toBeEnabled(): Promise<R>;
      /**
       * Assert whether an element has content or not.
       * https://github.com/testing-library/jest-dom#tobeemptydomelement
       */
      toBeEmptyDOMElement(): Promise<R>;
      /**
       * Assert whether an element is present in the document or not.
       * https://github.com/testing-library/jest-dom#tobeinthedocument
       */
      toBeInTheDocument(): Promise<R>;
      /**
       * Check if the value of an element is currently invalid.
       * Uses [HTML5 Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation) and checks for `aria-invalid`.
       * https://github.com/testing-library/jest-dom#tobeinvalid
       */
      toBeInvalid(): Promise<R>;
      /**
       * Check if a form element is currently required.
       * https://github.com/testing-library/jest-dom#toberequired
       */
      toBeRequired(): Promise<R>;
      /**
       * Check if the value of an element is currently valid.
       * Uses [HTML5 Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation) and checks for `aria-invalid`.
       * https://github.com/testing-library/jest-dom#tobevalid
       */
      toBeValid(): Promise<R>;
      /**
       * Check if an element is currently visible to the user.
       * https://github.com/testing-library/jest-dom#tobevisible
       */
      toBeVisible(): Promise<R>;
      /**
       * Check if an element contains another element as a descendant.
       * https://github.com/testing-library/jest-dom#tocontainelement
       */
      toContainElement(
        element: ElementHandle<HTMLElement | SVGElement> | null,
      ): Promise<R>;
      /**
       * Check whether a string representing a HTML element is contained in another element.
       * https://github.com/testing-library/jest-dom#tocontainhtml
       */
      toContainHTML(html: string): Promise<R>;
      /**
       * Assert that an element has the expected [accessible description](https://www.w3.org/TR/accname-1.1/#dfn-accessible-description).
       * You can pass the exact string, or you can make a partial match passing a regular expression
       * https://github.com/testing-library/jest-dom#tohaveaccessibledescription
       */
      toHaveAccessibleDescription(text?: string | RegExp): Promise<R>;
      /**
       * Assert that an element has the expected [accessible description](https://www.w3.org/TR/accname-1.1/#dfn-accessible-name).
       * It is useful, for instance, to assert that form elements and buttons are properly labelled.
       * You can pass the exact string, or you can make a partial match passing a regular expression
       * https://github.com/testing-library/jest-dom#tohaveaccessibledescription
       */
      toHaveAccessibleName(text?: string | RegExp): Promise<R>;
      /**
       * Check whether the given element has an attribute or not.
       * You can also optionally check that the attribute has a specific expected value
       * https://github.com/testing-library/jest-dom#tohaveattribute
       */
      toHaveAttribute(attr: string, value?: string): Promise<R>;
      /**
       * Check whether the given element has certain classes within its class attribute.
       * You must provide at least one class, unless you are asserting that an element does not have any classes.
       * https://github.com/testing-library/jest-dom#tohaveclass
       */
      toHaveClass(...classNames: string[]): Promise<R>;
      toHaveClass(classNames: string, options?: { exact: boolean }): Promise<R>;
      /**
       * Check whether an element has focus
       * https://github.com/testing-library/jest-dom#tohavefocus
       */
      toHaveFocus(): Promise<R>;
      /**
       * Check if a form or fieldset contains form controls for each given name, and value.
       * https://github.com/testing-library/jest-dom#tohaveformvalues
       */
      toHaveFormValues(expectedValues: Record<string, unknown>): Promise<R>;
      /**
       * Check if an element has specific css properties applied
       * Unlike jest-dom, pleasantest does not support specifying expected styles as strings, they must be specified as an object.
       * https://github.com/testing-library/jest-dom#tohavestyle
       */
      toHaveStyle(css: Record<string, unknown>): Promise<R>;
      /**
       * Check whether the given element has a text content
       * https://github.com/testing-library/jest-dom#tohavetextcontent
       */
      toHaveTextContent(
        text: string | RegExp,
        options?: { normalizeWhitespace: boolean },
      ): Promise<R>;

      /**
       * Check whether the given form element has the specified value.
       * It accepts <input>, <select> and <textarea> elements with the exception of <input type="checkbox"> and <input type="radio">, which should be matched using toBeChecked or toHaveFormValues.
       * https://github.com/testing-library/jest-dom#tohavevalue
       */
      toHaveValue(value?: string | string[] | number | null): Promise<R>;

      /**
       * Check whether the given form element has the specified displayed value (the one the end user will see).
       * It accepts <input>, <select> and <textarea> elements with the exception of <input type="checkbox"> and <input type="radio">, which should be matched using toBeChecked or toHaveFormValues.
       * https://github.com/testing-library/jest-dom#tohavedisplayvalue
       */
      toHaveDisplayValue(
        value: string | RegExp | (string | RegExp)[],
      ): Promise<R>;

      /**
       * Check whether the given element is checked.
       * Accepts an `input` of type `checkbox` or `radio`
       * and elements with a `role` of `checkbox`, `radio` or `switch`
       * with a valid `aria-checked` attribute of "true" or "false".
       * https://github.com/testing-library/jest-dom#tobechecked
       */
      toBeChecked(): Promise<R>;

      /**
       * Check whether the given element is partially checked.
       * It accepts an `input` of type `checkbox` and elements with a `role` of `checkbox` with `aria-checked="mixed"`, or input of type `checkbox` with `indeterminate` set to `true`
       
       * https://github.com/testing-library/jest-dom#tobepartiallychecked
       */
      toBePartiallyChecked(): Promise<R>;

      /**
       * Check whether the given element has an ARIA error message (via aria-errormessage)
       * https://github.com/testing-library/jest-dom#tohaveerrormessage
       */
      toHaveErrorMessage(text: string | RegExp): Promise<R>;
    }
  }
}
