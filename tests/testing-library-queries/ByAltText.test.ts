import { withBrowser } from 'test-mule';

test(
  'ByAltText',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <img alt="Foo" />
    <img alt="Foobar" />
    <img />
  `);
    // finds one
    await screen.getByAltText('Foobar');
    // too many
    await expect(screen.getByAltText(/Foo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the alt text: /Foo/

            Here are the matching elements:


            <img alt=\\"Foo\\">


            <img alt=\\"Foobar\\">

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
    expect(await screen.getAllByAltText(/Foo/)).toHaveLength(2);
    // doesn't find any
    await expect(screen.getByAltText('Baz')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the alt text: Baz

            Within: #document"
          `);
  }),
);
