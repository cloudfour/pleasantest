import { withBrowser } from 'test-mule';

test(
  'ByDisplayValue',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input value="Foo" />
    <input value="Fo" />
    <textarea>Bar</textarea>
    <select>
      <option value="1" selected>Apple</option>
      <option value="2">Banana</option>
    </select>
  `);
    // finds one
    await screen.getByDisplayValue('Foo');
    await screen.getByDisplayValue('Bar');
    await screen.getByDisplayValue('Apple');
    // too many
    await expect(screen.getByDisplayValue(/Fo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the display value: /Fo/.

            Here are the matching elements:

            <input value=\\"Foo\\" />

            <input value=\\"Fo\\" />

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
    // doesn't find any
    await expect(screen.getByDisplayValue('Cheeseburger')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the display value: Cheeseburger.

            Within: #document"
          `);
  }),
);
