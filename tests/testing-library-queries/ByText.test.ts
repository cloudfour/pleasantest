import { withBrowser } from 'pleasantest';

test(
  'ByText',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div>hi</div>
    <div>hello</div>
  `);

    await screen.getByText('hi');
    await screen.getByText('hello');
    await screen.getByText(/hi/);
    await screen.getByText(/lo/);
    await expect(screen.getByText(/h/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the text: /h/

            Here are the matching elements:

            <div>hi</div>

            <div>hello</div>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
    expect(await screen.getAllByText(/h/)).toHaveLength(2);
  }),
);
