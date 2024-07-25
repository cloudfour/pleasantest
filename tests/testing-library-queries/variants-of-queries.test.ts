import { type ElementHandle, withBrowser } from 'pleasantest';

import { printErrorFrames } from '../test-utils.js';

const singleElementMarkup = `
  <h1>Hello</h1>
`;

const multipleElementMarkup = `
  <h1>Hello</h1>
  <h1>Hello</h1>
`;

// @ts-expect-error T1 is intentionally unused, assertType is only used at type-time
const assertType = <T1 extends true>() => {};

// Checks if two types are equal (A extends B and B extends A)
// Contains special case for ElementHandle's,
// where ElementHandle<A> extends ElementHandle<B> even if A does not extend A
type Equal<A, B> = A extends (infer T1)[]
  ? B extends (infer T2)[]
    ? Equal<T1, T2>
    : false
  : A extends ElementHandle<infer T1>
    ? B extends ElementHandle<infer T2>
      ? Equal<T1, T2>
      : false
    : B extends A
      ? A extends B
        ? true
        : false
      : false;

test(
  'findBy',
  withBrowser(async ({ screen, utils }) => {
    // This should work because findByText waits for up to 1s to see the element
    setTimeout(() => utils.injectHTML(singleElementMarkup), 5);

    const t1 = await screen.findByText(/Hello/);
    assertType<Equal<ElementHandle<HTMLElement>, typeof t1>>();

    const t2 = await screen.findByText<HTMLInputElement>(/Hello/);
    assertType<Equal<ElementHandle<HTMLInputElement>, typeof t2>>();

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
    await utils.injectHTML('<h1>Hi</h1>');
    const error = await screen.getByRole('banner').catch((error) => error);
    expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
      "Error: Unable to find an accessible element with the role "banner"

      Here are the accessible roles:

        document:

        Name "":
        <body>
        <h1>Hi</h1>
      </body>

        --------------------------------------------------
        heading:

        Name "Hi":
        <h1>Hi</h1>

        --------------------------------------------------

      Within: #document
      -------------------------------------------------------
      tests/testing-library-queries/variants-of-queries.test.ts

          const error = await screen.getByRole('banner').catch((error) => error);
                        ^
      -------------------------------------------------------
      dist/cjs/index.cjs"
    `);
  }),
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

    const t1 = await screen.findAllByText(/Hello/);
    assertType<Equal<ElementHandle<HTMLElement>[], typeof t1>>();

    const t2 = await screen.findAllByText<HTMLHeadingElement>(/Hello/);
    assertType<Equal<ElementHandle<HTMLHeadingElement>[], typeof t2>>();

    assertType<Equal<typeof t1, ElementHandle<HTMLElement>[]>>();

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
