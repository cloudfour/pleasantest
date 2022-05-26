import * as path from 'path';
import { withBrowser } from 'pleasantest';
import { formatErrorWithCodeFrame } from '../test-utils';

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
  'processes with postcss',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.loadCSS('./external-needs-postcss.css');

    await expect(heading).not.toBeVisible();
  }),
);

test(
  'Allows using CSS Modules through postcss',
  // TODO: make it an option or file extension, not default
  withBrowser(async ({ utils }) => {
    const importResult = await utils.loadCSS('./external-css-modules.css');

    // Using an if statement instead of expect because Jest's types don't support type narrowing assertions
    if (typeof importResult !== 'object') throw new Error('Expected an object');

    expect(importResult).toHaveProperty(
      'default',
      expect.objectContaining({ foo: expect.any(String) }),
    );
    expect(importResult).toHaveProperty('foo');
    expect(importResult.default.foo).toEqual(importResult.foo);
    expect(importResult.foo.length).toBeGreaterThan(5);
    expect(importResult.foo).toMatch(/^_foo_[\d_a-z]{0,8}$/);
  }),
);

test(
  'Allows using CSS Modules through postcss imported from JS file',
  withBrowser(async ({ utils }) => {
    await utils.runJS(`
      const assert = (condition) => {
        if (!condition) throw new Error("Assertion failed")
      }
    
      import * as importResult from './external-css-modules.css'

      assert(importResult.foo === importResult.default.foo)
      assert(typeof importResult.foo === 'string')
      assert(importResult.foo.length > 5)
      assert(/^_foo_[\\d_a-z]{0,8}$/.test(importResult.foo))
    `);
  }),
);

test(
  'sass/scss processing',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.loadCSS('./external.sass');

    await expect(heading).not.toBeVisible();

    const error1 = utils.loadCSS('./external-with-syntax-error.scss');
    await expect(formatErrorWithCodeFrame(error1)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        "[pleasantest-sass] [css-plugin] There is no module with the namespace \\"variables\\".

        tests/utils/external-with-syntax-error.scss:2:12

          # | h1 {
        > # |   display: variables.$none
            |            ^
          # | }
          # | 
          # | 
        "
      `);
    const error2 = utils.runJS(`
      import './external-with-syntax-error.scss'
    `);
    await expect(formatErrorWithCodeFrame(error2)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        "[pleasantest-sass] [css-plugin] There is no module with the namespace \\"variables\\".

        tests/utils/external-with-syntax-error.scss:2:12

          # | h1 {
        > # |   display: variables.$none
            |            ^
          # | }
          # | 
          # | 
        "
      `);
  }),
);

test.only(
  'throws useful error message when imported file has syntax error',
  withBrowser.headed(async ({ utils }) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // await utils.loadCSS('./external-with-syntax-error.css');
    await utils.loadCSS('./external-importing-syntax-error.css');
    throw 1;
  }),
);

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
