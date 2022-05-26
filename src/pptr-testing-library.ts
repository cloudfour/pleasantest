import type { queries } from '@testing-library/dom';
import {
  jsHandleToArray,
  printColorsInErrorMessages,
  removeFuncFromStackTrace,
} from './utils';
import type { ElementHandle, JSHandle, Page } from 'puppeteer';
import { createClientRuntimeServer } from './module-server/client-runtime-server';
import type { AsyncHookTracker } from './async-hooks';

type ElementToElementHandle<Input> = Input extends Element
  ? ElementHandle<Input>
  : Input extends (Element | ElementHandle)[]
  ? { [K in keyof Input]: ElementToElementHandle<Input[K]> }
  : Input;

type Promisify<Input> = Input extends Promise<any> ? Input : Promise<Input>;
type ValueOf<Input> = Input extends any[] ? Input[number] : Input[keyof Input];
type UnArray<Input> = Input extends any[] ? Input[number] : Input;
type UnPromise<Input> = Input extends Promise<infer Inner> ? Inner : Input;
/**
 * Changes type signature of an original testing library query function by:
 * - Removing the `container` parameter
 * - Returning a promise, always
 * - Returning ElementHandles instead of Elements
 */
type ChangeDTLFn<DTLFn extends ValueOf<typeof queries>> = DTLFn extends (
  container: HTMLElement,
  ...args: infer Args
) => infer DTLReturn
  ? <CustomizedReturn extends UnArray<UnPromise<DTLReturn>>>(
      ...args: Args
    ) => Promisify<
      ElementToElementHandle<
        UnPromise<DTLReturn> extends any[]
          ? CustomizedReturn[]
          : CustomizedReturn
      >
    >
  : never;

export type BoundQueries = {
  [K in keyof typeof queries]: ChangeDTLFn<typeof queries[K]>;
};

const queryNames = [
  'findAllByAltText',
  'findAllByDisplayValue',
  'findAllByLabelText',
  'findAllByPlaceholderText',
  'findAllByRole',
  'findAllByTestId',
  'findAllByText',
  'findAllByTitle',
  'findByAltText',
  'findByDisplayValue',
  'findByLabelText',
  'findByPlaceholderText',
  'findByRole',
  'findByTestId',
  'findByText',
  'findByTitle',
  'getAllByAltText',
  'getAllByDisplayValue',
  'getAllByLabelText',
  'getAllByPlaceholderText',
  'getAllByRole',
  'getAllByTestId',
  'getAllByText',
  'getAllByTitle',
  'getByAltText',
  'getByDisplayValue',
  'getByLabelText',
  'getByPlaceholderText',
  'getByRole',
  'getByTestId',
  'getByText',
  'getByTitle',
  'queryAllByAltText',
  'queryAllByDisplayValue',
  'queryAllByLabelText',
  'queryAllByPlaceholderText',
  'queryAllByRole',
  'queryAllByTestId',
  'queryAllByText',
  'queryAllByTitle',
  'queryByAltText',
  'queryByDisplayValue',
  'queryByLabelText',
  'queryByPlaceholderText',
  'queryByRole',
  'queryByTestId',
  'queryByText',
  'queryByTitle',
] as const;

interface DTLError {
  failed: true;
  messageWithElementsRevived: unknown[];
  messageWithElementsStringified: string;
}

export const getQueriesForElement = (
  page: import('puppeteer').Page,
  asyncHookTracker: AsyncHookTracker,
  element?: import('puppeteer').ElementHandle,
) => {
  const serverPromise = createClientRuntimeServer();
  // @ts-expect-error TS doesn't understand the properties coming out of Object.fromEntries
  const queries: BoundQueries = Object.fromEntries(
    queryNames.map((queryName: typeof queryNames[number]) => {
      const query = async (...args: any[]) => {
        const serializedArgs = JSON.stringify(args, (_key, value) => {
          if (value instanceof RegExp) {
            return {
              __serialized: 'RegExp',
              source: value.source,
              flags: value.flags,
            };
          }

          return value;
        });

        const { port } = await serverPromise;

        const result: JSHandle<Element | Element[] | DTLError | null> =
          await page.evaluateHandle(
            // Using new Function to avoid babel transpiling the import
            // @ts-expect-error pptr's types don't like new Function
            new Function(
              'argsString',
              'element',
              `return import("http://localhost:${port}/@pleasantest/dom-testing-library")
                .then(async ({ reviveElementsInString, printElement, addToElementCache, ...dtl }) => {
                  const deserializedArgs = JSON.parse(argsString, (key, value) => {
                    if (value.__serialized === 'RegExp')
                      return new RegExp(value.source, value.flags)
                    return value
                  })
                  try {
                    return await dtl.${queryName}(element, ...deserializedArgs)
                  } catch (error) {
                    const message =
                      error.message +
                      (error.container
                        ? '\\n\\nWithin: ' + addToElementCache(error.container)
                        : '')
                    const messageWithElementsRevived = reviveElementsInString(message)
                    const messageWithElementsStringified = messageWithElementsRevived
                      .map(el => {
                        if (el instanceof Element || el instanceof Document)
                          return printElement(el, ${printColorsInErrorMessages})
                        return el
                      })
                      .join('')
                    return { failed: true, messageWithElementsRevived, messageWithElementsStringified }
                  }
                })`,
            ),
            serializedArgs,
            element?.asElement() || (await page.evaluateHandle(() => document)),
          );

        const failed = await result.evaluate(
          (r) => typeof r === 'object' && r !== null && (r as DTLError).failed,
        );
        if (failed) {
          const resultProperties = Object.fromEntries(
            await result.getProperties(),
          );
          const messageWithElementsStringified =
            (await resultProperties.messageWithElementsStringified.jsonValue()) as any;
          const messageWithElementsRevived = await jsHandleToArray(
            resultProperties.messageWithElementsRevived,
          );
          const error = new Error(messageWithElementsStringified);
          // @ts-expect-error messageForBrowser is a custom property that we add to Errors
          error.messageForBrowser = messageWithElementsRevived;

          throw removeFuncFromStackTrace(error, queries[queryName]);
        }

        // If it returns a JSHandle<Array>, make it into an array of JSHandles so that using [0] for getAllBy* queries works
        if (await result.evaluate((r) => Array.isArray(r))) {
          const array = Array.from({
            length: await result.evaluate((r) => (r as Element[]).length),
          });
          const props = await result.getProperties();
          for (const [key, value] of props.entries()) {
            array[key as any as number] = value;
          }

          return array;
        }

        // If it is an element, return it
        if (result.asElement() !== null) return result;

        // Try to JSON-ify it (for example if it is null from queryBy*)
        return result.jsonValue();
      };

      return [
        queryName,
        async (...args: any[]): Promise<any> =>
          // await is needed for correct stack trace
          // eslint-disable-next-line no-return-await
          await asyncHookTracker.addHook(
            () => query(...args),
            queries[queryName],
          ),
      ];
    }),
  );

  return queries;
};

let waitForCounter = 0;

export interface WaitForOptions {
  /**
   * The element watched by the MutationObserver which,
   * when it or its descendants change,
   * causes the callback to run again (regardless of the interval).
   * Default: `document.documentElement` (root element)
   */
  container?: ElementHandle;
  /**
   * The amount of time (milliseconds) that will pass before waitFor "gives up" and throws whatever the callback threw.
   * Default: 1000ms
   */
  timeout?: number;
  /**
   * The maximum amount of time (milliseconds) that will pass between each run of the callback.
   * If the MutationObserver notices a DOM change before this interval triggers,
   * the callback will run again immediately.
   * Default: 50ms
   */
  interval?: number;
  /** Manipulate the error thrown when the timeout triggers. */
  onTimeout?: (error: Error) => Error;
  /** Options to pass to initialize the MutationObserver. */
  mutationObserverOptions?: MutationObserverInit;
}

interface WaitFor {
  <T>(
    page: Page,
    asyncHookTracker: AsyncHookTracker,
    cb: () => T | Promise<T>,
    { onTimeout, container, ...opts }: WaitForOptions,
    wrappedFunction: (...args: any) => any,
  ): Promise<T>;
}

export const waitFor: WaitFor = async (
  page,
  asyncHookTracker,
  cb,
  { onTimeout, container, ...opts },
  wrappedFunction,
) =>
  asyncHookTracker.addHook(async () => {
    const { port } = await createClientRuntimeServer();

    waitForCounter++;
    // Functions exposed via page.exposeFunction can't be removed,
    // So we need a unique name for each variable
    const browserFuncName = `pleasantest_waitFor_${waitForCounter}`;

    await page.exposeFunction(browserFuncName, cb);

    const evalResult = await page.evaluateHandle(
      // Using new Function to avoid babel transpiling the import
      // @ts-expect-error pptr's types don't like new Function
      new Function(
        'opts',
        'container',
        `return import("http://localhost:${port}/@pleasantest/dom-testing-library")
        .then(async ({ waitFor }) => {
          try {
            const result = await waitFor(${browserFuncName}, { ...opts, container })
            return { success: true, result }
          } catch (error) {
            if (/timed out in waitFor/i.test(error.message)) {
              // Leave out stack trace so the stack trace is given from Node
              return { success: false, result: { message: error.message } }
            }
            return { success: false, result: error }
          }
        })`,
      ),
      opts,
      // Container has to be passed separately because puppeteer won't unwrap nested JSHandles
      container,
    );
    const wasSuccessful = await evalResult.evaluate((r) => r.success);
    const result = await evalResult.evaluate((r) =>
      r.success
        ? r.result
        : { message: r.result.message, stack: r.result.stack },
    );
    if (wasSuccessful) return result;
    const err = new Error(result.message);
    if (result.stack) err.stack = result.stack;
    else removeFuncFromStackTrace(err, asyncHookTracker.addHook);
    throw onTimeout ? onTimeout(err) : err;
  }, wrappedFunction);
