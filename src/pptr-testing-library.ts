import { port } from './vite-server';
import type { queries, BoundFunctions } from '@testing-library/dom';

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

export const getQueriesForElement = (
  page: import('puppeteer').Page,
  element?: import('puppeteer').ElementHandle,
) => {
  // @ts-expect-error
  const queries: BoundFunctions<AsyncDTLQueries> = Object.fromEntries(
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
        const result = await page.evaluateHandle(
          // using new Function to avoid babel transpiling the import
          // @ts-expect-error
          new Function(
            'argsString',
            'element',
            `return import("http://localhost:${port}/@test-mule/dom-testing-library")
              .then(async dtl => {
                const deserializedArgs = JSON.parse(argsString, (key, value) => {
                  if (value.__serialized === 'RegExp')
                    return new RegExp(value.source, value.flags)
                  return value
                })
                try {
                  return await dtl.${queryName}(element, ...deserializedArgs)
                } catch (error) {
                  // window.__testMuleDebug__ = true
                  const formattedMessage = error.name === 'TestingLibraryElementError'
                    ? ['query failed\\n', ...dtl.__deserialize(error.message), '\\n\\nwithin:', error.container]
                    : [error]
                  // console.error(...formattedMessage)
                  return {
                    failed: true,
                    message:
                      formattedMessage
                        .map((item, i) => {
                          const space = i === 0 || /\\s$/.test(formattedMessage[i - 1]) ? '' : ' '
                          if (item instanceof Element) return space + dtl.__elementToString(item)
                          if (item instanceof Document) return space + "#document"
                          return item
                        })
                        .join('')
                  }
                }
              })
          `,
          ),
          serializedArgs,
          element
            ? element.asElement()
            : await page.evaluateHandle(() => document),
        );

        const failureMessage = await result.evaluate(
          (r) => typeof r === 'object' && r !== null && r.failed && r.message,
        );
        if (failureMessage) {
          const error = new Error(failureMessage);
          // manipulate the stack trace and remove this function
          // That way jest will show a code frame from the user's code, not ours
          // https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
          if (Error.captureStackTrace) {
            Error.captureStackTrace(error, query);
          }

          throw error;
        }

        // if it returns a JSHandle<Array>, make it into an array of JSHandles so that using [0] for getAllBy* queries works
        if (await result.evaluate((r) => Array.isArray(r))) {
          const array = Array(await result.evaluate((r) => r.length));
          const props = await result.getProperties();
          props.forEach((value, key) => {
            array[(key as any) as number] = value;
          });
          return array;
        }

        // if it is an element, return it
        if (result.asElement() !== null) return result;

        // try to JSON-ify it (for example if it is null from queryBy*)
        return result.jsonValue();
      };
      return [queryName, query];
    }),
  );

  return queries;
};
