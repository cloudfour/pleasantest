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
  withBrowser(async ({ utils, page, screen }) => {
    await page.setRequestInterception(true);
    page.on('request', (interceptedRequest) => interceptedRequest.continue());
    await utils.injectHTML(`
      <div>I have a background image</div>
    `);

    const timeout = 500;

    const stylesheet1Promise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        if (url.pathname !== '/tests/utils/external-with-reference.css')
          return false;
        // This CSS file is loaded via JS import so it needs to have a JS content-type
        expect(response.headers()['content-type']).toEqual(
          'application/javascript;charset=utf-8',
        );
        return true;
      },
      { timeout },
    );

    const stylesheet2Promise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        if (url.pathname !== '/tests/utils/external.css') return false;
        // This CSS file is loaded via @import so it needs to have a CSS content-type
        expect(response.headers()['content-type']).toEqual(
          'text/css;charset=utf-8',
        );
        return true;
      },
      { timeout },
    );

    const imagePromise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        if (url.pathname !== '/tests/utils/smiley.svg') return false;
        expect(response.headers()['content-type']).toEqual('image/svg+xml');
        return true;
      },
      { timeout },
    );

    await utils.loadCSS('./external-with-reference.css');
    await stylesheet1Promise;
    await imagePromise;
    await stylesheet2Promise;

    const div = await screen.getByText(/background/i);
    expect(
      await div.evaluate((div) => getComputedStyle(div).backgroundImage),
    ).toMatch(/^url\(".*\/tests\/utils\/smiley.svg"\)$/);
  }),
);
