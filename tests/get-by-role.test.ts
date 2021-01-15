import { withBrowser } from 'test-mule';

test(
  'getByRole',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <h1>Hiiii</h1>
    <h2>Not this one</h2>
  `);

    const heading = await screen.getByRole('heading', { name: /hi/ });
    await expect(heading).toBeVisible();
  }),
);

test(
  'getByRole using within()',
  withBrowser(async ({ utils, page, within }) => {
    await utils.injectHTML(`
    <div>
      <h1>twooooo</h1>
    </div>
    <h1>other</h1>
  `);

    const divQueries = within(await page.$('div'));
    const heading = await divQueries.getByRole('heading');
    await expect(heading).toBeVisible();
  }),
);
