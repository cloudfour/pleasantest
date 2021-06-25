import * as path from 'path';
import { withBrowser } from 'pleasantest';

test(
  'CSS file with relative path',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.loadCSS('./external.css');

    await expect(heading).not.toBeVisible();
  }),
);

test(
  'CSS file with absolute path',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.loadCSS(path.join(__dirname, './external.css'));

    await expect(heading).not.toBeVisible();
  }),
);

test(
  'sass/preprocessor file',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.loadCSS('./external.sass');

    await expect(heading).not.toBeVisible();
  }),
);

test.todo('throws useful error message when imported file has syntax error');

test(
  'imported stylesheet has reference to another stylesheet',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);
    await expect(heading).toBeVisible();
    await utils.loadCSS('./external-with-reference.css');
    await expect(heading).not.toBeVisible();
  }),
);

test(
  'imported stylesheet has reference to static asset',
  withBrowser(async ({ utils }) => {
    // Note: this test doesn't actually test anything since we can't detect the background image loading via JS.
    // This has to be manually tested with a headed browser
    // Even without the headed browser, if this fails there will be a console.error in the node console (but it doesn't fail the test unfortunately)
    await utils.injectHTML(`
      <div>I have a background image</div>
    `);
    await utils.loadCSS('./external-with-reference.css');
  }),
);
