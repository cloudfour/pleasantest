import { withBrowser } from 'test-mule';

test(
  'ByPlaceholderText',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input placeholder="Foo" />
    <input placeholder="Foobar" />
    <input />
  `);
    // finds one
    await screen.getByPlaceholderText('Foobar');
    // too many
    await expect(screen.getByPlaceholderText(/Foo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the placeholder text of: /Foo/

            Here are the matching elements:


            <input placeholder=\\"Foo\\">


            <input placeholder=\\"Foobar\\">

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
    expect(await screen.getAllByPlaceholderText(/Foo/)).toHaveLength(2);
    // doesn't find any
    await expect(screen.getByPlaceholderText('Baz')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the placeholder text of: Baz

            Within: #document"
          `);
  }),
);
