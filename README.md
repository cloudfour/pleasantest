# test-mule

[not ready for use]

```js
import { createTab } from 'test-mule';
import MegaMenu from './mega-menu';

test('sub-menu appears when nav links are clicked', async () => {
  const tab = await createTab();

  const { user, screen } = await tab.injectHTML(`
    <button>Open menu</button>
    <nav>asdf</nav>
  `);

  // Menu is visible on big screens, hidden behind hamburger on small screens
  await tab.injectCSS(`
    @media (screen and max-width: 750px) {
      nav { display: none }
      nav.is-open { display: block }
    }
  `);

  await tab.runJS(`
    import Menu from './menu'
    new Menu('nav')
  `);

  await tab.resize(1000);
  // Menu should be open on wide screen
  await expect(await screen.getByText(/about/i)).toBeVisible();
  // await expectToBeVisible(await screen.getByText(/about/i))

  await tab.resize(500);

  const menuButton = await screen.getByText(/menu/i);
  // Menu should be hidden by default on small screen
  await expect(await screen.getByText(/about/i)).not.toBeVisible();

  await user.click(menuButton);
  await expect(await screen.getByText(/about/i)).toBeVisible();
});
```
