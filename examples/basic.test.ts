import { withBrowser } from 'test-mule';

test(
  'basic element visibility test',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML('<button class="hidden">menu</button>');
    // await utils.injectCSS('.hidden { display: none }');
    await utils.loadCSS('./foo.css');
    await utils.loadJS('./menu');

    // await utils.runJS(`
    //   import Menu from './menu'
    //   new Menu('nav');
    // `);

    const menuButton = await screen.getByText(/menu/);
    // const menuButton = await screen.getByText(/menuuuu/);
    await expect(menuButton).not.toBeVisible();
    // await expect(menuButton).toBeVisible();
    // debug();
  }),
);
