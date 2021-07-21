import { withBrowser } from 'pleasantest';

const singleElementMarkup = `
  <h1>Hello</h1>
`;

const multipleElementMarkup = `
  <h1>Hello</h1>
  <h1>Hello</h1>
`;

test(
  'findBy',
  withBrowser(async ({ screen, utils }) => {
    // This should work because findByText waits for up to 1s to see the element
    setTimeout(() => utils.injectHTML(singleElementMarkup), 5);
    await screen.findByText(/Hello/);

    await expect(screen.findByText(/Hellooooo/, {}, { timeout: 5 })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the text: /Hellooooo/. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

            Within: #document"
          `);

    await utils.injectHTML(multipleElementMarkup);
    await expect(screen.findByText(/Hello/, {}, { timeout: 5 })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the text: /Hello/

            Here are the matching elements:

            <h1>Hello</h1>

            <h1>Hello</h1>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
  }),
  10_000,
);

test(
  'getBy',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(singleElementMarkup);
    await screen.getByText(/Hello/);

    await expect(screen.getByText(/Hellooooo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the text: /Hellooooo/. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

            Within: #document"
          `);

    await utils.injectHTML(multipleElementMarkup);
    await expect(screen.getByText(/Hello/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the text: /Hello/

            Here are the matching elements:

            <h1>Hello</h1>

            <h1>Hello</h1>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
  }),
);

test(
  'queryBy',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(singleElementMarkup);
    await screen.queryByText(/Hello/);

    expect(await screen.queryByText(/Hellooooo/)).toBeNull();

    await utils.injectHTML(multipleElementMarkup);
    await expect(screen.queryByText(/Hello/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the text: /Hello/

            Here are the matching elements:

            <h1>Hello</h1>

            <h1>Hello</h1>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
  }),
);

test(
  'findAllBy',
  withBrowser(async ({ screen, utils }) => {
    // This should work because findAllByText waits for up to 1s to find any matching elements
    setTimeout(() => utils.injectHTML(singleElementMarkup), 5);
    expect(await screen.findAllByText(/Hello/)).toHaveLength(1);

    await expect(screen.findAllByText(/Hellooooo/, {}, { timeout: 5 })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the text: /Hellooooo/. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

            Within: #document"
          `);

    await utils.injectHTML(multipleElementMarkup);
    expect(
      await screen.findAllByText(/Hello/, {}, { timeout: 5 }),
    ).toHaveLength(2);
  }),
  10_000,
);

test(
  'getAllBy',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(singleElementMarkup);
    expect(await screen.getAllByText(/Hello/)).toHaveLength(1);

    await expect(screen.getAllByText(/Hellooooo/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an element with the text: /Hellooooo/. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

            Within: #document"
          `);

    await utils.injectHTML(multipleElementMarkup);
    expect(await screen.getAllByText(/Hello/)).toHaveLength(2);
  }),
);

test(
  'queryAllBy',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(singleElementMarkup);
    await screen.queryAllByText(/Hello/);

    expect(await screen.queryAllByText(/Hellooooo/)).toEqual([]);

    await utils.injectHTML(multipleElementMarkup);
    expect(await screen.queryAllByText(/Hello/)).toHaveLength(2);
  }),
);
