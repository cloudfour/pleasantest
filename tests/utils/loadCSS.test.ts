import * as path from 'path';
import { withBrowser } from 'pleasantest';

test.skip(
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

test.skip(
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

test.skip(
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
