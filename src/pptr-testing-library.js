import { port } from '.';

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
];

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} element
 */
export const getQueriesForElement = (page, element) => {
  const queries = Object.fromEntries(
    queryNames.map((queryName) => {
      const query = async (...args) => {
        const serializedArgs = JSON.stringify(args, (key, value) => {
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
                  window.__testMuleDebug__ = true
                  const formattedMessage = error.name === 'TestingLibraryElementError'
                    ? ['query failed\\n', ...dtl.__deserialize(error.message), '\\n\\nwithin:', error.container]
                    : [error]
                  console.error(...formattedMessage)
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
          (r) => r.failed && r.message,
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
            array[key] = value;
          });
          return array;
        }

        return result;
      };
      return [queryName, query];
    }),
  );

  return queries;
};
