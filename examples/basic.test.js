import { createTab } from 'test-mule';

test('basic element visibility test', async () => {
  const tab = await createTab({ headless: true });
  const { screen } = tab;

  await tab.injectHTML('<button class="hidden">menu</button>');
  await tab.injectCSS('.hidden { display: none }');

  await tab.runJS(`
    import Menu from './menu'
    new Menu('nav');
  `);

  const menuButton = await screen.getByText(/menu/);
  await expect(menuButton).not.toBeVisible();
  // tab.debug();
});
