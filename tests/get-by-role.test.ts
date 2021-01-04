import { createTab } from 'test-mule';

test('getByRole', async () => {
  const { screen, utils, debug, page } = await createTab({ headless: false });

  await utils.injectHTML(`
    <h1>Hiiii</h1>
    <h2>Not this one</h2>
  `);

  const heading = await screen.getByRole('heading', { name: /hi/ });
  await expect(heading).toBeVisible();
});

test('getByRole using within()', async () => {
  const { screen, utils, debug, page, within } = await createTab({
    headless: false,
  });

  await utils.injectHTML(`
    <div>
      <h1>twooooo</h1>
    </div>
    <h1>other</h1>
  `);

  const div = within(await page.$('div'));
  const heading = await div.getByRole('heading');
  await expect(heading).toBeVisible();
});
