# Testing puppeteer thing

```js
const puppeteer = require('puppeteer');
const { getDocument, queries, waitFor } = require('pptr-testing-library');

const { getByTestId, getByLabelText } = queries;

const browser = await puppeteer.launch();
const page = await browser.newPage();

// Grab ElementHandle for document
const $document = await getDocument(page);
// Your favorite query methods are available
const $form = await getByTestId($document, 'my-form');
// returned elements are ElementHandles too!
const $email = await getByLabelText($form, 'Email');
// interact with puppeteer like usual
await $email.type('pptr@example.com');
// waiting works too!
await waitFor(() => getByText($document, 'Loading...'));
```

```js
import { clearBrowser, createTab } from 'testing-puppeteer-thing';
import MegaMenu from './mega-menu';

beforeEach(clearBrowser);

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
