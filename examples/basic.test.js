import { createTab } from 'test-mule';

test('basic element visibility test', async () => {
  const tab = await createTab();
  const { screen } = tab;

  await tab.runJS(`
    import('./menu').then((module) => {
      const Menu = module.default;
      new Menu('nav');

      const styleTag = document.createElement('style')

      document.write('<button class="hidden">menu</button>')
      document.body.append(styleTag)
      styleTag.innerHTML = '.hidden { display: none }'
    });
  `);

  const menuButton = await screen.queryByText(/menu/);
  await expect(menuButton).not.toBeVisible();
});
