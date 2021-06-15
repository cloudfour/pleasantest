import type { PleasantestUtils } from 'pleasantest';
import { withBrowser, devices } from 'pleasantest';
import { Liquid } from 'liquidjs';
import * as path from 'path';
const iPhone = devices['iPhone 11'];

// This particular example uses Liquid to load templates with data,
// but that is not needed for Pleasantest.
// You can use any way you'd like to load content into the browser.
const engine = new Liquid({
  root: path.join(__dirname, 'templates'),
  extname: '.html.liquid',
});

const renderMenu = async ({
  utils,
  data,
  initJS = true,
}: {
  utils: PleasantestUtils;
  data: MenuData;
  initJS?: boolean;
}) => {
  const html = `${await engine.renderFile(
    'index',
    data,
  )}<main><p>${mainContentText}</p></main>`;
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

const aboutText = 'This company was founded a long time ago';
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
  withBrowser(async ({ screen, utils, user }) => {
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

    // Open the "about" menu and check its contents
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).toBeVisible();
  }),
);

test(
  'Desktop menus toggle open/closed',
  withBrowser(async ({ screen, utils, page, user }) => {
    await renderMenu({ utils, data });

    const aboutBtn = await screen.getByRole('button', { name: /about/i });
    const productsBtn = await screen.getByRole('button', { name: /products/i });

    // First click: opens about menu
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).toBeVisible();

    // Second click: closes about menu
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Open products menu
    await user.click(productsBtn);
    await expect(await screen.getByText(productsText)).toBeVisible();

    // Clicking about button should close products menu and open about menu
    await user.click(aboutBtn);
    await expect(await screen.getByText(productsText)).not.toBeVisible();
    await expect(await screen.getByText(aboutText)).toBeVisible();

    // Click near the bottom of the screen (outside the menu), and the menu should close
    await page.mouse.click(page.viewport().width / 2, page.viewport().height);
    await expect(await screen.getByText(aboutText)).not.toBeVisible();
  }),
);

test(
  'Renders toggle-able menu on small screens',
  withBrowser({ device: iPhone }, async ({ screen, utils, user, page }) => {
    await renderMenu({ utils, data, initJS: false });

    // Menu content should be hidden
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Menu buttons should be hidden (into the menu)
    const aboutButtons = await screen.queryAllByText(/about/i);
    for (const aboutButton of aboutButtons) {
      await expect(aboutButton).not.toBeVisible();
    }
    // You could also do:
    // await Promise.all(aboutButtons.map((about) => expect(about).not.toBeVisible()));

    const toggleMenuBtn = await screen.getByRole('button', {
      name: /show menu/i,
    });

    await utils.runJS(`
      import { init } from '.'
      init()
    `);

    // Open menu
    await user.click(toggleMenuBtn);

    // The sub-menu buttons should be visible
    const aboutBtn = await screen.getByRole('button', { name: /about/i });
    await screen.getByRole('button', {
      name: /products/i,
    });

    // Accessible text should have changed in toggle button icon
    expect(await toggleMenuBtn.evaluate((el) => el.textContent)).toMatch(
      /hide menu/i,
    );

    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // First click: opens about menu
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).toBeVisible();

    // Second click: closes about menu
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Open about menu again
    await user.click(aboutBtn);
    await expect(await screen.getByText(aboutText)).toBeVisible();

    // Close the _outer_ menu, which should also close the about menu
    await user.click(toggleMenuBtn);
    await expect(await screen.getByText(aboutText)).not.toBeVisible();

    // Accessible text should have changed in toggle button icon
    expect(await toggleMenuBtn.evaluate((el) => el.textContent)).toMatch(
      /show menu/i,
    );

    // Open outer menu again
    await user.click(toggleMenuBtn);

    // Click near the bottom of the screen (outside the menu), and the menu should close
    await page.mouse.click(page.viewport().width / 2, page.viewport().height);
    await expect(aboutBtn).not.toBeVisible();
  }),
);
