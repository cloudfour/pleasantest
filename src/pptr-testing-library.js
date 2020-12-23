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
        return await page.evaluateHandle(
          // using new Function to avoid babel transpiling the import
          new Function(
            'args',
            `return import("http://localhost:${port}/@test-mule/dom-testing-library")
              .then(async dtl => {
                const deserializedArgs = args.map(arg => {
                  if (arg.__serialized === 'RegExp') return new RegExp(arg.source, arg.flags)
                  return arg
                })
                const result = await dtl.${queryName}(document, ...deserializedArgs)
                return result
              })
              .catch(error => {
                window.__testMuleDebug__ = true
                if (error.name === 'TestingLibraryElementError') {
                  console.error('query failed\\n', error.message, '\\n\\nwithin:', error.container)
                } else {
                  console.error(error)
                }
                throw error
              })
          `,
          ),
          serializedArgs,
        );
      };
      return [queryName, query];
    }),
  );

  return queries;
};
