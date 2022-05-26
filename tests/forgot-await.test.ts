/* eslint-disable @cloudfour/typescript-eslint/require-await */
import { withBrowser, getAccessibilityTree } from 'pleasantest';
import { printErrorFrames } from './test-utils';

test('forgot await detection works even if other async stuff happens afterwards', async () => {
  const error = await withBrowser(async ({ screen, utils, user }) => {
    await utils.injectHTML('<button>Asdf</button>');
    const buttonEl = await screen.getByRole('button');
    user.click(buttonEl);
    await screen.getByRole('button');
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        user.click(buttonEl);
             ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ screen, utils, user }) => {
                    ^"
  `);
});

test('forgot await in testing library query', async () => {
  const error = await withBrowser(async ({ screen }) => {
    screen.getByText('hi');
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        screen.getByText('hi');
               ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ screen }) => {
                    ^"
  `);
});

test('forgot await in jest dom assertion', async () => {
  const error = await withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML('<button>Hi</button>');
    const button = await screen.getByText(/hi/i);
    expect(button).toBeVisible();
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        expect(button).toBeVisible();
                       ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ screen, utils }) => {
                    ^"
  `);
});

test('forgot await in utils.injectHTML', async () => {
  const error = await withBrowser(async ({ utils }) => {
    utils.injectHTML('<button>Hi</button>');
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        utils.injectHTML('<button>Hi</button>');
              ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ utils }) => {
                    ^"
  `);
});

test('forgot await in utils.runJS', async () => {
  const error = await withBrowser(async ({ utils }) => {
    utils.runJS('if (false) {}');
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        utils.runJS('if (false) {}');
              ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ utils }) => {
                    ^"
  `);
});

test('forgot await in user.click', async () => {
  const error = await withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML('<button>Hi</button>');
    const button = await screen.getByText('Hi');
    user.click(button);
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        user.click(button);
             ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ user, utils, screen }) => {
                    ^"
  `);
});

test('forgot await in user.type', async () => {
  const error = await withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML('<input />');
    const input = await screen.getByRole('textbox');
    user.type(input, 'hello');
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        user.type(input, 'hello');
             ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ user, utils, screen }) => {
                    ^"
  `);
});

test('forgot await in getAccessibilityTree', async () => {
  const error = await withBrowser(async ({ page }) => {
    const body = await page.$('body');
    expect(getAccessibilityTree(body!)).toMatchInlineSnapshot(`Promise {}`);
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        expect(getAccessibilityTree(body!)).toMatchInlineSnapshot(\`Promise {}\`);
               ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ page }) => {
                    ^"
  `);
});

test('forgot await in waitFor', async () => {
  const error = await withBrowser(async ({ waitFor }) => {
    waitFor(() => {});
  })().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: Cannot interact with browser after test finishes. Did you forget to await?
    -------------------------------------------------------
    tests/forgot-await.test.ts

        waitFor(() => {});
        ^
    -------------------------------------------------------
    dist/cjs/index.cjs
    -------------------------------------------------------
    tests/forgot-await.test.ts

      const error = await withBrowser(async ({ waitFor }) => {
                    ^"
  `);
});
