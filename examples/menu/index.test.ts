import { TestMuleUtils, withBrowser } from 'test-mule';
import { Liquid } from 'liquidjs';
import * as path from 'path';

var engine = new Liquid({
  root: path.join(__dirname, 'templates'),
  extname: '.html.liquid',
});

const renderMenu = async ({
  utils,
  data,
  initJS = true,
}: {
  utils: TestMuleUtils;
  data: MenuData;
  initJS?: boolean;
}) => {
  const html =
    (await engine.renderFile('index', data)) +
    `<main><p>${mainContentText}</p></main>`;
  await utils.injectHTML(html);
  await utils.loadCSS('./index.css');
  if (initJS) {
    await utils.runJS(`
      import { init } from '.'
      init()
    `);
  }
};

interface MenuSection {
  name: string;
  link: string;
  description: string;
}

interface MenuData {
  companyName: string;
  menuSections: MenuSection[];
}

const aboutText = 'This company was founded a long time ago blah blah blah';
const productsText = 'These are the products plz buy them';
const mainContentText = 'This is the main content';

const data: MenuData = {
  companyName: 'Company',
  menuSections: [
    {
      name: 'Products',
      link: '/products',
      description: productsText,
    },
    {
      name: 'About',
      link: '/about',
      description: aboutText,
    },
  ],
};

test(
  'Renders desktop menus',
  withBrowser(async ({ screen, utils }) => {
    await renderMenu({ utils, data, initJS: false });

    // Menu content should be hidden
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Before JS initializes the menus should be links
    let aboutBtn = await screen.getByRole('link', { name: /about/i });
    await expect(aboutBtn).toHaveAttribute('href');
    await expect(
      await screen.queryByRole('button', { name: /about/i }),
    ).not.toBeInTheDocument();

    await utils.runJS(`
      import { init } from '.'
      init()
    `);

    // The menus should be upgraded to buttons
    aboutBtn = await screen.getByRole('button', { name: /about/i });
    await expect(
      await screen.queryByRole('link', { name: /about/i }),
    ).not.toBeInTheDocument();

    // Login should still be a link, since it does not trigger a menu to open
    const loginBtn = await screen.getByRole('link', { name: /log in/i });
    await expect(loginBtn).toHaveAttribute('href');

    // open the "about" menu and check its contents
    await aboutBtn.click();
    await expect(await screen.getByText(aboutText)).toBeVisible();
  }),
);

test(
  'Desktop menus toggle open/closed',
  withBrowser(async ({ screen, utils, debug }) => {
    await renderMenu({ utils, data });

    const aboutBtn = await screen.getByRole('button', { name: /about/i });
    const productsBtn = await screen.getByRole('button', { name: /products/i });

    // First click: opens about menu
    await aboutBtn.click();
    await expect(await screen.getByText(aboutText)).toBeVisible();

    // Second click: closes about menu
    await aboutBtn.click();
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Open products menu
    await productsBtn.click();
    await expect(await screen.getByText(productsText)).toBeVisible();

    // Clicking about button should close products menu and open about menu
    await aboutBtn.click();
    await expect(await screen.getByText(productsText)).not.toBeVisible();
    await expect(await screen.getByText(aboutText)).toBeVisible();

    await screen
      .getByText(mainContentText)
      .then((e) => e.evaluate((e) => console.log('main text is', e)));

    // TODO: this clicks the wrong element because it is covering the other element
    // await (await screen.getByText(mainContentText)).click();
    // await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // debug();
  }),
);
