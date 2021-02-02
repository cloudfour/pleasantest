import { withBrowser } from 'test-mule';
import type { TestContext, TestMuleUtils } from 'test-mule';
import { printErrorFrames } from '../test-utils';

const createHeading = async ({
  utils,
  screen,
}: {
  utils: TestMuleUtils;
  screen: TestContext['screen'];
}) => {
  await utils.injectHTML(`
    <h1>I'm a heading</h1>
  `);

  return screen.getByRole('heading', { name: /i'm a heading/i });
};

test(
  'basic inline code',
  withBrowser(async ({ utils, screen }) => {
    const heading = await createHeading({ utils, screen });

    await expect(heading).toBeInTheDocument();

    await utils.runJS(`
      const heading = document.querySelector('h1')
      heading.remove()
    `);

    await expect(heading).not.toBeInTheDocument();
  }),
);

describe('Waiting for Promises in executed code', () => {
  it(
    'should not wait for non-exported promises',
    withBrowser(async ({ utils, screen }) => {
      const heading = await createHeading({ utils, screen });

      await expect(heading).toBeInTheDocument();

      await utils.runJS(`
        const heading = document.querySelector('h1')

        new Promise(r => setTimeout(r, 10))
          .then(() => heading.remove())
      `);

      // since it didn't wait for the promise
      await expect(heading).toBeInTheDocument();
    }),
  );
  it(
    'should wait for top-level-await',
    withBrowser(async ({ utils, screen }) => {
      const heading = await createHeading({ utils, screen });

      await expect(heading).toBeInTheDocument();

      await utils.runJS(`
        const heading = document.querySelector('h1')

        await new Promise(r => setTimeout(r, 10))
          .then(() => heading.remove())
      `);
      await expect(heading).not.toBeInTheDocument();
    }),
  );
});

test(
  'supports TS in snippet',
  withBrowser(async ({ utils, screen }) => {
    const heading = await createHeading({ utils, screen });

    await expect(heading).toBeInTheDocument();

    // note: the snippet inherits the language support from the test file that includes it
    // So since this file is a .ts file, the snippet supports TS syntax
    await utils.runJS(`
      type foo = 'stringliteraltype'
      document.querySelector('h1').remove()
    `);
    await expect(heading).not.toBeInTheDocument();
  }),
);

test(
  'throws error with real source-mapped location',
  withBrowser(async ({ utils }) => {
    // note: the snippet inherits the language support from the test file that includes it
    // So since this file is a .ts file, the snippet supports TS syntax
    const error = await utils
      .runJS(
        `type foo = 'stringliteraltype'
        throw new Error('errorFromTs')`,
      )
      .catch((error) => error);

    expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
      "Error: errorFromTs
      -------------------------------------------------------
      tests/utils/runJS.test.ts

              throw new Error('errorFromTs')\`,
                    ^"
    `);

    const error2 = await utils
      .runJS(
        `type foo = 'stringliteraltype'
        thisVariableDoesntExist`,
      )
      .catch((error) => error);

    expect(await printErrorFrames(error2)).toMatchInlineSnapshot(`
      "ReferenceError: thisVariableDoesntExist is not defined
      -------------------------------------------------------
      tests/utils/runJS.test.ts

              thisVariableDoesntExist\`,
              ^"
    `);
  }),
);

test(
  'allows importing .tsx file, and errors from imported file are source mapped',
  withBrowser(async ({ utils, page }) => {
    await utils.runJS(`
      import { render } from './external'
      render()
    `);

    expect(
      await page.evaluate(() => document.body.innerHTML.trim()),
    ).toMatchInlineSnapshot(`"<h1 style=\\"\\">Hi</h1>"`);

    await utils.injectHTML('');

    const error = await utils
      .runJS(
        `import { renderThrow } from './external'
        renderThrow()`,
      )
      .catch((error) => error);

    expect(error).toMatchInlineSnapshot(
      `[Error: you have rendered the death component]`,
    );

    expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
      "Error: you have rendered the death component
      -------------------------------------------------------
      tests/utils/external.tsx

        throw new Error('you have rendered the death component');
              ^
      -------------------------------------------------------
      tests/utils/external.tsx

        preactRender(<ThrowComponent />, document.body);
        ^
      -------------------------------------------------------
      tests/utils/runJS.test.ts

              renderThrow()\`,
              ^"
    `);
  }),
);

test.todo(
  'if an imported file has a syntax error the location is source mapped',
);
test.todo(
  'if the code string has a syntax error the location is source mapped',
);
