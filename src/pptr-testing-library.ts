import type { queries, BoundFunctions } from '@testing-library/dom';
import { jsHandleToArray, removeFuncFromStackTrace } from './utils';
import type { JSHandle } from 'puppeteer';
import { createClientRuntimeServer } from './module-server/client-runtime-server';

type ElementToElementHandle<Input> = Input extends Element
  ? import('puppeteer').ElementHandle
  : Input extends Element[]
  ? import('puppeteer').ElementHandle[]
  : Input;

type Promisify<Input> = Input extends Promise<any> ? Input : Promise<Input>;

type UpdateReturnType<Fn> = Fn extends (...args: infer Args) => infer ReturnType
  ? (...args: Args) => Promisify<ElementToElementHandle<ReturnType>>
  : never;

type AsyncDTLQueries = {
  [K in keyof typeof queries]: UpdateReturnType<typeof queries[K]>;
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

export type BoundQueries = BoundFunctions<AsyncDTLQueries>;

export const getQueriesForElement = (
  page: import('puppeteer').Page,
  state: { isTestFinished: boolean },
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
        const forgotAwait = removeFuncFromStackTrace(
          new Error(
            `Cannot execute query ${queryName} after test finishes. Did you forget to await?`,
          ),
          query,
        );
        /** Handle error case for Target Closed error (forgot to await) */
        const handleExecutionAfterTestFinished = (error: any) => {
          if (/target closed/i.test(error.message) && state.isTestFinished) {
            throw forgotAwait;
          }

          throw error;
        };

        const { port } = await serverPromise;

        const result: JSHandle<Element | Element[] | DTLError | null> =
          await page
            .evaluateHandle(
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
                        return printElement(el)
                      return el
                    })
                    .join('')
                  return { failed: true, messageWithElementsRevived, messageWithElementsStringified }
                }
              })`,
              ),
              serializedArgs,
              element?.asElement() ||
                (await page
                  .evaluateHandle(() => document)
                  .catch(handleExecutionAfterTestFinished)),
            )
            .catch(handleExecutionAfterTestFinished);

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
          // Manipulate the stack trace and remove this function
          // That way Jest will show a code frame from the user's code, not ours
          // https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
          Error.captureStackTrace(error, query);

          throw error;
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

      return [queryName, query];
    }),
  );

  return queries;
};
