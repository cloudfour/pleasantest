import { withBrowser } from 'pleasantest';

test(
  'ByTitle',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <img title="Foo" />
    <img title="Foobar" />
    <img />
  `);
    // Finds one
    await screen.getByTitle('Foobar');
    // Too many
    await expect(screen.getByTitle(/Foo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the title: /Foo/.

            Here are the matching elements:

            <img title=\\"Foo\\" />

            <img title=\\"Foobar\\" />

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
    expect(await screen.getAllByTitle(/Foo/)).toHaveLength(2);
    // Doesn't find any
    await expect(screen.getByTitle('Baz')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the title: Baz.

            Within: #document"
          `);
  }),
);
