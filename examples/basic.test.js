import { createTab } from 'test-mule';

test('basic element visibility test', async () => {
  const { screen, utils, debug, page } = await createTab({ headless: false });

  await utils.injectHTML('<button class="hidden">menu</button>');
  // await utils.injectCSS('.hidden { display: none }');
  await utils.loadCSS('./foo.css');
  await utils.loadJS('./menu');

  // await utils.runJS(`
  //   import Menu from './menu'
  //   new Menu('nav');
  // `);

  const menuButton = await screen.getByText(/menu/);
  await expect(menuButton).not.toBeVisible();
  // debug()
});
