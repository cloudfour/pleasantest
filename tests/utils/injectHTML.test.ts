import { withBrowser } from 'pleasantest';

test(
  'injectHTML',
  withBrowser(async ({ utils, page }) => {
    await page.evaluate(() => {
      document.body.innerHTML = '';
    });

    expect(await page.evaluate(() => document.body.innerHTML)).toEqual('');

    await utils.injectHTML('<div>Hi</div>');

    expect(await page.evaluate(() => document.body.innerHTML)).toEqual(
      '<div>Hi</div>',
    );
  }),
);
