import { withBrowser } from 'pleasantest';

test(
  'injectCSS',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML(`
      <h1>I'm a heading</h1>
    `);
    const heading = await screen.getByText(/i'm a heading/i);

    await expect(heading).toBeVisible();

    await utils.injectCSS(`h1 { display: none }`);

    await expect(heading).not.toBeVisible();
  }),
);
