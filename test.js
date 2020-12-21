import { createTab } from './src';

test('sub-menu appears when nav links are clicked', async () => {
  const tab = await createTab();
  const { screen, user } = tab;

  await tab.runJS(`
    import('./menu').then((module) => {
      const Menu = module.default;
      new Menu('nav');

      const styleTag = document.createElement('style')

      document.write('<button class="hidden">menu</button>')
      document.body.append(styleTag)
      styleTag.innerHTML = '.hidden { display: none }'
      document.write('<label>name<input type="text" minlength="20">a</input></label>')
    });
  `);

  const menuButton = await screen.queryByText(/menu/);
  await expect(menuButton).not.toBeVisible();

  const nameInput = await screen.getByLabelText(/name/);
  await nameInput.type('hi');

  await expect(nameInput).toBeInvalid();
});
