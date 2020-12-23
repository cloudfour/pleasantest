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

/** @param {import("puppeteer").Page} page */
export const getQueriesForPage = (page) => {
  const queries = Object.fromEntries(
    queryNames.map((queryName) => {
      const query = async (...args) => {
        const serializedArgs = args.map((arg) => {
          if (arg instanceof RegExp) {
            return {
              __serialized: 'RegExp',
              source: arg.source,
              flags: arg.flags,
            };
          }
          return arg;
        });
        const result = await page.evaluateHandle(
          // using new Function to avoid babel transpiling the import
          new Function(
            'args',
            `return import("http://localhost:${port}/@test-mule/dom-testing-library")
              .then(async dtl => {
                const deserializedArgs = args.map(arg => {
                  if (arg.__serialized === 'RegExp') return new RegExp(arg.source, arg.flags)
                  return arg
                })
                try {
                  return await dtl.${queryName}(document, ...deserializedArgs)
                } catch (error) {
                  window.__testMuleDebug__ = true
                  const formattedMessage = error.name === 'TestingLibraryElementError'
                    ? ['query failed\\n', ...dtl.__deserialize(error.message), '\\n\\nwithin:', error.container]
                    : [error]
                  console.error(...formattedMessage)
                  error.message = formattedMessage
                    .map((item, i) => {
                      const space = i === 0 || /\\s$/.test(formattedMessage[i - 1]) ? '' : ' '
                      if (item instanceof Element) return space + dtl.__elementToString(item)
                      if (item instanceof Document) return space + "#document"
                      return item
                    }).join('')
                  throw error
                }
              })
          `,
          ),
          serializedArgs,
        );

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
