import { createTab } from 'test-mule';

test('getByRole', async () => {
  const { screen, utils, debug, page } = await createTab({ headless: false });

  await utils.injectHTML(`
    <h1>Hiiii</h1>
    <h2>Not this one</h2>
  `);

  const heading = await screen.getByRole('headig', { name: /hi/ });
  await expect(heading).toBeVisible();
});

test('something else', async () => {
  const { screen, utils, debug, page } = await createTab();

  await utils.injectHTML(`
    <h1>twooooo</h1>
  `);
});
