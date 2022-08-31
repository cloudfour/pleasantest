import { withBrowser } from 'pleasantest';

test(
  'ByTestId',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div data-testid="foo">hi</div>
    <div data-testid="bar">hello</div>
    <div data-testid="bar">hello</div>
  `);

    // Finds just one
    await screen.getByTestId('foo');
    // Doesn't find any
    await expect(screen.getByTestId('woot')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Unable to find an element by: [data-testid="woot"]

      Within: #document"
    `);
    // Finds too many
    await expect(screen.getByTestId('bar')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Found multiple elements by: [data-testid="bar"]

      Here are the matching elements:

      <div data-testid="bar">hello</div>

      <div data-testid="bar">hello</div>

      (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

      Within: #document"
    `);
  }),
);
