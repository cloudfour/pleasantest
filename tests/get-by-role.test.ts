import { createTab } from 'test-mule';

test('getByRole', async () => {
  const { screen, utils, debug, page } = await createTab({ headless: false });

  await utils.injectHTML(`
    <h1>Hiiii</h1>
    <h2>Not this one</h2>
  `);

  // TODO: fix what this logs when there is an error
  const heading = await screen.getByRole('heading', { name: /hii/i });
  await expect(heading).toBeVisible();

  debug();
});

test('something else', async () => {
  const { screen, utils, debug, page } = await createTab({ headless: false });

  await utils.injectHTML(`
    <h1>twooooo</h1>
  `);
});
